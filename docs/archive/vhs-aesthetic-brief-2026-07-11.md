# VHS Aesthetic Brief — StickWithIt Public Site
_From AJ, 2026-07-11. Scope: PUBLIC SITE ONLY (dashboard stays utilitarian)._

## Direction
- VHS / CRT / lofi: "bringing TV back to the internet era." Match the existing Coming Up Next slate look.
- Creative but MINIMALISTIC and CLEAN. Readability wins every conflict.
- Applies to both desktop and mobile layouts (keep the UI split responsive).

## Hard rules
- **No GPU on the VPS or assumption of strong client GPUs**: effects must be cheap.
  CSS-only: scanlines via repeating-linear-gradient, subtle vignette, static noise as a tiny tiled PNG/SVG or CSS gradient, chromatic-aberration ONLY as static text-shadow on headings. NO heavy `filter:` chains, NO large animated blurs, NO canvas/WebGL shaders, NO continuous full-screen animations. Prefer `opacity`/`transform`-only transitions; honor `prefers-reduced-motion`.
- **Rounded corners = clickable only.** Bubbles/rounded cards are reserved for elements that navigate somewhere. Non-clickable content: square/flat, no bubble.
- **No bubbles within bubbles.** Never nest carded elements.
- **No "Open" buttons.** The clickable card/element itself is the affordance.
- **Thumbnails/images must fill their frames** — `object-fit: cover` + proper aspect-ratio boxes. No letterboxing/black bars above/below video thumbnails (AJ sees this today on contest entry thumbs; fix everywhere: contest carousel, artist cards, blog previews).

## Suggested vocabulary (pick tastefully, don't use all at once)
- OSD-style mono font for labels/timestamps (like VCR on-screen display: "PLAY ▶", "REC ●", channel numbers, timestamp corners).
- Subtle scanline overlay on the player and hero only, not body text areas.
- Tracking-error / tape-glitch accent on hover for clickable elements (cheap: 1-frame transform jitter, not looping).
- Muted phosphor palette accents (amber/green/cyan) on near-black; keep body text high-contrast.

## Process
- Produce ONE mock page first (homepage) for AJ sign-off before restyling remaining pages.
