/**
 * Renders the PWA icons from an inline SVG.
 *
 * Committing generated PNGs is normal for icons — they change roughly never —
 * but generating them from source means the accent colour cannot drift away
 * from the design tokens without someone noticing.
 *
 * Run: npm run icons:gen
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public/icons')

// --accent in light mode, converted from oklch(58% 0.132 32).
const ACCENT = '#b4553f'
const BG = '#fbfaf9'

/**
 * `padded` leaves room for the maskable safe zone: Android crops maskable
 * icons to arbitrary shapes, and a glyph drawn edge to edge loses its corners
 * on any device that prefers a circle.
 */
/**
 * `dy` is 0.054em, not the 0.35em that vertically centres a Latin cap.
 *
 * Measured rather than guessed: rendering ح with dy=0 and trimming to its ink
 * bounding box puts the glyph's centre 0.054em *above* the baseline, so that
 * is exactly the correction needed. Eyeballing it produced 0.16em, which is
 * three times too far and visibly drops the mark.
 */
const icon = (size, { maskable = false } = {}) => {
  const radius = maskable ? size / 2 : size * 0.22
  const glyph = maskable ? size * 0.42 : size * 0.56
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${ACCENT}"/>
  <text x="50%" y="50%" dy="0.054em" text-anchor="middle"
        font-family="-apple-system, Segoe UI, Roboto, sans-serif"
        font-size="${glyph}" font-weight="700" fill="${BG}">ح</text>
</svg>`
}

await mkdir(out, { recursive: true })

const targets = [
  { name: '192.png', size: 192, opts: {} },
  { name: '512.png', size: 512, opts: {} },
  { name: 'maskable-512.png', size: 512, opts: { maskable: true } },
  { name: 'apple-touch-icon.png', size: 180, opts: {} },
]

for (const target of targets) {
  await sharp(Buffer.from(icon(target.size, target.opts)))
    .png()
    .toFile(join(out, target.name))
  console.log(`  icons/${target.name}  ${target.size}x${target.size}`)
}

/*
 * The browser tab icon.
 *
 * Next's App Router serves app/icon.png as the favicon automatically, at
 * higher fidelity than a .ico — and it takes precedence over the default
 * app/favicon.ico, which is why that file is deleted rather than left to
 * compete. apple-icon.png is the same convention for the iOS home screen.
 */
const app = join(root, 'app')
await sharp(Buffer.from(icon(256))).png().toFile(join(app, 'icon.png'))
await sharp(Buffer.from(icon(180))).png().toFile(join(app, 'apple-icon.png'))
console.log('  app/icon.png        256x256')
console.log('  app/apple-icon.png  180x180')
