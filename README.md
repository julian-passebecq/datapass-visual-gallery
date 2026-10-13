# DataPass Visual Library

Private, full-screen React gallery for browsing archived DataPass references and approved web assets stored in Cloudflare R2. **ChatGPT.com execution scope, review branch only.** No production deployment performed merely by publishing code.

## Preview deployment (2026-10-11)

An owner-only preview was deployed directly through the connected Cloudflare Worker API at **https://datapass-visual-gallery-preview.datapass.workers.dev/**. Cloudflare confirmed R2 bindings and Access policy; the actual logged-in browser UX is still unverified. The review branch has **not** been merged, and full V1 acceptance is incomplete. Deployment receipt: [`docs/releases/PREVIEW-20261011.md`](docs/releases/PREVIEW-20261011.md).

## Enhanced protected preview — search, collections and import

The review branch `feat/gallery-search-collections-import-v1` adds weighted **Mongo-derived metadata search** (not vector embeddings, not a live MongoDB query), owner-scoped saved collections/favorites and owner-triggered private image imports. The Cloudflare preview is deployed, and both the backend integration tests and Worker bundle checks passed. User-browser acceptance remains open. The earlier successful screenshot established base R2 thumbnail rendering only.

- [Deployment, provenance, CI and outstanding qualification](docs/releases/PREVIEW-20261012-SEARCH-COLLECTIONS.md)
- [Gallery review PR #2](https://github.com/julian-passebecq/datapass-visual-gallery/pull/2)
- [Companion Edge launcher review PR #4](https://github.com/julian-passebecq/ms-edge-rust-datapass/pull/4)

## Latest protected preview — comparison and bounded loading

A review-only update adds **two-image compare**, zoom, compact/large card sizes and bounded R2 pagination. CI run #85 passed both Worker qualification and synthetic Chromium interaction checks; current owner-only Cloudflare preview is deployed at the same URL. Real archive comparison and anonymous-access browser testing remain pending, and full-size originals are still downloaded as images become visible. No new Cloudflare Images subscription was activated. [Latest release receipt](docs/releases/PREVIEW-20261012-COMPARE-PAGINATION.md).

## Reference Feed — protected preview (2026-10-13)

The gallery now has **Reference feed** beside the existing grid. An expandable left tree groups the **113 currently indexed MongoDB references** by Domains → Topics → Tags, Projects → Domains → Topics, Purposes and Scopes. The hierarchy is a non-destructive multi-label view of original MongoDB fields, not stored folders. The main feed shows chronological reference cards, linked private images and text/link-only research.

Current owner-only preview: **https://datapass-visual-gallery-preview.datapass.workers.dev/**. The code passed CI #105 (including synthetic browser tests) and the protected Worker is deployed; the owner still needs to verify it in real Edge. Existing media grid, comparisons, saved Collections and imports remain available.

The Mongo projection is read-only and stored privately in Cloudflare KV; it is **not a continuously live Atlas connection**. Latest deployment and source evidence: [Mongo Feed receipt](docs/releases/PREVIEW-20261013-MONGO-FEED.md), [draft PR #3](https://github.com/julian-passebecq/datapass-visual-gallery/pull/3).

## Product

- Responsive grid/list library and full-size viewer, source filters, safe server-side R2 listing and filename/path search.
- Multi-select, favorites, persistent local browser basket, exportable selection manifest with provenance.
- Private `datapass-media` and approved `datapass-web-assets` remain separate. **No public publishing, move, deletion or rename endpoints.** A new owner-authenticated, classified image-import endpoint writes exclusively to private R2 and marks items pending canonical MongoDB reference intake.
- Cloudflare Worker authenticates every request against a verified Cloudflare Access JWT, including static assets and originals. Missing/invalid Access configuration fails closed.
- Existing public website-assets R2 binding remains read-only; private R2 supports only explicit authenticated image intake in addition to browsing. No credentials, Access tokens or original private images are committed to this public repository.

## Local development and verification

```sh
npm install
npm test
npm run check
npm run build
```

`npm run dev` runs the standalone Vite interface. It needs the protected Worker to supply `/api/media` and `/api/file/:source/:key`; locally use Wrangler for integrated testing after configuring Access. Empty search is not a demo or mock data feed.

## Cloudflare deployment — explicit operator gate

1. Confirm Access policy is scoped to the owner and creates a Worker-protected application. Access should cover **production and preview Worker domains**. No unauthenticated public alias.
2. Set `ACCESS_TEAM_DOMAIN` to the exact https://<team>.cloudflareaccess.com issuer and `ACCESS_AUD` to the protected application's audience. Configure `PUBLIC_ORIGIN` for a single allowed deployment origin.
3. Verify the two R2 buckets and Worker bindings and that no public exposure of `datapass-media` is enabled.
4. Run tests, typecheck and build, then deploy via `npm run deploy` once access is enforced.
5. Test real authenticated user flow: thumbnails load, select/deselect, full-size view, private URLs require authentication, missing/wrong JWT returns 401, selected JSON export and source isolation.

Do not deploy unless these gates are all met. No Mongo connection strings are needed to browse by R2 key.

## Source boundaries and limitations

MongoDB `reference_memory` remains the source of the semantic reference catalog. This branch **does not** access private MongoDB from the public browser or attempt to clone Mongo metadata into public Git; semantic search remains a separate authenticated adapter contract. R2 browsing finds archived images by their keys/filenames today. Generated images appear only after a separate authorized ingest to their correct bucket. Favorites and selected basket are currently browser-profile local, not shared across devices. Public publishing and Windows/Edge capture are separate authorized actions. These are disclosed limits, not silent claims of complete implementation.

The existing Edge extension `ms-edge-rust-datapass` is unchanged; an additive, separately reviewed integration can open the library in a tab and later expose search after explicit extension permission qualification. Windows profile, ChatGPT login and Cloudflare Access behavior must be tested on the actual client.

See `docs/START.md`, `spec/features.csv`, `spec/ux.csv`, and `docs/CONTRACTS.md`.
