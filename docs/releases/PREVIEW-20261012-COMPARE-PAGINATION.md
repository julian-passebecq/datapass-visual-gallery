# Visual Library V1 — comparison and bounded listing checkpoint
Date: 2026-10-12 (UTC).
Status: **DEPLOYED_UNQUALIFIED**. This document is an additive evidence receipt; full V1 remains open.

## Scope selected by owner
Continue the existing DataPass Visual Gallery without a second image store, standalone extension or new paid service. Keep original private R2 images and the MongoDB source owner intact. Deliver browser-usable comparison / zoom, card-size controls, and correct bounded R2 listing to improve an archive of narrow screenshots. This is a focused incremental patch, not a new general product audit.

## Canonical owner and revisions
- Product repository: `julian-passebecq/datapass-visual-gallery`.
- Review branch: `feat/gallery-search-collections-import-v1`, draft PR #2, based on `feat/visual-library-full-v1`.
- **Qualified/deployed product source SHA:** `7a9f4a80584b1e0d163a945b131bd7f16cd2532b`.
- GitHub Actions run #85 `38261456579`: **SUCCESS**; `qualify` job `114852720505` PASS, `synthetic-browser` job `114852720719` PASS.
- Synthetic CI checkout SHA: `508c5f21083954d383d6cbd8e94ca5bb96639e3d` (not product source SHA).
- Deployable Worker SHA-256: `1aa4f17e02e0699924077ecbb274010e4ba13e5bfdb07b30873a5a8ecfa7d855`; 401840 bytes.
- Cloudflare Worker `datapass-visual-gallery-preview`, deployment `5fc0aaec-5c3d-4232-a865-ac1e760800dc`, active version `8ed6c0e6-a433-4203-bd04-32781f335c85` allocated **100%**, timestamp `2026-10-12T14:16:24Z`.
- Owner-protected website: `https://datapass-visual-gallery-preview.datapass.workers.dev/`.
- Post-deploy verified: exact-owner Cloudflare Access with Worker destination, private `datapass-media` R2, `datapass-web-assets` read-only R2, existing private `CATALOG` KV binding. No public exposure or new entitlement.

## Implemented and tests
- Worker R2 listing emits no more than requested per-page limit (1–100). Opaque continuation cursor includes current source/page and intra-page offset, rejects source/query mismatch, and scans a bounded eight upstream R2 pages per call. The previous implementation could append an entire bucket page exceeding the requested UI limit.
- Executable Node tests `tests/r2-pagination.test.mjs`: 251-image pagination no duplicates; R2 private/public transition; sparse filename searches; cursor integrity; generated-image namespace; unauthenticated root/media denial.
- Read-only two-image comparison modal via `src/CompareViewer.tsx` with independent provenance labels, zoom, remove/copy/open-original controls. No R2 writes for comparison or selection.
- Full-size image viewer gains zoom controls, reset and next/previous navigation. Grid gains compact/comfortable/large density presets; local preference saved to browser profile.
- Card thumbs remain lazy loaded and asynchronously decoded; CSS off-screen rendering avoids unnecessary painting.
- **Synthetic Chromium interaction job** with entirely fabricated images tests comparison, zoom, selection-manifest download, cross-reload collections, reference search and private-image intake UI. Screenshots in CI artifacts are synthetic, not archive dumps.
- Original legacy favorites retention, source classifications, Mongo-derived read-only metadata search and owner-only Access are preserved.

## Not claimed / explicit limitations
- **Real thumbnail transformation is NOT implemented.** R2 originals are still transferred when an image enters the viewport. Cloudflare Images binding requires a subscription and bills unique transformations. No paid binding or public private-image URL was added.
- Owner browser (real Windows Edge), actual archive comparison performance, full-size handling and anonymous negative checks are not yet qualified. Synthetic browser success is not a private-media end-to-end test.
- Mongo reference snapshot refresh is still manual; source remains `reference_memory`. Automated Mongo ingest for new generated images, cross-device strong transactional collection concurrency, controlled publication/rollback and broader Edge extension installation remain open in canonical V1 CSVs.
- No `main` merge, public media publication, duplicate gallery, credential exposure or Windows qualification claim.

## User smoke check
1. Hard refresh authenticated protected URL in Edge.
2. Initial grid should now display **up to 80 media** with **Load more** for additional objects; full archive still browsable.
3. Select **Card size: Large**, queue two images with **Compare**, open **Compare now**, test zoom and close.
4. Open an image normally, test zoom and next/previous; verify selected items and favorites remain unchanged.
5. Search `agent cockpit` to inspect reference matches, and use Collections, Import and Export if available.
6. Anonymous private-image denial requires a separate signed-out browser/network test before acceptance.

The current outcome is qualified code and verified private preview deployment. Product V1 remains incomplete and both gallery and Edge PRs remain draft.
