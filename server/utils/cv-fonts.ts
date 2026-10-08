// Server-side font loading for the CV PDF.
// Fonts are subsetted DejaVu Serif (matching the reference CV) embedded as base64
// in `cv-fonts.data.ts` so they are bundled into the Cloudflare Worker with no
// filesystem or Nitro virtual-module dependency.
import { dejaVuSerif_Bold_ttf, dejaVuSerif_ttf } from './cv-fonts.data'

export interface CvFonts {
  regular: Uint8Array
  bold: Uint8Array
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++)
    bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function loadCvFonts(): CvFonts {
  return {
    regular: fromBase64(dejaVuSerif_ttf),
    bold: fromBase64(dejaVuSerif_Bold_ttf),
  }
}
