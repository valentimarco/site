import type { CenteredSegment } from '../utils/cv-pdf'
import type { Bindings } from '../utils/cv-text'
import { queryCollection } from '@nuxt/content/server'
import { Octokit } from '@octokit/rest'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument } from 'pdf-lib'
import { loadCvFonts } from '../utils/cv-fonts'
import { fetchContributions, fetchProjects } from '../utils/cv-github'
import { BOTTOM_MARGIN, CvLayout, FS_BODY, FS_H2, FS_HEADING, FS_SMALL, FS_TITLE, GRAY, LINE_HEIGHT_RATIO, PAGE_WIDTH } from '../utils/cv-pdf'
import { computeAge, fmtDate, fmtRange, parseMinimarkBody } from '../utils/cv-text'

export default defineEventHandler(async (event) => {
  const [profile, skills, experiences, education, certifications, projects, cvConfig] = await Promise.all([
    queryCollection(event, 'profile').first(),
    queryCollection(event, 'skills').first(),
    queryCollection(event, 'experiences').order('stem', 'ASC').all(),
    queryCollection(event, 'education').order('stem', 'ASC').all(),
    queryCollection(event, 'certifications').order('stem', 'ASC').all(),
    queryCollection(event, 'projects').first(),
    queryCollection(event, 'cv').first(),
  ])

  if (!profile)
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })

  const config = useRuntimeConfig(event)
  const octokit = new Octokit({ auth: config.githubToken || undefined })
  const contributions = await fetchContributions(profile.username || '', octokit)
  const projectItems = await fetchProjects(profile.username || '', projects?.repos || [], octokit)

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  const { regular: fontBytes, bold: boldBytes } = loadCvFonts()
  const font = await pdfDoc.embedFont(fontBytes)
  const boldFont = await pdfDoc.embedFont(boldBytes)
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
  const name = profile.name
  const jobTitle = profile.jobTitle
  const email = profile.email
  const loc = profile.location

  // h1
  const nw = boldFont.widthOfTextAtSize(name, FS_TITLE)
  layout.drawLine(name, FS_TITLE, { x: (PAGE_WIDTH - nw) / 2, font: boldFont })
  // h2: job title, black, one h2 line-height below the name
  layout.y += (FS_TITLE - FS_H2) * LINE_HEIGHT_RATIO
  const tw = boldFont.widthOfTextAtSize(jobTitle, FS_H2)
  layout.drawLine(jobTitle, FS_H2, { x: (PAGE_WIDTH - tw) / 2, font: boldFont })
  layout.gap(8)
  // h3: contact line, black, clickable email / GitHub / LinkedIn
  const headerSegments: CenteredSegment[] = [
    { text: email, url: `mailto:${email}` },
    { text: loc },
    ...profile.socials.map(s => ({ text: s.label, url: s.url })),
  ]
  layout.drawCenteredSegments(headerSegments, FS_SMALL)
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
        const jobAndType = [item.position, item.location].filter(Boolean).join(' - ')
        const right = [jobAndType, item.dateRange].filter(Boolean).join(' | ')
        const height = layout.measureColumns(item.company, right, FS_HEADING, { leftFont: boldFont, rightFont: boldFont })
          + layout.measureBlocks(item.blocks)
          + 3
        layout.keepTogether(height)
        layout.drawColumns(item.company, right, FS_HEADING, { leftFont: boldFont, rightFont: boldFont })
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
          + layout.measureBlocks(item.blocks)
          + 2
        layout.keepTogether(height)
        layout.drawLine(heading, FS_HEADING, { font: boldFont })
        if (item.degree) layout.drawLine(item.degree, FS_BODY, { color: GRAY })
        layout.drawBlocks(item.blocks)
        layout.gap(2)
      }
      layout.gap(2)
    },
    skills() {
      if (!skillCategories.length) return
      layout.drawSectionTitle('Skills')
      for (const cat of skillCategories) {
        const label = `${cat.name}: `
        const items = cat.items.join(', ')
        layout.keepTogether(layout.measureLabeledLine(label, items, FS_BODY))
        layout.drawLabeledLine(label, items, FS_BODY)
      }
      layout.gap(2)
    },
    projects() {
      if (!projectItems.length) return
      layout.drawSectionTitle('Projects')
      for (const p of projectItems) {
        const desc = p.description ?? ''
        const blockH = layout.measureLine(p.name, FS_HEADING, { font: boldFont })
          + (desc ? 20 + layout.measureLine(desc, FS_BODY) : 0)
          + 20
        layout.keepTogether(blockH)
        layout.drawLinkLine(p.name, FS_HEADING, { font: boldFont, url: p.htmlUrl })
        if (desc) {
          layout.gap(20) // 2rem spacing between name and description
          layout.drawLine(desc, FS_BODY)
        }
        layout.gap(20) // 2rem between project blocks
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

  const DEFAULT_ORDER = ['summary', 'experience', 'skills', 'projects', 'education', 'certifications', 'contributions']
  const order = cvConfig?.body?.length ? cvConfig.body : DEFAULT_ORDER
  for (const name of order) sections[name]?.()

  // ═══ FOOTER ════════════════════════════════════════════
  const gdpr = 'I authorise the processing of my personal data in this CV in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council (GDPR).'
  const copyright = `© ${new Date().getFullYear()} ${name}`
  const footerHeight = 8 + layout.measureLine(gdpr, FS_SMALL) + layout.measureLine(copyright, FS_SMALL)
  layout.y = BOTTOM_MARGIN + footerHeight // pin to the bottom of the current (last) page
  layout.drawRule(GRAY)
  layout.gap(8)
  layout.drawLine(gdpr, FS_SMALL, { color: GRAY, noBreak: true })
  layout.drawLine(copyright, FS_SMALL, { color: GRAY, noBreak: true })

  const pdfBytes = await pdfDoc.save() as Uint8Array
  setResponseHeader(event, 'Content-Type', 'application/pdf')
  setResponseHeader(event, 'Content-Disposition', 'attachment; filename="cv.pdf"')
  return pdfBytes
})
