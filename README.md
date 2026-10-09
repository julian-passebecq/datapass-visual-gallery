# DataPass Visual Library

Private, full-screen React gallery for browsing archived DataPass references and approved web assets stored in Cloudflare R2. **ChatGPT.com execution scope, review branch only.** No production deployment performed merely by publishing code.

## Product

- Responsive grid/list library and full-size viewer, source filters, safe server-side R2 listing and filename/path search.
- Multi-select, favorites, persistent local browser basket, exportable selection manifest with provenance.
- Private `datapass-media` and approved `datapass-web-assets` remain separate. **No public publishing, upload, move, deletion or rename endpoints.**
- Cloudflare Worker authenticates every request against a verified Cloudflare Access JWT, including static assets and originals. Missing/invalid Access configuration fails closed.
- Read-only Cloudflare R2 bindings; no user credentials or raw private images in this public GitHub repository.

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
