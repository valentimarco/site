import { Octokit } from '@octokit/rest'
import { Liquid } from 'liquidjs'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import templateString from '../utils/cv-template'

// ─── Constants ─────────────────────────────────────────────
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const LINE_HEIGHT_RATIO = 1.35
const BOTTOM_MARGIN = 50

const FS_TITLE = 26
const FS_SUBTITLE = 14
const FS_SECTION = 13
const FS_HEADING = 11
const FS_BODY = 10
const FS_SMALL = 8

// Regex patterns hoisted to module scope to avoid re-compilation
const MDC_COMPONENT_RE = /:[-\w]+(?:\([^)]*\))?\{[^}]*\}\[([^\]]*)\]/g
const MDC_VOID_RE = /:[-\w]+(?:\([^)]*\))?\{[^}]*\}\s*/g
const TEMPLATE_EXPR_RE = /\{\{\s*\$doc\.\w+\s*\}\}/g
const EMOJI_RE = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
const MULTISPACE_RE = /\s+/g

// ─── Date Helpers ─────────────────────────────────────────
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtRange(start: string, end?: string): string {
  const startStr = fmtDate(start)
  const endStr = end ? fmtDate(end) : 'Present'
  return `${startStr} \u2013 ${endStr}`
}

// ─── AST Text Extraction ──────────────────────────────────
function extractText(node: any): string {
  if (!node) return ''
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'string') return node
  if (node.type === 'text' || node.type === 'textNode')
    return node.value ?? node.text ?? ''
  const children = node.content ?? node.children ?? []
  return extractText(children)
}

function cleanText(t: string): string {
  return t
    .replace(MDC_COMPONENT_RE, '$1')
    .replace(MDC_VOID_RE, '')
    .replace(TEMPLATE_EXPR_RE, '')
    .replace(EMOJI_RE, '')
    .replace(MULTISPACE_RE, ' ')
    .trim()
}

function parseBody(body: any): string {
  if (!body) return ''
  if (typeof body === 'string') return cleanText(body)
  const root = body.content ?? body.children ?? []
  if (!Array.isArray(root)) return ''
  const parts = root
    .map((child: any) => extractText(child).trim())
    .filter(Boolean)
  return cleanText(parts.join('\n\n'))
}

// ─── Word Wrapping ────────────────────────────────────────
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = []
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth)
      line = test
    else {
      if (line) lines.push(line)
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        let chars = ''
        for (const char of word) {
          const next = chars + char
          if (font.widthOfTextAtSize(next, fontSize) > maxWidth) {
            lines.push(chars)
            chars = char
          }
          else chars = next
        }
        line = chars || ''
      }
      else line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

// ─── GitHub Contributions ────────────────────────────────
async function fetchContributions(username: string, octokit: Octokit): Promise<any[]> {
  if (!username) return []
  try {
    const res = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:merged author:${username}`,
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    })
    const summaryMap = new Map<string, any>()
    for (const item of res.data.items) {
      const repoFullName = item.repository_url?.replace('https://api.github.com/repos/', '')
      if (!repoFullName) continue
      const [owner] = repoFullName.split('/')
      if (owner?.toLowerCase() === username.toLowerCase()) continue
      const updatedAt = item.updated_at || item.closed_at || item.created_at || new Date().toISOString()
      const existing = summaryMap.get(repoFullName)
      const summary = existing || { repoFullName, repoUrl: `https://github.com/${repoFullName}`, prCount: 0, stars: 0, lastPrUpdatedAt: updatedAt }
      summary.prCount += 1
      if (new Date(updatedAt).getTime() > new Date(summary.lastPrUpdatedAt).getTime())
        summary.lastPrUpdatedAt = updatedAt
      summaryMap.set(repoFullName, summary)
    }
    const candidates = Array.from(summaryMap.values())
      .sort((a, b) => b.prCount - a.prCount || new Date(b.lastPrUpdatedAt).getTime() - new Date(a.lastPrUpdatedAt).getTime())
      .slice(0, 12)
    const enriched = await Promise.all(
      candidates.map(async (summary) => {
        const [owner, repo] = summary.repoFullName.split('/')
        if (!owner || !repo) return summary
        try {
          const repoRes = await octokit.rest.repos.get({ owner, repo })
          return { ...summary, stars: repoRes.data.stargazers_count || 0 }
        }
        catch { return summary }
      }),
    )
    return enriched.sort((a, b) => b.prCount - a.prCount || (b.stars || 0) - (a.stars || 0)).slice(0, 6)
  }
  catch { return [] }
}

// ─── Liquid Engine ───────────────────────────────────────
const liquid = new Liquid()

// ─── Main Handler ────────────────────────────────────────
export default defineEventHandler(async (event) => {
  // 1. Fetch content collections
  const [profile, skills, experiences, education, certifications] = await Promise.all([
    queryCollection(event, 'profile').first(),
    queryCollection(event, 'skills').first(),
    queryCollection(event, 'experiences').order('stem', 'ASC').all(),
    queryCollection(event, 'education').order('stem', 'ASC').all(),
    queryCollection(event, 'certifications').order('stem', 'ASC').all(),
  ])

  if (!profile)
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })

  // 2. Fetch GitHub contributions
  const config = useRuntimeConfig(event)
  const octokit = new Octokit({ auth: config.githubToken || undefined })
  const contributions = await fetchContributions(profile.username || '', octokit)

  // 3. Build PDF
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const black = rgb(0, 0, 0)
  const gray = rgb(0.4, 0.4, 0.4)

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  // ── Layout helpers ──────────────────────────────────
  function ensurePage(needed: number = FS_BODY * LINE_HEIGHT_RATIO) {
    if (y - needed < BOTTOM_MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - MARGIN
    }
  }

  function drawLine(text: string, fontSize: number, opts: { x?: number; font?: any; color?: any; maxWidth?: number } = {}) {
    const x = opts.x ?? MARGIN
    const f = opts.font ?? font
    const c = opts.color ?? black
    const maxW = opts.maxWidth ?? CONTENT_WIDTH
    const lh = fontSize * LINE_HEIGHT_RATIO
    const safe = cleanText(text)
    const lines = wrapText(safe, f, fontSize, maxW)
    for (const line of lines) {
      ensurePage(lh)
      page.drawText(line, { x, y, size: fontSize, font: f, color: c })
      y -= lh
    }
  }

  function drawSectionTitle(title: string) {
    y -= 4
    ensurePage(FS_SECTION * LINE_HEIGHT_RATIO + 4)
    drawLine(title.toUpperCase(), FS_SECTION, { font: boldFont })
    const lineY = y + 2
    page.drawLine({ start: { x: MARGIN, y: lineY }, end: { x: PAGE_WIDTH - MARGIN, y: lineY }, thickness: 0.5, color: black })
    y -= 2
  }

  // ═══ HEADER ════════════════════════════════════════════
  const name = profile.name || ''
  const jobTitle = profile.jobTitle || ''
  const email = profile.email || ''
  const loc = profile.location || ''
  const socialLabels = (profile.socials || []).map((s: any) => s.label).join(' | ')

  if (name) {
    const nw = boldFont.widthOfTextAtSize(name, FS_TITLE)
    drawLine(name, FS_TITLE, { x: (PAGE_WIDTH - nw) / 2, font: boldFont })
  }
  if (jobTitle) {
    const tw = boldFont.widthOfTextAtSize(jobTitle, FS_SUBTITLE)
    drawLine(jobTitle, FS_SUBTITLE, { x: (PAGE_WIDTH - tw) / 2, color: gray })
  }
  const contactParts = [email, loc, socialLabels].filter(Boolean)
  if (contactParts.length > 0) {
    const contactText = contactParts.join('  |  ')
    const cw = font.widthOfTextAtSize(contactText, FS_SMALL)
    drawLine(contactText, FS_SMALL, { x: (PAGE_WIDTH - cw) / 2, color: gray })
  }
  y -= 8

  // ═══ PRE-PROCESS DATA & RENDER TEMPLATE ═══════════════
  const templateData = {
    summaryText: parseBody(profile.body),
    experiences: (experiences || []).map(e => ({ ...e, dateRange: fmtRange(e.startDate, e.endDate), body: parseBody(e.body) })),
    skills: skills?.categories || [],
    education: (education || []).map(e => ({ ...e, dateRange: fmtRange(e.startDate, e.endDate), body: parseBody(e.body) })),
    certifications: (certifications || []).map(c => ({ ...c, date: c.issueDate ? fmtDate(c.issueDate) : '' })),
    contributions: contributions || [],
  }

  // Render Liquid template to JSON layout
  // NOTE: parse() is called separately to avoid a LiquidJS bug in renderSync(string)
  const compiled = liquid.parse(templateString)
  const rendered = liquid.renderSync(compiled, templateData)
  const layout = JSON.parse(rendered)

  // ═══ RENDER SECTIONS FROM TEMPLATE ════════════════════
  for (const section of layout.sections) {
    switch (section.type) {
      case 'summary':
        drawSectionTitle(section.title)
        drawLine(section.body, FS_BODY)
        y -= 4
        break
      case 'experience':
        drawSectionTitle(section.title)
        for (const item of section.items) {
          drawLine(`${item.company}  |  ${item.dateRange}`, FS_HEADING, { font: boldFont })
          if (item.position || item.location)
            drawLine([item.position, item.location].filter(Boolean).join('  \u2014  '), FS_SMALL, { color: gray })
          if (item.body) drawLine(item.body, FS_BODY)
          y -= 3
        }
        y -= 2
        break
      case 'skills':
        drawSectionTitle(section.title)
        for (const cat of section.categories)
          if (cat.items?.length) drawLine(`${cat.name}: ${cat.items.join(', ')}`, FS_BODY)
        y -= 2
        break
      case 'education':
        drawSectionTitle(section.title)
        for (const item of section.items) {
          drawLine(`${item.institution}  |  ${item.dateRange}`, FS_HEADING, { font: boldFont })
          if (item.degree) drawLine(item.degree, FS_BODY, { color: gray })
          if (item.body) drawLine(item.body, FS_SMALL)
          y -= 2
        }
        y -= 2
        break
      case 'certifications':
        drawSectionTitle(section.title)
        for (const item of section.items)
          drawLine(`\u2022  ${[item.title, item.issuer, item.date].filter(Boolean).join(' \u2013 ')}`, FS_BODY)
        y -= 2
        break
      case 'contributions':
        drawSectionTitle(section.title)
        for (const item of section.items)
          drawLine(`\u2022  ${item.repo} \u2013 ${item.prCount} PR${item.prCount !== 1 ? 's' : ''} \u2013 ${item.stars} star${item.stars !== 1 ? 's' : ''}`, FS_BODY)
        y -= 2
        break
    }
  }

  // ═══ FOOTER ════════════════════════════════════════════
  ensurePage(FS_SMALL * LINE_HEIGHT_RATIO * 3 + 10)
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.5, color: gray })
  y -= 8

  const currentYear = new Date().getFullYear()
  drawLine('I authorise the processing of my personal data in this CV in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council (GDPR).', FS_SMALL, { color: gray })
  drawLine(`\u00A9 ${currentYear} ${name}`, FS_SMALL, { color: gray })

  // 4. Return the PDF
  const pdfBytes = await pdfDoc.save() as Uint8Array
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="cv.pdf"')
  return pdfBytes
})
