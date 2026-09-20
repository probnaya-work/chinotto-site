# AGENTS.md — working context for the Chinotto website

Chinotto is an instrument of PROBNAYA, an independent computational laboratory. PROBNAYA is the
maker and the repository owner; Chinotto keeps its own product identity, and laboratory-wide
repository conventions are recorded in `probnaya-work/.github` (`PROBNAYA.md`).

This repository is the website only. It is not the desktop app, not a web version of the product,
and not a CMS.

## Commit convention

`type(scope): imperative subject`, optional body. Types: `feat` | `fix` | `refactor` | `perf` |
`chore` | `docs` | `style` | `test` (`ci` is not used here — use `chore`). One logical change per
commit; if the subject needs “and”, split it. Imperative and present tense, lowercase after the
colon, no trailing period, ~72 chars. No vague subjects (“fix bug”, “update stuff”) and no filler
(“WIP”, “quick”, “small”, “hopefully”). Scope only when it locates the change (`landing`, `og`,
`share`, `icons`). The full version, with granularity rules and examples, is
[`docs/commit-convention.md`](docs/commit-convention.md).

---

## Architecture

A static multi-page Vite build. One HTML file per route, one stylesheet, one TypeScript module.

```
index.html      the record (landing)
manifesto.html  content page
privacy.html    content page
404.html        not found
src/styles.css  every style on the site
src/record.ts   the only client behaviour
api/            Vercel serverless functions for share hosting — unrelated to the pages
```

There is no framework, no client router, no runtime dependency and no build-time CSS toolchain.
`dependencies` exist only because `api/` needs them at runtime on Vercel.

**Adding a route means adding an HTML file and registering it in `vite.config.ts`
`build.rollupOptions.input`.** A file that is not registered is not built.

## Invariants

These break production if changed carelessly. Verify before touching them.

- **`/t/{token}` must keep resolving.** The desktop app publishes share snapshots to
  `POST /api/threads` and hands people `getchinotto.app/t/{token}`. Live links already exist. See
  [`docs/share-hosting.md`](docs/share-hosting.md).
- **`/sync` must return 200.** The desktop app renders `https://getchinotto.app/sync?ds=<uuid>` as a
  pairing QR code. On iOS the universal link opens the app; everyone else lands on this site, so the
  `vercel.json` rewrite to `/` is the fallback and must stay.
- **`public/.well-known/apple-app-site-association` must be served as `application/json`** for those
  universal links to resolve. The `vercel.json` header does that.
- **`/privacy` and `/manifesto` are published URLs.** They are in `sitemap.xml`, linked from the site
  footer, and `/privacy` is the canonical policy URL referenced by the apps' store listings.

## The record

The landing page shows one real specimen: a moment left on **27 mar 2026 · 18:12** and carried over
on **30 mar 2026 · 13:29**. Both fragments are maintainer-set text. Do not correct, translate or
normalise either of them — the Russian line reads the way it reads on purpose.

`src/record.ts` computes every elapsed value from those timestamps against the local calendar. None
of it is decorative — do not replace a computed interval with a fixed string.

`continue` appends exactly one moment dated now and then removes itself. The two carried-over
moments never move; that is the point the page makes.

## Typography

Archivo (variable, `wght` 400–600 and `wdth` 90–100) and Geist Mono 400, self-hosted under
`public/fonts/` and preloaded. The axis ranges are instanced down to what the design uses, which is
why the files are 39 KB and 10 KB rather than 176 KB.

**Archivo carries no Cyrillic.** The Russian specimen renders in `Archivo Fallback` — a `local()`
face with `size-adjust` and ascent/descent overrides that hold Archivo's line box so the fall-through
costs no layout shift. If you add copy outside Latin-1, check it in a browser.

Sizes scale with `cqw` against `.sheet`, which is the query container. `.sheet`'s own padding uses
`svw` because an element is not its own container.

## Generated assets

Both are committed; regenerate them when the mark or the record changes.

```bash
pnpm icons      # favicons, apple-touch-icon and favicon.ico from the mark — no dependencies
pnpm dev        # in another shell, then:
node scripts/og.mjs   # public/og-image.png, captured from scripts/og-template.html
```

`scripts/og-template.html` borrows `src/styles.css` so the share card cannot drift from the page. It
is not a build input, so it never ships.

## Verification

```bash
pnpm build          # must stay under ~10 kB of CSS and ~4 kB of JS
pnpm typecheck      # site
pnpm typecheck:api  # api/
pnpm test:share     # api/lib
```

The site has no test suite; it is small enough that the check is a browser. When changing layout,
look at 375px and 1440px and confirm `document.documentElement.scrollWidth` equals `clientWidth`.

## What to avoid

- Adding a framework, a CSS toolchain, a component library or a client router.
- Adding a runtime dependency to the pages. `dependencies` are for `api/` only.
- Inventing product copy. Claims must be supported by the shipped apps — Chinotto runs on macOS and
  iOS; **Android is built but not released**, and the footer says so rather than linking a store.
- Marketing sections, pricing, testimonials, newsletter forms.
- Blocking scripts, web fonts from a third-party origin, or anything that shifts layout on load.
