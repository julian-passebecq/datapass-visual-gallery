# Protected Gallery discovery and collections preview — 2026-10-12

**State: DEPLOYED_UNQUALIFIED / draft PR #2. Not a full V1 release.**

## Owner request and product outcomes
The owner asked to finish the next priorities after successful private R2 gallery browsing: validate full-size viewer/selection/JSON export; connect MongoDB reference search; persistent collections and generated image browsing/import; Edge integration.

The live gallery and source remain owned by this product repo. Existing private-media R2 originals and MongoDB reference records were not modified by reference discovery or this deployment.

## Source and build receipt
- Existing feature baseline: `feat/visual-library-full-v1` PR #1.
- Increment branch: `feat/gallery-search-collections-import-v1`, draft PR #2, base existing feature branch.
- **Exact deployed product code:** `a62eac8babc715711be794bb9a8e193bdbcbab2e`, GitHub CI run #47 (`38179269306`) PASS (unit/contract tests, TypeScript, Vite build, Wrangler dry-run and inline Worker bundling).
- Build synthetic PR merge checkout: `9fc3e23a20ad4f8f9898965c11122e8dcb4aa89a`; not the product branch SHA.
- Compiled Worker SHA-256: `af6b20501fa3c75c32c648896969e2caaf42f287635887df2cc60923f78c1617`, 384802 bytes.
- Cloudflare Worker: `datapass-visual-gallery-preview`.
- Live deployment ID: `1bb3be59-3533-4feb-8b37-9def7d71cada`.
- Live version: `8fb54686-0811-49a5-84ac-41f137d1a464`, allocation 100%.
- Protected URL: `https://datapass-visual-gallery-preview.datapass.workers.dev/`.
- **Post-deployment verified bindings:** `PRIVATE_MEDIA=datapass-media`, `WEB_ASSETS=datapass-web-assets`, `CATALOG=a93c349e350d4c36b51e575d266b1474`, plus owner Access audience/issuer/origin.
- Cloudflare Access: one exact-owner allow policy, both public-host and Worker destinations. No bypass configured.

**Additional tests, no redeployment required:** Commit `234784fa9317b3066c32714736e68a89567382bc`, CI run #52 (`38179528784`) PASS. Compared against the deployed product code, only `spec/features.csv`, `spec/ux.csv`, and `tests/library-integration.test.mjs` changed. Thus no post-deployment runtime-code drift. The executable integration tests cover weighted reference matches, missing catalog 503, Access-sub isolated collections, stale If-Match 409, cross-origin rejection, owner-selected private PNG intake and no public-bucket write.

## Private retrieval snapshot provenance
- Mongo Atlas project: `datapass_visual_memory`, cluster `Clusterdatapassvisualmemory`, DB `reference_memory`.
- Existing canonical reference and asset collections were read via the connected Atlas tool, not changed.
- Stored derived private snapshot in EU Workers KV namespace `datapass-visual-gallery-index-v1`, key `catalog-v1`.
- Records: 99 references; 75 with image links; 90 private R2 asset associations.
- Data snapshot timestamp `2026-10-11T22:00:26.548Z`.
- Source snapshot SHA-256 `254a6ec33da653377c4ca0d469a67fcf6a107830f3053224d019983bf6872b51`, 145466 JSON code units (the quoted count is not a byte-length claim).
- The gallery performs **deterministic metadata relevance ranking**, not MongoDB Atlas Search, embeddings, vector similarity or live query. The snapshot can go stale; Mongo remains authoritative. No new Atlas Search indexes created.

## User-facing scope
- Search references by descriptions, visual notes, tags, titles and exact IDs; view linked archived R2 images in protected result cards.
- Named collections with create/rename/add/remove/delete, owner-scoped Workers KV and favorites. KV eventual consistency means optimistic If-Match is not a transactional CAS: concurrent rapid edits across devices need browser QA.
- Selecting images across browsed pages and exporting exact private R2 reference manifest without publishing.
- Explicit PNG/JPEG/WebP/GIF file import (<=8 MiB) with title, purpose and tags into **private** R2 prefix `originals/gallery-import/`; data is marked `PENDING_REFERENCE_INTAKE` in metadata. It is **not** automatically synchronized into Mongo or published to web assets.
- Existing grid/list UI and full-size image viewer were preserved and compile-tested.

## Edge companion, separate product owner
- Repo `julian-passebecq/ms-edge-rust-datapass`; base `feat/personal-command-center-v2` at `a2b49b96fa2976793278d0420877df40de4731b3`.
- New isolated branch `feat/visual-library-edge-entry-v1`; draft PR #4, code head `3b668ab7507349d32dd4e0f356d0f2281bc73048`.
- Adds explicitly clicked sidebar launcher opening the protected gallery in Edge using existing tabs permission. Does not change host permissions, page scraping, dashboard, workspace data, Rust bridge or background behavior.
- GitHub Actions run #11 (`38179172066`): **SUCCESS** in extension, Rust, Windows-native and synthetic-browser jobs. This is CI, not local Windows Edge installation qualification.

## Real browser and release gates still open
The user previously confirmed the older gallery renders real thumbnails (114 media loaded). The newly deployed search/collections/import flows and current Edge launcher **have not been checked in the owner's authenticated Windows/Edge browser**. No automated real owner session was accessible.

Test this sequence on the protected URL: hard-refresh; search 'agent cockpit' and verify the returned reference IDs/images; select two images, create a named collection with them, refresh and verify persistence; export JSON; import one local saved/generated PNG and verify it appears in Generated & imported, without public publication; open an image in full-size. Check anonymous/unauthorized denial on root and exact media routes. For Edge, install/reload the PR4 extension branch on Windows and click the new launcher.

Remaining explicit V1 gaps in `spec/features.csv` and `spec/ux.csv`: no automated snapshot refresh/live Atlas Search, cross-device conflict robustness not proven, no optimized thumbnails, image creation ingestion still needs normal Mongo intake, no selected-image public-publishing approval workflow, no qualified installed Edge extension, no actual owner-browser authorization-negative test. Preserve all IDs and outstanding decisions. No main merge.

## Publication boundary
All implementation, tests, and release evidence are on review branches only. Private media bytes, Access JWTs, Cloudflare API tokens, signed URLs and raw conversations are not published to Git. Remote ChatGPT cannot attest `D:\PROJ`.
