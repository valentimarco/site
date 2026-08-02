import type { Bindings } from '../utils/cv-text'
import { queryCollection } from '@nuxt/content/server'
import { Octokit } from '@octokit/rest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { fetchContributions } from '../utils/cv-github'
import { CvLayout, FS_BODY, FS_HEADING, FS_SMALL, FS_SUBTITLE, FS_TITLE, GRAY, LINE_HEIGHT_RATIO, PAGE_WIDTH } from '../utils/cv-pdf'
import { computeAge, fmtDate, fmtRange, parseMinimarkBody } from '../utils/cv-text'

export default defineEventHandler(async (event) => {
  const [profile, skills, experiences, education, certifications, cvConfig] = await Promise.all([
    queryCollection(event, 'profile').first(),
    queryCollection(event, 'skills').first(),
    queryCollection(event, 'experiences').order('stem', 'ASC').all(),
    queryCollection(event, 'education').order('stem', 'ASC').all(),
    queryCollection(event, 'certifications').order('stem', 'ASC').all(),
    queryCollection(event, 'cv').first(),
  ])

  if (!profile)
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })

  const config = useRuntimeConfig(event)
  const octokit = new Octokit({ auth: config.githubToken || undefined })
  const contributions = await fetchContributions(profile.username || '', octokit)

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const layout = new CvLayout(pdfDoc, font, boldFont)

  // Bindings for {{ $doc.* }} expressions used in content files
  const bindings: Bindings = {
    '$doc.age': String(computeAge(profile.birthDate)),
  }

  const summaryBlocks = parseMinimarkBody(profile.body, bindings)
  const expItems = (experiences || []).map(e => ({
    ...e,
    dateRange: fmtRange(e.startDate, e.endDate),
    blocks: parseMinimarkBody(e.body, bindings),
  }))
  const skillCategories = (skills?.categories || []).filter(c => c.items?.length)
  const eduItems = (education || []).map(e => ({
    ...e,
    dateRange: fmtRange(e.startDate, e.endDate),
    blocks: parseMinimarkBody(e.body, bindings),
  }))
  const certItems = (certifications || []).map(c => ({
    ...c,
    date: c.issueDate ? fmtDate(c.issueDate) : '',
  }))

  // ═══ HEADER ════════════════════════════════════════════
  const name = profile.name || ''
  const jobTitle = profile.jobTitle || ''
  const email = profile.email || ''
  const loc = profile.location || ''
  const socialLabels = (profile.socials || []).map(s => s.label).join(' | ')

  if (name) {
    const nw = boldFont.widthOfTextAtSize(name, FS_TITLE)
    layout.drawLine(name, FS_TITLE, { x: (PAGE_WIDTH - nw) / 2, font: boldFont })
  }
  if (jobTitle) {
    const tw = boldFont.widthOfTextAtSize(jobTitle, FS_SUBTITLE)
    layout.drawLine(jobTitle, FS_SUBTITLE, { x: (PAGE_WIDTH - tw) / 2, color: GRAY })
  }
  const contactParts = [email, loc, socialLabels].filter(Boolean)
  if (contactParts.length > 0) {
    const contactText = contactParts.join('  |  ')
    const cw = font.widthOfTextAtSize(contactText, FS_SMALL)
    layout.drawLine(contactText, FS_SMALL, { x: (PAGE_WIDTH - cw) / 2, color: GRAY })
  }
  layout.gap(8)

  // ═══ SECTIONS (ordered by content/cv.yml) ═════════════
  const sections: Record<string, () => void> = {
    summary() {
      if (!summaryBlocks.length) return
      layout.drawSectionTitle('Professional Summary')
      layout.drawBlocks(summaryBlocks)
      layout.gap(4)
    },
    experience() {
      if (!expItems.length) return
      layout.drawSectionTitle('Professional Experience')
      for (const item of expItems) {
        const heading = `${item.company}  |  ${item.dateRange}`
        const sub = [item.position, item.location].filter(Boolean).join('  —  ')
        const height = layout.measureLine(heading, FS_HEADING, { font: boldFont })
          + (sub ? layout.measureLine(sub, FS_SMALL) : 0)
          + layout.measureBlocks(item.blocks)
          + 3
        layout.keepTogether(height)
        layout.drawLine(heading, FS_HEADING, { font: boldFont })
        if (sub) layout.drawLine(sub, FS_SMALL, { color: GRAY })
        layout.drawBlocks(item.blocks)
        layout.gap(3)
      }
      layout.gap(2)
    },
    contributions() {
      if (!contributions.length) return
      layout.drawSectionTitle('Open Source Contributions')
      for (const item of contributions) {
        const text = `${item.repoFullName} – ${item.prCount} PR${item.prCount !== 1 ? 's' : ''} – ${item.stars} star${item.stars !== 1 ? 's' : ''}`
        layout.keepTogether(layout.measureBullet(text, FS_BODY))
        layout.drawBullet(text, FS_BODY)
      }
      layout.gap(2)
    },
    education() {
      if (!eduItems.length) return
      layout.drawSectionTitle('Education')
      for (const item of eduItems) {
        const heading = `${item.institution}  |  ${item.dateRange}`
        const height = layout.measureLine(heading, FS_HEADING, { font: boldFont })
          + (item.degree ? layout.measureLine(item.degree, FS_BODY) : 0)
          + layout.measureBlocks(item.blocks, { fontSize: FS_SMALL })
          + 2
        layout.keepTogether(height)
        layout.drawLine(heading, FS_HEADING, { font: boldFont })
        if (item.degree) layout.drawLine(item.degree, FS_BODY, { color: GRAY })
        layout.drawBlocks(item.blocks, { fontSize: FS_SMALL })
        layout.gap(2)
      }
      layout.gap(2)
    },
    skills() {
      if (!skillCategories.length) return
      layout.drawSectionTitle('Skills')
      for (const cat of skillCategories) {
        const label = `${cat.name}: `
        const opts = { hang: font.widthOfTextAtSize(label, FS_BODY) }
        layout.keepTogether(layout.measureLine(`${label}${cat.items.join(', ')}`, FS_BODY, opts))
        layout.drawLine(`${label}${cat.items.join(', ')}`, FS_BODY, opts)
      }
      layout.gap(2)
    },
    certifications() {
      if (!certItems.length) return
      layout.drawSectionTitle('Certifications')
      for (const item of certItems) {
        const text = [item.title, item.issuer, item.date].filter(Boolean).join(' – ')
        layout.keepTogether(layout.measureBullet(text, FS_BODY))
        layout.drawBullet(text, FS_BODY)
      }
      layout.gap(2)
    },
  }

  const DEFAULT_ORDER = ['summary', 'experience', 'skills', 'education', 'certifications', 'contributions']
  const order = cvConfig?.body?.length ? cvConfig.body : DEFAULT_ORDER
  for (const name of order) sections[name]?.()

  // ═══ FOOTER ════════════════════════════════════════════
  layout.ensurePage(FS_SMALL * LINE_HEIGHT_RATIO * 3 + 10)
  layout.drawRule(GRAY)
  layout.gap(8)

  const currentYear = new Date().getFullYear()
  layout.drawLine('I authorise the processing of my personal data in this CV in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council (GDPR).', FS_SMALL, { color: GRAY })
  layout.drawLine(`© ${currentYear} ${name}`, FS_SMALL, { color: GRAY })

  const pdfBytes = await pdfDoc.save() as Uint8Array
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="cv.pdf"')
  return pdfBytes
})
