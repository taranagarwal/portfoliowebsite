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
- `assets/blog/` — images uploaded from the blog editor land here.

## Blog (`/blog`)

A static, git-backed blog in the same theme. No backend, no database.

```
blog/
├── index.html          # public post list (reads posts.json)
├── posts.json          # manifest: [{slug, title, date, tags, readingTime, excerpt}]
├── posts/<slug>.md     # markdown source of each post (frontmatter + body)
├── <slug>/index.html   # pre-rendered, self-contained post page (good SEO)
└── editor/index.html   # owner-only WYSIWYG editor
```

**How it works**
- Posts are markdown files committed to this repo. Each is also pre-rendered to a standalone `<slug>/index.html` at publish time, so the public pages are plain static HTML.
- The blog index reads `posts.json` and lists posts.

**Editor — `/blog/editor`** (owner-only)
- WYSIWYG editor that serializes to markdown; live markdown shown alongside.
- Drag-and-drop / button image upload → committed to `assets/blog/`.
- Publishing commits the `.md`, the rendered page, an updated `posts.json`, and any images in one atomic commit via the GitHub Git Data API, then the normal deploy ships it (~30–60s).
- **Auth:** there is no server, so "owner-only" = you hold a GitHub token. Paste a **fine-grained PAT** (repo: `taranagarwal/portfoliowebsite` only, permission: *Contents → Read & write*). It's stored in your browser's localStorage, never committed. Without it the editor can't write anything. The editor page is `noindex`.

**Create a post:** go to `/blog/editor`, unlock with your PAT, write, hit **Publish**.
