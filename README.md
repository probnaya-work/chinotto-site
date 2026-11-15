PROBNAYA / CHINOTTO
INSTRUMENT

Independent Computational Laboratory

# Chinotto

A private record of thoughts, encounters, and what continues between them.

Chinotto web is the public website for Chinotto at [getchinotto.app](https://getchinotto.app).

The same deployment serves `/sync`, the universal link used to pair Mac and iPhone.
It also keeps `/t/{token}` and its API for snapshots published by earlier desktop versions.
The current Record does not create public share links.

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
- [Legacy snapshot hosting](docs/share-hosting.md) — compatibility for earlier `/t/{token}` links
- [Commit convention](docs/commit-convention.md)
- [AGENTS.md](AGENTS.md) — working context for coding agents

## Related

- [Chinotto desktop](https://github.com/probnaya-work/chinotto) — Mac app
- [Chinotto mobile](https://github.com/probnaya-work/chinotto-mobile) — iOS companion
