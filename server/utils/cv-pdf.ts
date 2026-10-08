import type { PDFArray, PDFDocument, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { TextBlock } from './cv-text'
import { PDFName, PDFString, rgb } from 'pdf-lib'
import { cleanInline } from './cv-text'

// ─── Constants ─────────────────────────────────────────────
export const PAGE_WIDTH = 595.28
export const PAGE_HEIGHT = 841.89
export const MARGIN = 50
export const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
export const LINE_HEIGHT_RATIO = 1.35
export const BOTTOM_MARGIN = 50

export const FS_TITLE = 26
export const FS_SUBTITLE = 14
export const FS_H2 = 16
export const FS_SECTION = 13
export const FS_HEADING = 11
export const FS_BODY = 10
export const FS_SMALL = 8

export const FOOTER_RESERVE = FS_SMALL * LINE_HEIGHT_RATIO * 3 + 10

export const BLACK = rgb(0, 0, 0)
export const GRAY = rgb(0.4, 0.4, 0.4)

export interface DrawLineOptions {
  x?: number
  font?: PDFFont
  color?: RGB
  maxWidth?: number
  /** Extra indent applied to wrapped continuation lines */
  hang?: number
  /** Skip the page-break check (used by the bottom-pinned footer) */
  noBreak?: boolean
}

export interface CenteredSegment {
  text: string
  font?: PDFFont
  color?: RGB
  url?: string
}

export interface DrawCenteredSegmentsOptions {
  separator?: string
  gap?: number
  color?: RGB
  font?: PDFFont
  underlineLinks?: boolean
}

export interface DrawBlocksOptions {
  x?: number
  fontSize?: number
  color?: RGB
  /** Vertical gap between blocks */
  gap?: number
}

// ─── Word Wrapping ────────────────────────────────────────
function wrapText(text: string, font: PDFFont, fontSize: number, firstWidth: number, contWidth: number): string[] {
  const lines: string[] = []
  const words = text.split(' ')
  let line = ''
  let width = firstWidth
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, fontSize) <= width) {
      line = test
      continue
    }
    if (line) {
      lines.push(line)
      width = contWidth
      line = ''
    }
    if (font.widthOfTextAtSize(word, fontSize) > width) {
      let chars = ''
      for (const char of word) {
        const next = chars + char
        if (font.widthOfTextAtSize(next, fontSize) > width) {
          lines.push(chars)
          width = contWidth
          chars = char
        }
        else chars = next
      }
      line = chars
    }
    else line = word
  }
  if (line) lines.push(line)
  return lines
}

// ─── Layout Engine ────────────────────────────────────────
export class CvLayout {
  page: PDFPage
  y: number

  constructor(
    public doc: PDFDocument,
    public font: PDFFont,
    public boldFont: PDFFont,
  ) {
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.y = PAGE_HEIGHT - MARGIN
  }

  /** Start a new page when `needed` points don't fit. Returns true if a page break happened. */
  ensurePage(needed: number = FS_BODY * LINE_HEIGHT_RATIO): boolean {
    if (this.y - needed < BOTTOM_MARGIN + FOOTER_RESERVE) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      this.y = PAGE_HEIGHT - MARGIN
      return true
    }
    return false
  }

  /** Start a new page if a block of `height` doesn't fit here but would fit on a fresh page */
  keepTogether(height: number) {
    const fitsOnFreshPage = height <= PAGE_HEIGHT - MARGIN - BOTTOM_MARGIN - FOOTER_RESERVE
    if (fitsOnFreshPage && this.y - height < BOTTOM_MARGIN + FOOTER_RESERVE) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      this.y = PAGE_HEIGHT - MARGIN
    }
  }

  gap(height: number) {
    this.y -= height
  }

  private lineCount(text: string, fontSize: number, opts: DrawLineOptions = {}): number {
    const f = opts.font ?? this.font
    const maxW = opts.maxWidth ?? CONTENT_WIDTH
    const hang = opts.hang ?? 0
    return wrapText(cleanInline(text), f, fontSize, maxW, maxW - hang).length
  }

  /** Height a drawLine call would occupy, without drawing */
  measureLine(text: string, fontSize: number, opts: DrawLineOptions = {}): number {
    return this.lineCount(text, fontSize, opts) * fontSize * LINE_HEIGHT_RATIO
  }

  private bulletOpts(fontSize: number, opts: DrawLineOptions): DrawLineOptions {
    const f = opts.font ?? this.font
    return { ...opts, hang: f.widthOfTextAtSize('• ', fontSize) }
  }

  /** Height a drawBullet call would occupy, without drawing */
  measureBullet(text: string, fontSize: number, opts: DrawLineOptions = {}): number {
    return this.measureLine(`• ${text}`, fontSize, this.bulletOpts(fontSize, opts))
  }

  /** Height a drawBlocks call would occupy, without drawing */
  measureBlocks(blocks: TextBlock[], opts: DrawBlocksOptions = {}): number {
    const fontSize = opts.fontSize ?? FS_BODY
    const gap = opts.gap ?? 3
    let height = 0
    blocks.forEach((block, i) => {
      if (block.type === 'list') {
        for (const item of block.items)
          height += this.measureBullet(item, fontSize, { x: opts.x, color: opts.color })
      }
      else
        height += this.measureLine(block.text, fontSize, { x: opts.x, color: opts.color })

      if (i < blocks.length - 1) height += gap
    })
    return height
  }

  drawLine(text: string, fontSize: number, opts: DrawLineOptions = {}) {
    const x = opts.x ?? MARGIN
    const f = opts.font ?? this.font
    const c = opts.color ?? BLACK
    const lh = fontSize * LINE_HEIGHT_RATIO
    const hang = opts.hang ?? 0
    const lines = wrapText(cleanInline(text), f, fontSize, opts.maxWidth ?? CONTENT_WIDTH, (opts.maxWidth ?? CONTENT_WIDTH) - hang)
    lines.forEach((line, i) => {
      if (!opts.noBreak) this.ensurePage(lh)
      this.page.drawText(line, { x: i > 0 ? x + hang : x, y: this.y, size: fontSize, font: f, color: c })
      this.y -= lh
    })
  }

  /** Bullet line with hanging indent: wrapped lines align with the text, not the bullet */
  drawBullet(text: string, fontSize: number, opts: DrawLineOptions = {}) {
    this.drawLine(`• ${text}`, fontSize, this.bulletOpts(fontSize, opts))
  }

  /** Render structured body blocks: paragraphs and bullet lists */
  drawBlocks(blocks: TextBlock[], opts: DrawBlocksOptions = {}) {
    const fontSize = opts.fontSize ?? FS_BODY
    const gap = opts.gap ?? 3
    blocks.forEach((block, i) => {
      if (block.type === 'list') {
        for (const item of block.items)
          this.drawBullet(item, fontSize, { x: opts.x, color: opts.color })
      }
      else
        this.drawLine(block.text, fontSize, { x: opts.x, color: opts.color })

      if (i < blocks.length - 1) this.y -= gap
    })
  }

  drawSectionTitle(title: string) {
    // Reserve room for the title, its rule and one body line (orphan control)
    const fresh = this.ensurePage(FS_SECTION * LINE_HEIGHT_RATIO + 7 + FS_BODY * LINE_HEIGHT_RATIO)
    if (!fresh) this.y -= 4
    this.page.drawText(title.toUpperCase(), { x: MARGIN, y: this.y, size: FS_SECTION, font: this.boldFont, color: BLACK })
    const ruleY = this.y - 3 // just under the title baseline
    this.page.drawLine({ start: { x: MARGIN, y: ruleY }, end: { x: PAGE_WIDTH - MARGIN, y: ruleY }, thickness: 0.5, color: BLACK })
    this.y -= FS_SECTION * LINE_HEIGHT_RATIO + 2 // full line advance so content clears the rule
  }

  drawRule(color: RGB = GRAY) {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y }, thickness: 0.5, color })
  }

  /** Add a clickable URI link annotation over the given bottom-left rect (pdf-lib coords) */
  addLink(url: string, x: number, yBottom: number, width: number, height: number) {
    const ctx = this.doc.context
    const annot = ctx.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, yBottom, x + width, yBottom + height], Border: [0, 0, 0] })
    const action = ctx.obj({ Type: 'Action', S: 'URI' })
    action.set(PDFName.of('URI'), PDFString.of(url))
    annot.set(PDFName.of('A'), action)
    const ref = ctx.register(annot)
    const node = this.page.node
    let annots = node.get(PDFName.of('Annots'))
    if (!annots) {
      annots = ctx.obj([])
      node.set(PDFName.of('Annots'), annots)
    }
    (annots as PDFArray).push(ref)
  }

  /** Right-aligned single line at the right margin */
  drawRightLine(text: string, fontSize: number, opts: DrawLineOptions = {}) {
    const f = opts.font ?? this.font
    const c = opts.color ?? BLACK
    const w = f.widthOfTextAtSize(text, fontSize)
    const x = w > CONTENT_WIDTH ? MARGIN : PAGE_WIDTH - MARGIN - w
    this.ensurePage(fontSize * LINE_HEIGHT_RATIO)
    this.page.drawText(text, { x, y: this.y, size: fontSize, font: f, color: c })
    this.y -= fontSize * LINE_HEIGHT_RATIO
  }

  /** One left-aligned line; if `url` is set, underline it and make it a hyperlink */
  drawLinkLine(text: string, fontSize: number, opts: DrawLineOptions & { url?: string }) {
    const x = opts.x ?? MARGIN
    const f = opts.font ?? this.font
    const c = opts.color ?? BLACK
    const clean = cleanInline(text)
    const w = f.widthOfTextAtSize(clean, fontSize)
    if (w > CONTENT_WIDTH) {
      this.drawLine(text, fontSize, { x, font: f, color: c })
      return
    }
    const lh = fontSize * LINE_HEIGHT_RATIO
    this.ensurePage(lh)
    this.page.drawText(clean, { x, y: this.y, size: fontSize, font: f, color: c })
    if (opts.url) {
      this.addLink(opts.url, x, this.y - fontSize * 0.6, w, fontSize * 1.4)
      this.page.drawLine({ start: { x, y: this.y - 1.5 }, end: { x: x + w, y: this.y - 1.5 }, thickness: 0.5, color: c })
    }
    this.y -= lh
  }

  /** Bold label followed by regular text on the same line; wrapped lines align under the label */
  drawLabeledLine(label: string, text: string, fontSize: number, opts: DrawLineOptions = {}) {
    const x = opts.x ?? MARGIN
    const c = opts.color ?? BLACK
    const lh = fontSize * LINE_HEIGHT_RATIO
    const labelText = cleanInline(label)
    const labelW = this.boldFont.widthOfTextAtSize(`${labelText} `, fontSize)
    this.page.drawText(labelText, { x, y: this.y, size: fontSize, font: this.boldFont, color: c })
    const lines = wrapText(cleanInline(text), this.font, fontSize, CONTENT_WIDTH - labelW, CONTENT_WIDTH - labelW)
    lines.forEach((line) => {
      this.ensurePage(lh)
      this.page.drawText(line, { x: x + labelW, y: this.y, size: fontSize, font: this.font, color: c })
      this.y -= lh
    })
  }

  /** Height a drawLabeledLine call would occupy, without drawing */
  measureLabeledLine(label: string, text: string, fontSize: number): number {
    const labelText = cleanInline(label)
    const labelW = this.boldFont.widthOfTextAtSize(`${labelText} `, fontSize)
    return wrapText(cleanInline(text), this.font, fontSize, CONTENT_WIDTH - labelW, CONTENT_WIDTH - labelW).length * fontSize * LINE_HEIGHT_RATIO
  }

  /** Heading line: left text at the margin, right text right-aligned on the same baseline */
  drawColumns(left: string, right: string, fontSize: number, opts: { leftFont?: PDFFont, rightFont?: PDFFont, color?: RGB, gap?: number } = {}) {
    const leftFont = opts.leftFont ?? this.font
    const rightFont = opts.rightFont ?? this.font
    const gap = opts.gap ?? 12
    const lw = leftFont.widthOfTextAtSize(left, fontSize)
    const rw = rightFont.widthOfTextAtSize(right, fontSize)
    if (lw + gap + rw <= CONTENT_WIDTH) {
      const lh = fontSize * LINE_HEIGHT_RATIO
      this.ensurePage(lh)
      this.page.drawText(left, { x: MARGIN, y: this.y, size: fontSize, font: leftFont, color: opts.color ?? BLACK })
      this.page.drawText(right, { x: PAGE_WIDTH - MARGIN - rw, y: this.y, size: fontSize, font: rightFont, color: BLACK })
      this.y -= lh
    }
    else {
      this.drawLine(left, fontSize, { font: leftFont, color: opts.color })
      this.drawLine(right, fontSize, { font: rightFont })
    }
  }

  /** Height a drawColumns call would occupy, without drawing */
  measureColumns(left: string, right: string, fontSize: number, opts: { leftFont?: PDFFont, rightFont?: PDFFont, gap?: number } = {}): number {
    const leftFont = opts.leftFont ?? this.font
    const rightFont = opts.rightFont ?? this.font
    const gap = opts.gap ?? 12
    const lw = leftFont.widthOfTextAtSize(left, fontSize)
    const rw = rightFont.widthOfTextAtSize(right, fontSize)
    if (lw + gap + rw <= CONTENT_WIDTH) return fontSize * LINE_HEIGHT_RATIO
    return this.measureLine(left, fontSize, { font: leftFont }) + this.measureLine(right, fontSize, { font: rightFont })
  }

  /** Centered contact line of segments; segments with a `url` become hyperlinks (underlined) */
  drawCenteredSegments(segments: CenteredSegment[], fontSize: number, opts: DrawCenteredSegmentsOptions = {}) {
    const sep = opts.separator ?? ' | '
    const gap = opts.gap ?? 6
    const sepWidth = this.font.widthOfTextAtSize(sep, fontSize)
    let total = 0
    segments.forEach((s, i) => {
      const f = s.font ?? opts.font ?? this.font
      total += f.widthOfTextAtSize(s.text, fontSize)
      if (i < segments.length - 1) total += sepWidth + gap
    })
    const baseline = this.y
    this.ensurePage(fontSize * LINE_HEIGHT_RATIO)
    let x = (PAGE_WIDTH - total) / 2
    segments.forEach((s) => {
      const f = s.font ?? opts.font ?? this.font
      const c = s.color ?? opts.color ?? BLACK
      const w = f.widthOfTextAtSize(s.text, fontSize)
      this.page.drawText(s.text, { x, y: baseline, size: fontSize, font: f, color: c })
      if (s.url) {
        this.addLink(s.url, x, baseline - fontSize * 0.6, w, fontSize * 1.4)
        if (opts.underlineLinks !== false)
          this.page.drawLine({ start: { x, y: baseline - 1.5 }, end: { x: x + w, y: baseline - 1.5 }, thickness: 0.5, color: c })
      }
      x += w + sepWidth + gap
    })
    this.y = baseline - fontSize * LINE_HEIGHT_RATIO
  }
}
