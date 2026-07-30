import type { PDFDocument, PDFFont, PDFPage, RGB } from 'pdf-lib'
import type { TextBlock } from './cv-text'
import { rgb } from 'pdf-lib'
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
export const FS_SECTION = 13
export const FS_HEADING = 11
export const FS_BODY = 10
export const FS_SMALL = 8

export const BLACK = rgb(0, 0, 0)
export const GRAY = rgb(0.4, 0.4, 0.4)

export interface DrawLineOptions {
  x?: number
  font?: PDFFont
  color?: RGB
  maxWidth?: number
  /** Extra indent applied to wrapped continuation lines */
  hang?: number
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
    if (this.y - needed < BOTTOM_MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      this.y = PAGE_HEIGHT - MARGIN
      return true
    }
    return false
  }

  /** Start a new page if a block of `height` doesn't fit here but would fit on a fresh page */
  keepTogether(height: number) {
    const fitsOnFreshPage = height <= PAGE_HEIGHT - MARGIN - BOTTOM_MARGIN
    if (fitsOnFreshPage && this.y - height < BOTTOM_MARGIN) {
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
      this.ensurePage(lh)
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
}
