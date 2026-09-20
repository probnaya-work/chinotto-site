PROBNAYA / CHINOTTO
INSTRUMENT

Independent Computational Laboratory

# Chinotto

A private record of thoughts, encounters, and what continues between them.

Chinotto web is the public website for Chinotto at [getchinotto.app](https://getchinotto.app).

The same deployment carries two surfaces the apps depend on: the share read URLs
the desktop app publishes at `/t/{token}`, and `/sync`, the universal link the
desktop app renders as a QR code when pairing with mobile.

**Stack:** Vite · plain HTML and CSS · one TypeScript module. No framework, no
runtime dependencies, no CMS.

## Development

```bash
pnpm install
pnpm dev
```

Build, typecheck and test:

```bash
pnpm build
pnpm typecheck
pnpm typecheck:api
pnpm test:share
```

## Documentation

- [Development](docs/development.md) — routes, fonts, generated assets, what must not break
- [Share hosting](docs/share-hosting.md) — the `/t/{token}` API on `getchinotto.app`
- [Commit convention](docs/commit-convention.md)
- [AGENTS.md](AGENTS.md) — working context for coding agents

## Related

- [Chinotto desktop](https://github.com/probnaya-work/chinotto) — Mac app
- [Chinotto mobile](https://github.com/probnaya-work/chinotto-mobile) — iOS companion
