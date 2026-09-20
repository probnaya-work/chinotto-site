# Development

The site is a static multi-page Vite build. There is no framework, no client router and no
build-time CSS toolchain.

```bash
pnpm install
pnpm dev        # http://localhost:5174
pnpm build      # dist/
pnpm preview
```

---

## Routes

Each route is an HTML file at the repository root, registered in `vite.config.ts` under
`build.rollupOptions.input`. A file that is not registered is not built.

| URL | File | Note |
|-----|------|------|
| `/` | `index.html` | the record |
| `/manifesto` | `manifesto.html` | in `sitemap.xml` |
| `/privacy` | `privacy.html` | canonical policy URL |
| `/sync`, `/sync/*` | rewritten to `/` | fallback for the desktop pairing QR code |
| `/t/{token}` | rewritten to `api/t/[token].ts` | see [share-hosting.md](share-hosting.md) |
| 404 | `404.html` | served by Vercel |

`vercel.json` sets `cleanUrls: true`, so `/manifesto.html` redirects to `/manifesto`. Routes the old
site published — `/showcase`, `/faq`, `/questions`, `/changelog`, `/notes`, `/updates` — are 301s
to `/`.

---

## Fonts

Archivo (variable) and Geist Mono 400 are self-hosted under `public/fonts/` and preloaded from every
page. Nothing loads from a third-party font origin.

The Archivo file is a Google Fonts `latin` subset with its axes instanced down to the ranges the
design uses — `wght` 400–600, `wdth` 90–100 — which takes it from 90 KB to 39 KB. To rebuild it
after a design change that needs a wider range:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

f = instantiateVariableFont(TTFont("archivo-latin.woff2"),
                            {"wght": (400, 400, 600), "wdth": (90, 100, 100)})
f.flavor = "woff2"
f.save("public/fonts/archivo-var-latin.woff2")
```

Archivo has no Cyrillic. The Russian specimen falls through to the `Archivo Fallback` face in
`src/styles.css`, which maps to a system grotesque and carries `size-adjust` plus ascent/descent
overrides so the substitution does not change the line box. Copy outside Latin-1 needs a look in a
browser before it ships.

---

## Generated assets

Both are committed. Regenerate when the mark or the record changes.

```bash
pnpm icons              # favicon set + apple-touch-icon + favicon.ico
```

`scripts/icons.mjs` rasterises the mark — ring, upper dot, lower dot — with no dependencies: it
supersamples, encodes PNG through `node:zlib`, and wraps PNGs in an ICO container. `public/favicon.svg`
is hand-written and carries its own `prefers-color-scheme` rule.

```bash
pnpm dev                # in one shell
node scripts/og.mjs     # in another
```

`scripts/og.mjs` drives headless Chrome over `scripts/og-template.html` and writes
`public/og-image.png` at 1200×630. The template imports `src/styles.css`, so the share card cannot
drift from the page. It is not a build input, so it never ships. Override the browser with `CHROME`
and the URL with `OG_URL`.

---

## Layout mechanics

`.sheet` is the container query context. Type and spacing scale with `cqw` against its content box,
which is why the record grows with the column rather than the window. `.sheet`'s own padding uses
`svw`, because an element is not its own query container.

`src/record.ts` is the only client behaviour: it recomputes the elapsed values once a second from the
record's real timestamps, and appends one moment when `continue` is pressed. It does not run while
the tab is hidden.

The landing page renders completely without it — the two moments, the lede and the footer are static
markup. The elapsed line is hidden under `.no-js` rather than rendering an empty sentence.

---

## Deployment

Vercel builds this repository and serves `getchinotto.app` from `dist/`, with the `api/` directory
deployed as serverless functions on the same project. Production needs the Upstash Redis variables
in `.env.example` set on the Production environment; the pages themselves need no environment.

Before changing `vercel.json`, read the invariants in [`../AGENTS.md`](../AGENTS.md) — `/sync`,
`/t/{token}` and the `apple-app-site-association` content type are load-bearing for the shipped apps.
