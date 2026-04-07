/**
 * Patch html2canvas to gracefully handle modern CSS color functions
 * (lab, oklch, oklab, lch, color) instead of throwing.
 *
 * html2canvas only supports rgb/rgba/hsl/hsla. When it encounters lab() etc.
 * from Tailwind v4 / modern browsers, it throws:
 *   "Attempting to parse an unsupported color function"
 *
 * This patch replaces the throw with a return of 0 (transparent black in
 * html2canvas's packed RGBA format), which is a safe fallback.
 */
const fs = require('fs')
const path = require('path')

const SEARCH = 'throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"")'
const REPLACE = 'return 0'

const files = [
  'dist/html2canvas.js',
  'dist/html2canvas.esm.js',
  'dist/html2canvas.min.js',
  'dist/lib/css/types/color.js',
]

let patched = 0
for (const file of files) {
  const fp = path.join(__dirname, '..', 'node_modules', 'html2canvas', file)
  try {
    let src = fs.readFileSync(fp, 'utf8')
    // Handle both regular and minified variants
    if (src.includes('Attempting to parse an unsupported color function')) {
      src = src.replace(
        /throw new Error\(["']Attempting to parse an unsupported color function[^)]*\)/g,
        'return 0',
      )
      fs.writeFileSync(fp, src)
      patched++
      console.log(`  patched: ${file}`)
    }
  } catch {
    // file might not exist (e.g. source maps)
  }
}

console.log(`html2canvas: patched ${patched} file(s) to handle modern CSS colors`)
