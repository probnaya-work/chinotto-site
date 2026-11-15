# Legacy snapshot hosting (`getchinotto.app`)

Compatibility routes for snapshots published by earlier Chinotto desktop versions. The current
Record does not create public share links. Anyone with an unexpired link can read its snapshot;
these are not authenticated private Records. The Vercel routes remain alongside the product site
so earlier links keep resolving.

Contract matches `chinotto-app` → `docs/internal/sharing.md` (Slice 2).

---

## Routes

| URL | Handler | Method |
|-----|---------|--------|
| `/api/threads` | `api/threads/index.ts` | POST — store HTML snapshot |
| `/api/threads/{token}` | `api/threads/[token].ts` | DELETE — revoke |
| `/t/{token}` | `api/t/[token].ts` (via rewrite) | GET — serve HTML |

POST body (JSON, camelCase):

```json
{
  "token": "uuid-v4",
  "html": "<!DOCTYPE html>…",
  "expiresAt": "2026-07-08T12:00:00Z",
  "contextNote": "optional"
}
```

Responses: **201** create, **204** delete, **404** missing/expired, **400** validation error.

GET returns stored HTML with `noindex`, `Cache-Control: private, no-store`.

---

## Storage

- **Production:** [Upstash Redis](https://vercel.com/marketplace/upstash) on Vercel (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`). Legacy `KV_REST_API_*` env names also work. Keys `share:thread:{token}` with TTL through `expiresAt`.
- **Local `vercel dev` without Redis:** in-memory store (single process; not for production). Response header `X-Chinotto-Share-Store: memory`.

---

## Deploy

Same Vercel project as **getchinotto.app** — no extra domain. API routes do not affect `pnpm build` (static `src/` only).

1. Upstash Redis connected; env vars on **Production**.
2. Push → deploy.
3. Smoke test: `POST https://getchinotto.app/api/threads`, `GET https://getchinotto.app/t/{token}`.

```bash
pnpm install
vercel dev
pnpm typecheck:api
pnpm test:share
```

---

## Privacy

- No analytics on share routes.
- No index (`X-Robots-Tag`, `robots` meta in HTML from desktop).
- Data deleted on revoke or TTL expiry.
- Desktop remains source of truth; server holds snapshot copy only.
