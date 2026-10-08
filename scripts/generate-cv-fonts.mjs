// Regenerates server/utils/cv-fonts.data.ts from the font files in server/fonts/.
//
// These are the full DejaVu Serif TTFs (regular + bold). We deliberately use the
// full fonts: @pdf-lib/fontkit cannot read pyftsubset output, so subsetting breaks
// font embedding. pdf-lib subsets internally on embed, so the generated PDF stays
// reasonably sized; the full TTF is only carried in the server bundle (~1 MB base64).
//
// Source: /usr/share/fonts/TTF/DejaVuSerif*.ttf (Bitstream Vera license, free to embed).
//
// Run: bun run scripts/generate-cv-fonts.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fontsDir = join(root, 'server', 'fonts')
const outFile = join(root, 'server', 'utils', 'cv-fonts.data.ts')

const files = readdirSync(fontsDir).filter(f => f.endsWith('.ttf')).sort()
if (!files.length) {
  console.error(`No .ttf files found in ${fontsDir}`)
  process.exit(1)
}

const lines = [
  '// GENERATED FILE — do not edit by hand. Regenerate with: bun run scripts/generate-cv-fonts.mjs',
  '// DejaVu Serif fonts (base64) embedded into the server bundle for the CV PDF.',
]
for (const file of files) {
  const b64 = readFileSync(join(fontsDir, file)).toString('base64')
  const name = file.replace(/-|\./g, '_').replace(/^DejaVuSerif_/, 'dejaVuSerif_')
  lines.push(`export const ${name}: string = '${b64}'`)
}

writeFileSync(outFile, `${lines.join('\n')}\n`)
console.log(`Wrote ${outFile} (${files.join(', ')})`)
