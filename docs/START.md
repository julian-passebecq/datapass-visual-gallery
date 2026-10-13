# Visual Library — START
TARGET=CHATGPT.COM for this bounded initial implementation, independent of Codex/Claude native sessions.
Owner-provided scope: 2026-10-09, datapass-visual-gallery and Cloudflare. Product repo owns code, CSV acceptance and release evidence. The Galaxy hub is a source router, not another implementation store.

Baseline: main 8e071a969c683682095f2a7bad0f6d376c184e00; isolated branch feat/visual-library-full-v1. No local Windows claim and no production merge. Source rules: galaxy-knowledge-csv/PROJECT_INSTRUCTIONS.md, galaxy-hub/START.md and sources.json. Cloudflare R2 buckets datapass-media/datapass-web-assets and existing datapass-media-mcp reused; no migration and no bulk reads. Access and deployment are separate gates.

Acceptance owner: spec/features.csv and spec/ux.csv. Current implementation includes React gallery, read-only authenticated R2 gateway, browser-local selection, favorites and manifest export. It lacks server-backed semantic Mongo retrieval, image ingestion and Edge integration; gates remain OPEN, not passed.

Immediate evidence needed: npm install/test/check/build, Cloudflare Access policy and JWT configuration, authenticated R2 user journey, CI at exact SHA. Expected time to qualify depends on Cloudflare Access app/permissions and Windows browser state, roughly 2-6h additional for available credentials and stable service, low confidence. Complete envisioned cross-app integration may take 1-3 days beyond that, moderate uncertainty. No token quota or billing assumption.

## Latest Cloudflare preview (2026-10-11)
Cloudflare protected preview Worker and inlined React assets are deployed, not yet user-qualified. See `docs/releases/PREVIEW-20261011.md` for exact hashes, CI and deployment IDs, Access bindings and known acceptance gaps. The old 503 placeholder was replaced on 2026-10-11. Do not mark V1 complete until real authenticated visual and negative-access journeys and remaining V1 features pass.

## Selected gallery V1 expansion (2026-10-12)

TARGET=CHATGPT.COM executed review-only changes with the owner-granted gallery and Cloudflare scope. Separate latest increment branch is `feat/gallery-search-collections-import-v1` / draft PR #2. New Cloudflare preview version and metadata-catalog provenance are pinned in `docs/releases/PREVIEW-20261012-SEARCH-COLLECTIONS.md`. That receipt supersedes the earlier deployment state for the preview, without replacing its original release history.

The selected expansion implements metadata-ranked **read-only snapshot search** from MongoDB, authenticated persistent named collections/favorites, cross-page selection manifests and private owner-triggered image imports. Exact-SHA CI and Cloudflare binding checks have passed; no user-browser interaction verdict or full V1 qualification has been established. Mongo remains source owner; KV is a private generated projection; imported files are staged for formal reference intake.

The independent Edge extension integration is on `julian-passebecq/ms-edge-rust-datapass` draft PR #4, based on the latest personal-command-center branch; its CI includes Windows, Rust and browser smoke. The owner's installed Edge extension is not remotely qualified. No forced merge, new public media, Atlas schema/index writes or unapproved full-release declaration.

## Viewer and listing quality increment (2026-10-12)
Review source `7a9f4a80584b1e0d163a945b131bd7f16cd2532b` qualified in GitHub CI #85 with synthetic Chromium and deployed to the owner-only Cloudflare preview. Exact SHA / hash / security / pending acceptance: `docs/releases/PREVIEW-20261012-COMPARE-PAGINATION.md`. This increment adds read-only image comparison / zoom / card-size options and fixes R2 pagination so the first page does not unexpectedly fetch the full archive. It does not generate smaller image bytes; Cloudflare Images subscription was not authorized and was not added. Owner browser and V1 gates remain open.


## MongoDB-derived feed view (2026-10-13)
TARGET=CHATGPT.COM review branch `feat/gallery-mongo-feed-tree-v1`, draft PR #3. Qualified runtime source `e0c0e757497f57b5fc4b75f4c3419ed7e318ce1c` passed GitHub Actions #105 including synthetic Chromium navigation. Existing protected Cloudflare preview version `dc4263a5-34f3-48b8-a9c1-6b02aba94438` is verified active at 100%. Source-backed MongoDB catalog refreshed from 99 to 113 records, with old snapshot backed up in private KV; authoritative Atlas collections are unchanged. New separate Feed page and VS Code-style collapsible classification tree use existing Mongo domain/route/purpose/scope/topic/tag fields as overlapping virtual facets, not stored folders. Full evidence, privacy boundaries and remaining acceptance gates: `docs/releases/PREVIEW-20261013-MONGO-FEED.md`. Owner-authenticated real Edge inspection remains required; gallery main and Edge companion remain unmerged.


## Current protected preview UX patch (2026-10-13)

On the existing `feat/gallery-mongo-feed-tree-v1` / draft PR #3, tested runtime `5b5e421d32ecb0e3cc7a94e2f681030ce3dea2b5` (GitHub CI #163 PASS) is deployed to the existing owner-only Cloudflare preview. The follow-up makes root Domain/Project/Purpose/Scope clicks open source-derived facet overviews, uses four compact reference cards per row by default, and adds collapsed clickable Mongo tags with AND filtering and an explicit Clear filters action. See `docs/releases/PREVIEW-20261013-MONGO-FEED.md` for the bundle hash, deployment version, CI evidence, original snapshot source and real Edge acceptance gaps. This patch changes no canonical Mongo records, original R2 assets, Edge installation or authorized public-publishing state.

## Current image-first gallery patch (2026-10-13)

The owner screenshot-driven UX correction reduces reference card chrome and emphasizes the original private image; the card metadata and tags are now collapsible, and an enlarged hover/focus preview appears on desktop without opening the viewer. Runtime SHA `b8bb2e9181fb917b7cb2631c9bce88f1e0421eb7` passed CI #178 and is active on the same owner-only Cloudflare preview. The canonical release evidence and remaining real Edge/readability gates are in `docs/releases/PREVIEW-20261013-MONGO-FEED.md`. PR #3 remains an unmerged draft. No new image store, public private-media URL or direct Mongo write.
