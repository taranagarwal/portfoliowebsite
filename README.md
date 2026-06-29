# taranagarwal.com

Personal site for Taran Agarwal — a single static page, no build step, no dependencies.

## Stack

- One `index.html` (inline CSS + vanilla JS). That's the whole site.
- Styled as a macOS terminal that types itself out on load.
- Deployed to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to `main`.

## Local preview

It's a static file — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4321   # then visit http://localhost:4321
```

## Editing

- **Links / role / name** — edit the `seq` array and the `<template id="links-tpl">` block in `index.html`.
- **Colors** — the `:root` CSS variables at the top of the `<style>` block.
- **Résumé** — drop your PDF at `assets/resume.pdf`; the "resume" links already point there.

## Assets

- `assets/abridge-wordmark.svg` — Abridge wordmark (recolored to white in CSS).
- `assets/resume.pdf` — your résumé (add this).
