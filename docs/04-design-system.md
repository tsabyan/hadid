# 04 — Design System

## 1. Design intent

The reference concept is loud: saturated red, heavy borders, dense grids, badge chrome everywhere. This build takes the same feature set in the opposite visual direction.

**Calm, premium, iOS-native.**

Five principles, in priority order:

1. **Quiet by default, loud only on demand.** Colour marks the one thing that matters on a screen. Everything else is neutral. A screen with three accent-coloured elements has two too many.
2. **Depth from light, not lines.** Elevation comes from soft, large-radius shadows and subtle surface tints. Borders are a last resort, and when used are `1px` at ~6% opacity.
3. **Space is the luxury signal.** Generous padding, high line-height, real breathing room between groups. Cramped equals cheap.
4. **Motion is physics, not decoration.** Springs, never linear easing. Everything animates from where it was to where it's going. Nothing bounces for fun.
5. **Type carries the hierarchy.** Weight and size do the work that colour and boxes do in the reference design.

## 2. Colour

Warm-neutral greys — a hint of warmth reads as premium where pure grey reads as clinical. One accent: a **muted clay**, keeping a memory of the original red without the alarm.

### Light

```css
:root {
  /* Surfaces */
  --bg:              oklch(98.5% 0.004 60);   /* app background, warm off-white */
  --surface:         oklch(100% 0 0);         /* cards */
  --surface-sunken:  oklch(96.5% 0.005 60);   /* grouped-list background */
  --surface-raised:  oklch(100% 0 0);         /* sheets, popovers */

  /* Text */
  --text:            oklch(21% 0.012 60);     /* primary */
  --text-secondary:  oklch(48% 0.010 60);     /* labels, metadata */
  --text-tertiary:   oklch(66% 0.008 60);     /* placeholders, disabled */

  /* Accent — muted clay */
  --accent:          oklch(58% 0.132 32);
  --accent-hover:    oklch(53% 0.138 32);
  --accent-soft:     oklch(94% 0.030 32);     /* tinted fills */
  --accent-text:     oklch(100% 0 0);

  /* Semantic */
  --success:         oklch(62% 0.108 155);
  --warning:         oklch(74% 0.120 78);
  --danger:          oklch(58% 0.150 22);

  /* Lines */
  --border:          oklch(21% 0.012 60 / 0.07);
  --separator:       oklch(21% 0.012 60 / 0.045);
}
```

### Dark

Not inverted — rebuilt. True black would fight the calm tone; near-black with a warm cast keeps it soft.

```css
:root[data-theme="dark"] {
  --bg:              oklch(16% 0.008 60);
  --surface:         oklch(20.5% 0.009 60);
  --surface-sunken:  oklch(13.5% 0.007 60);
  --surface-raised:  oklch(24% 0.010 60);

  --text:            oklch(96% 0.004 60);
  --text-secondary:  oklch(72% 0.008 60);
  --text-tertiary:   oklch(52% 0.008 60);

  --accent:          oklch(67% 0.128 32);
  --accent-hover:    oklch(72% 0.130 32);
  --accent-soft:     oklch(30% 0.048 32);

  --success:         oklch(70% 0.100 155);
  --warning:         oklch(80% 0.110 78);
  --danger:          oklch(66% 0.140 22);

  --border:          oklch(100% 0 0 / 0.09);
  --separator:       oklch(100% 0 0 / 0.06);
}
```

Follow `prefers-color-scheme` by default, with a manual override in settings written to `data-theme` on `<html>`.

### Heat-map ramp

Used by the muscle maps and the calendar. Sequential, perceptually even, and it must stay legible at the smallest cell size.

```css
--heat-0: var(--surface-sunken);          /* no work */
--heat-1: oklch(93% 0.036 32);
--heat-2: oklch(85% 0.072 32);
--heat-3: oklch(73% 0.108 32);
--heat-4: oklch(60% 0.135 32);            /* heaviest */
```

Never encode information in colour alone. Calendar cells carry a numeral; muscle maps have a legend; the finish sheet lists muscle names in text.

## 3. Typography

System font stack. On iOS this resolves to **SF Pro**, which is the single strongest signal of native feel — and it costs zero bytes.

```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter var",
             system-ui, "Segoe UI", Roboto, sans-serif;
--font-numeric: "SF Mono", ui-monospace, "JetBrains Mono", monospace;
```

Self-host `Inter var` as the non-Apple fallback via `next/font/local` so Android and desktop stay consistent.

### Scale

| Token | Size / line-height | Weight | Tracking | Use |
|-------|-------------------|--------|----------|-----|
| `display` | 34 / 41 | 700 | -0.02em | Onboarding headline |
| `title-1` | 28 / 34 | 700 | -0.02em | Screen titles |
| `title-2` | 22 / 28 | 600 | -0.015em | Section headers |
| `title-3` | 20 / 25 | 600 | -0.01em | Card titles |
| `headline` | 17 / 22 | 600 | -0.01em | List row primary |
| `body` | 17 / 24 | 400 | -0.005em | Body copy |
| `callout` | 16 / 21 | 400 | 0 | Secondary body |
| `subhead` | 15 / 20 | 400 | 0 | Metadata |
| `footnote` | 13 / 18 | 400 | 0 | Captions |
| `caption` | 12 / 16 | 500 | +0.01em | Chips, tags |
| `overline` | 11 / 14 | 600 | +0.06em | ALL-CAPS section labels |

Numbers — weights, reps, timers, volume — always use **tabular figures** (`font-variant-numeric: tabular-nums`). Digits shifting width during a countdown is the fastest way to make an app feel amateur.

Stat values use `--font-numeric` at weight 600 with tight tracking.

## 4. Spacing, radii, elevation

4px base scale: `0 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.

Defaults: screen gutter `20px` · card padding `16–20px` · gap between cards `12px` · gap between sections `32px` · list row height `56px` minimum.

```css
--radius-sm:   8px;    /* chips, tags */
--radius-md:   12px;   /* buttons, inputs */
--radius-lg:   16px;   /* cards */
--radius-xl:   20px;   /* large cards, modals */
--radius-2xl:  28px;   /* sheets, hero surfaces */
--radius-full: 9999px;
```

Shadows are wide, soft, and low-opacity. Two stacked layers — one tight contact shadow, one broad ambient — is what separates a real iOS surface from a `box-shadow: 0 2px 4px` rectangle.

```css
--shadow-sm: 0 1px 2px oklch(21% 0.012 60 / 0.04),
             0 1px 3px oklch(21% 0.012 60 / 0.03);
--shadow-md: 0 2px 4px oklch(21% 0.012 60 / 0.04),
             0 4px 12px oklch(21% 0.012 60 / 0.05);
--shadow-lg: 0 4px 8px oklch(21% 0.012 60 / 0.04),
             0 12px 32px oklch(21% 0.012 60 / 0.07);
--shadow-xl: 0 8px 16px oklch(21% 0.012 60 / 0.05),
             0 24px 56px oklch(21% 0.012 60 / 0.10);
```

In dark mode shadows barely register — separate surfaces there with `--surface-raised` tint plus a hairline top border at 8% white.

## 5. Materials (blur)

Used for exactly three things: the sticky header, the tab bar, and modal sheet backdrops. Blur anywhere else is decoration and gets cut.

```css
.material-thin {
  background: color-mix(in oklch, var(--bg) 72%, transparent);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}
```

The `saturate(180%)` is the part people skip, and it's the part that makes it look like iOS rather than frosted glass. Always provide an opaque fallback via `@supports not (backdrop-filter: blur(1px))`.

## 6. Motion

Springs only. Duration-based easing is the tell of a web app pretending to be native.

```ts
export const spring = {
  // list items, chips, small state changes
  snappy:  { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 },
  // cards, sheets, page transitions
  smooth:  { type: 'spring', stiffness: 260, damping: 28, mass: 1 },
  // large surfaces, modal presentation
  gentle:  { type: 'spring', stiffness: 180, damping: 26, mass: 1.1 },
  // badge unlock, PR reveal — the only place with visible overshoot
  bouncy:  { type: 'spring', stiffness: 320, damping: 18, mass: 0.9 },
} as const
```

| Interaction | Behaviour |
|-------------|-----------|
| Button press | `scale: 0.97`, `snappy`, on `pointerdown` — release animates back |
| Card tap | `scale: 0.985` plus a shadow drop |
| Sheet present | Slides from bottom with `gentle`; backdrop fades 0→1 over 200ms |
| Sheet dismiss | Drag-to-dismiss with velocity: past 40% height or >500px/s flings closed |
| Page transition | 12px slide + fade, `smooth`. No horizontal push-stack — it feels wrong in a browser |
| List reorder | `layout` animation, `snappy`, with the dragged item lifted by `--shadow-lg` |
| Number change | Digit roll only for stats, never for live inputs |
| Rest timer ring | Continuous `stroke-dashoffset`, linear — this one *is* linear, because it represents real time |
| Set completed | Row tints `--accent-soft` for 400ms, then settles |
| Badge unlock | Scale 0.6→1 with `bouncy`, radial glow fades in and out over 900ms |

**Reduced motion**: when `prefers-reduced-motion: reduce`, replace every transform-based transition with a 120ms opacity crossfade. Keep the rest-timer ring — it conveys information, not decoration.

## 7. Haptics

iOS Safari does not expose the Vibration API. Do not build feedback that depends on it.

```ts
// Android/Chrome only — a bonus, never the primary signal
export const haptic = {
  light:   () => navigator.vibrate?.(8),
  medium:  () => navigator.vibrate?.(15),
  success: () => navigator.vibrate?.([10, 40, 10]),
}
```

Every haptic must be paired with a visual response, and rest-timer completion additionally plays a short Web Audio tone (a 660Hz sine with a 150ms decay envelope — soft, not an alarm). Unlock the AudioContext on the first user gesture of the session, or iOS will silently refuse to play it.

## 8. Component specs

### Button
| Variant | Fill | Text | Use |
|---------|------|------|-----|
| `primary` | `--accent` | `--accent-text` | One per screen. The single most important action |
| `secondary` | `--surface`, `--shadow-sm` | `--text` | Common actions |
| `tinted` | `--accent-soft` | `--accent` | Frequent but not primary |
| `ghost` | transparent | `--text-secondary` | Tertiary, toolbars |
| `destructive` | transparent | `--danger` | Delete. Always behind a confirm |

Heights: `sm 36` · `md 44` · `lg 52`. Radius `--radius-md`, except full-width CTAs which use `--radius-lg`. Weight 600. Minimum tap target 44×44 regardless of visual size.

### Card
`--surface` · `--radius-lg` · `--shadow-sm` · padding 16–20 · no border in light mode. Interactive cards scale to `0.985` on press and lift to `--shadow-md` on hover (pointer devices only).

### Stat card
Overline label in `--text-tertiary`, value in `--font-numeric` at `title-1`, optional delta chip. Deltas: `--success` tint for positive, `--text-secondary` for negative — a down week is information, not a failure, and colouring it red is a judgement the app shouldn't make.

### Segmented control
Sunken track (`--surface-sunken`, `--radius-md`, 3px padding), white pill thumb with `--shadow-sm` that animates between segments with `layoutId` and `snappy`. Text 15/600, active `--text`, inactive `--text-secondary`.

### Stepper
`[−] [ 155 ] [+]`. Buttons 44×44, `--surface-sunken`, `--radius-md`. Value field is a real `<input inputMode="decimal">`, `--font-numeric`, `title-3`, centred. Hold to accelerate: 500ms delay, then repeat at 100ms, then 40ms after ten steps.

### List row
Minimum 56px, 16px horizontal padding, `--separator` hairline inset to align with the text — never full-bleed. Chevron in `--text-tertiary`. Swipe-left reveals actions with rubber-band resistance.

### Sheet
`--surface-raised`, `--radius-2xl` on top corners only, 4×36px grab handle in `--text-tertiary` at 30%, backdrop `oklch(0% 0 0 / 0.28)` with an 8px blur. Detents at 40% / 90% for content-tall sheets. Drag to dismiss.

### Chip / filter
Height 34, radius `--radius-full`, padding 14px. Inactive `--surface-sunken` / `--text-secondary`; active `--accent-soft` / `--accent` with weight 600. Active state carries no border.

### Progress ring
SVG, stroke width 6, `--surface-sunken` track, `--accent` indicator, `stroke-linecap: round`, rotated -90°. Numeric value centred in `--font-numeric`.

### Empty state
Centred: a 48px line icon in `--text-tertiary`, a `title-3` line, one `subhead` sentence, one `tinted` button. Never an illustration — illustrations date fast and read as filler.

## 9. Layout & safe areas

Installed to the home screen, this runs full-bleed behind the notch and the home indicator.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
```

```css
.tab-bar   { padding-bottom: max(8px,  env(safe-area-inset-bottom)); }
.header    { padding-top:    max(12px, env(safe-area-inset-top)); }
.screen    { padding-inline: max(20px, env(safe-area-inset-left)); }
```

Content max-width 480px, centred, so the desktop view stays a phone-shaped column rather than stretching into an unusable wide layout. Prevent overscroll bounce on the body (`overscroll-behavior-y: none`), keep it inside scroll containers.

## 10. What "premium" means concretely

Checklist for review. Any screen failing more than one of these is not done:

- [ ] At most one accent-coloured element competing for attention
- [ ] All numerals tabular; no width shift on change
- [ ] Every state change animated with a spring, nothing snapping
- [ ] No spinner on any path shorter than 400ms — use optimistic UI or a skeleton
- [ ] Empty, loading, error, and offline states all designed, not defaulted
- [ ] Safe areas respected top and bottom
- [ ] Text contrast ≥ 4.5:1 in both themes
- [ ] Reduced-motion path tested
- [ ] Every tap target ≥ 44×44
- [ ] Nothing shifts layout after load
