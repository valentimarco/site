// ─── Types ────────────────────────────────────────────────
export type TextBlock
  = | { type: 'paragraph', text: string }
    | { type: 'list', items: string[] }

export type Bindings = Record<string, string>

// ─── Sanitization ─────────────────────────────────────────
// Standard PDF fonts use WinAnsi (CP1252) encoding: Latin-1 plus a few extras
const WINANSI_EXTRA_CP = new Set([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017D, 0x017E, 0x0192,
  0x02C6, 0x02DC, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C,
  0x201D, 0x201E, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039,
  0x203A, 0x20AC, 0x2122,
])

/** Drop characters that WinAnsi-encoded standard fonts cannot render (emoji, symbols, …) */
export function toWinAnsi(text: string): string {
  let out = ''
  for (const char of text) {
    const cp = char.codePointAt(0)!
    if ((cp >= 0x20 && cp <= 0x7E) || (cp >= 0xA0 && cp <= 0xFF) || WINANSI_EXTRA_CP.has(cp))
      out += char
  }
  return out
}

const MULTISPACE_RE = /\s+/g
const SPACE_BEFORE_PUNCT_RE = /\s+([),.!?;:])/g

/** Normalize inline text: collapse whitespace, then strip unsupported glyphs */
export function cleanInline(text: string): string {
  // Collapse first: toWinAnsi drops \n, which would glue words together
  return toWinAnsi(text.replace(MULTISPACE_RE, ' '))
    .replace(SPACE_BEFORE_PUNCT_RE, '$1') // residue from stripped emoji ("my ❤️)," -> "my),")
    .trim()
}

// ─── Date Helpers ─────────────────────────────────────────
export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function fmtRange(start: string, end?: string): string {
  const startStr = fmtDate(start)
  const endStr = end ? fmtDate(end) : 'Present'
  return `${startStr} – ${endStr}`
}

export function computeAge(birthDate: string, now: Date = new Date()): number {
  const birth = new Date(birthDate)
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate()))
    age--
  return age
}

// ─── Minimark Extraction ──────────────────────────────────
function isProps(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A minimark tuple is [tag: string, props: object, ...children]; anything else is a list of nodes */
function isTuple(node: unknown[]): node is [string, Record<string, unknown>, ...unknown[]] {
  return typeof node[0] === 'string' && isProps(node[1])
}

/** Extract inline text from minimark nodes, resolving {{ $doc.* }} bindings */
function extractInline(node: unknown, bindings: Bindings): string {
  if (node == null) return ''
  if (typeof node === 'string') return node
  if (!Array.isArray(node)) return ''
  if (!isTuple(node))
    return node.map(child => extractInline(child, bindings)).join('')
  const [tag, props, ...children] = node
  if (tag === 'binding') {
    const key = props.value
    return (typeof key === 'string' && bindings[key]) || ''
  }
  return children.map(child => extractInline(child, bindings)).join('')
}

function minimarkRoot(body: unknown): unknown[] {
  if (!body) return []
  if (typeof body === 'string') return [body]
  if (isProps(body)) {
    for (const key of ['value', 'children', 'content']) {
      const root = body[key]
      if (Array.isArray(root)) return root
    }
  }
  return []
}

/**
 * Parse a Nuxt Content v3 minimark body into structured blocks
 * (paragraphs and lists), preserving the document structure.
 */
export function parseMinimarkBody(body: unknown, bindings: Bindings = {}): TextBlock[] {
  const blocks: TextBlock[] = []
  for (const node of minimarkRoot(body)) {
    if (typeof node === 'string') {
      const text = cleanInline(node)
      if (text) blocks.push({ type: 'paragraph', text })
      continue
    }
    if (!Array.isArray(node)) continue
    const [tag, maybeProps, ...rest] = node
    const children = isProps(maybeProps) ? rest : [maybeProps, ...rest]
    if (tag === 'ul' || tag === 'ol') {
      const items = children
        .filter((child): child is unknown[] => Array.isArray(child) && child[0] === 'li')
        .map(li => cleanInline(extractInline(li, bindings)))
        .filter(Boolean)
      if (items.length) blocks.push({ type: 'list', items })
    }
    else {
      const text = cleanInline(extractInline(children, bindings))
      if (text) blocks.push({ type: 'paragraph', text })
    }
  }
  return blocks
}
