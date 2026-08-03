import { cn } from '@/lib/utils/cn'

/**
 * The app mark.
 *
 * Drawn as SVG with the same geometry as `scripts/gen-icons.mjs`, so the tile
 * on the onboarding screen and the icon on the home screen are the same
 * object rather than two things that merely resemble each other.
 *
 * The `dy` is measured, not eyeballed. Rendering ح with `dy=0` and trimming to
 * its ink bounding box puts the glyph's centre 0.054em above the baseline, so
 * that is the whole correction. CSS flex centring cannot do this: it centres
 * the line box, and the ink of ح sits low inside it — which is why the first
 * two attempts here looked dropped.
 */
export function HadidMark({
  size = 72,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn('shrink-0', className)}
      // The rounding lives inside the viewBox, so the element box is still a
      // square. Any box-shadow applied by a caller would trace that square
      // unless the radius is mirrored here too.
      style={{ borderRadius: size * 0.22 }}
      role="img"
      aria-label="Hadid"
    >
      <rect width="100" height="100" rx="22" fill="var(--accent)" />
      <text
        x="50"
        y="50"
        dy="0.054em"
        textAnchor="middle"
        fontSize="56"
        fontWeight="700"
        fill="var(--accent-text)"
        fontFamily="var(--font-sans)"
      >
        ح
      </text>
    </svg>
  )
}
