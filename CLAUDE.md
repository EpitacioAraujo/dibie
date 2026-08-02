# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Public landing page / brand portfolio for "Dibie Sublimação". The repo holds two generations of the site:

- `v1/` — the original static HTML site (frozen, no longer developed).
- `v2/` — the active project. Static HTML/CSS/JS (no build step, no framework) reproducing the "Milo" Framer template design. **All new work happens here.**

Both are plain HTML sites served by nginx via Docker, tunneled with Cloudflare — see each folder's own `Dockerfile`/`docker-compose.yml` to run it.

## Commands (run from `v2/`)

```bash
cd v2
cp .env.example .env   # set WEB_PORT and TUNNEL_TOKEN
docker compose up --build
```

No build/lint/test command — pages are static files served as-is. For local iteration without Docker, serve `v2/src/` with any static file server (e.g. `python3 -m http.server`) since pages use root-relative asset paths (`/css/styles.css`, `/js/main.js`).

## Architecture (`v2/`)

- `src/*.html` — one page per file (`index.html`, `projects.html`, `about.html`, `contact.html`), each including the same `<head>`/header/footer markup (no templating — this is intentionally duplicated across files, not a shared layout system).
- `src/css/styles.css` — single stylesheet. Holds the exact type scale (`.text-h1`, `.text-h2`, `.text-body`, etc.) ported from the Framer template's text style presets — these encode real `font-size`/`letter-spacing`/`line-height` per breakpoint extracted from the source project, not approximated. Reuse these classes instead of ad-hoc font sizes.
- `src/js/main.js` — vanilla JS: `IntersectionObserver`-based scroll reveal (`.reveal` / `.reveal-on-mount`), the hero mosaic stagger animation (`data-delay` attributes drive `transition-delay`), and the About page accordion.
- Fonts (DM Sans, IBM Plex Mono) are loaded via Google Fonts `<link>` tags in each page's `<head>`.
- Images are hotlinked from `framerusercontent.com` (the original template's CDN) — not self-hosted.

## Design fidelity notes

This is a from-scratch recreation of a Framer template ("Milo"), not an export. When adding/fixing sections, prefer pulling exact values (font sizes, letter-spacing, padding, gaps) from the source Framer project over eyeballing screenshots — approximated values are the main source of visual drift from the original.

## Notes

- `v1/` and `v2/` are independent projects that happen to share a repo — don't cross-import or assume shared tooling between them.
