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
