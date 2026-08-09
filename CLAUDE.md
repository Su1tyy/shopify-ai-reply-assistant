# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo is a single static marketing landing page — `index.html` — advertising a Fiverr gig ("Shopify AI Reply Assistant": a service that drafts AI-generated replies to Shopify customer support tickets). There is no backend, no build system, no package manager, and no test suite. Everything (markup, CSS, and JS) lives in the one file.

## Development workflow

- **Run it**: open `index.html` directly in a browser, or serve it locally, e.g. `python3 -m http.server` from the repo root and visit `http://localhost:8000`. There is no dev server, bundler, or hot reload.
- **Build**: none — there is nothing to compile or bundle.
- **Lint/test**: none configured. Verify changes by opening the page in a browser and checking the affected section visually and interactively (see "Things to check manually" below).
- **Deploy**: none configured in-repo (no CI/CD workflow files exist).

## Architecture / structure of `index.html`

The file is organized top-to-bottom as: `<head>` (fonts + GSAP CDN scripts) → inline `<style>` block → page sections in scroll order → inline `<script>` block at the bottom. There are no separate CSS/JS files or asset directories.

**External dependencies (all via CDN, no local copies):**
- Google Fonts (`Inter`)
- GSAP 3.12.2 + ScrollTrigger plugin, from cdnjs

**CSS conventions:**
- Design tokens are defined once as CSS custom properties on `:root` (`--beige`, `--green`, `--amber`, `--ink`, etc.) — reuse these variables rather than hardcoding new colors.
- Each page section has its own CSS block, ordered to match the HTML section order (hero → how-it-works → examples → features → pricing → closing CTA → responsive overrides).
- Responsive breakpoints are consolidated at the bottom of the `<style>` block (`@media (max-width: 900px)` and `(max-width: 580px)`) rather than interleaved per-component — add new responsive rules there, not next to the component's base styles.

**Page sections (in DOM order):**
1. `.hero` — headline, subtitle, CTA linking to `#pricing`, animated floating background shapes.
2. `.how` — 3-step "how it works" cards.
3. `.examples` — 4 sample support-ticket cards, each showing a customer message (`.msg.customer`) and a drafted AI reply (`.msg.reply`).
4. `.features` — 4-card feature grid.
5. `.pricing` (`id="pricing"`) — interactive volume slider + 3 pricing tier cards (Starter/Growth/Pro).
6. `.closing-cta` — final CTA linking out to the live Fiverr gig URL.

**JS behavior (inline `<script>` at the end of `<body>`):**
- GSAP timeline fades/slides in hero elements on load.
- Mousemove parallax on the hero background shapes.
- `ScrollTrigger.batch(...)` staggers fade-in animations for `.feature-card`, `.price-card`, `.step`, and `.ticket-card` as they scroll into view.
- Pricing slider logic (`#volume-slider`): reads the ticket-volume value, updates the `#volume-value` readout, and toggles a `.recommended` class on whichever `.price-card[data-min][data-max]` range the slider value falls into. When editing tier pricing/thresholds, keep the `data-min`/`data-max` attributes on `.price-card` elements consistent with the slider's `min`/`max`/`step` (currently 5–200, step 5) and with the tier copy.

## Content notes

- The pricing section has an HTML comment (`<!-- inferred: ... -->`, just above `.volume-selector`) flagging that tier feature lists and slider thresholds are illustrative placeholders based on known price points ($90/$110/$150) — confirm exact deliverables and volume cutoffs with the user before changing displayed pricing/features.
- The closing CTA's Fiverr link is the real, live gig URL — treat changes to it as a meaningful, user-facing change, not a placeholder edit.
