# Protected preview — static asset response fix (2026-10-11)

Status: **DEPLOYED_UNQUALIFIED — browser retest required**. This is an additive fix to `PREVIEW-20261011.md`, not a declaration of V1 release completion.

## User-observed failure
Owner's screenshot of the authenticated Edge page showed binary/compressed characters at the top of an otherwise blank page instead of the React gallery. No screenshot bytes or browser metadata are stored in public Git.

## Root cause and scoped fix
The connector packaging script embedded **gzip-compressed Vite HTML/CSS/JS** but returned compressed bytes directly in `Response` with a `Content-Encoding: gzip` header, a response path that did not decode as intended in the actual browser. The corrected package embeds the **original uncompressed asset bytes** as base64 and returns them with the original MIME type **without** a Content-Encoding header. Existing Worker authorization and Cloudflare Access handling are preserved.

Added a regression test rejecting gzip response headers and a packaging check for real HTML and asset bytes. No image originals, R2 objects, Mongo data, secrets, Edge extension, or public publishing scope were changed.

## Verified revisions and deployment
- Product feature branch: `feat/visual-library-full-v1`
- Tested product code head: `57a05c7ec50c093b7dd575491c893eb7e86c93d0`
- GitHub Actions: run #28, ID `38161991743`, **SUCCESS** (tests, TypeScript, Vite build, Wrangler dry-run, connector packaging).
- CI checkout synthetic pull-request merge SHA: `cc5d16ad84800a4c4ac76448ef8d8d8bb7535a39`.
- Compiled Worker SHA-256: `d082f54d47dae8494bdd17ad7365ac86e2eaa77f9980521cf9af8603eee8fd5c` (`353793` bytes).
- Cloudflare Worker `datapass-visual-gallery-preview`, upload accepted by authenticated API.
- Deployment ID `066e4b6d-7910-44ef-b984-0f7913dacd71`, version ID `d8f3deff-3adf-4624-9027-f6ac0b1728fe`, 100% allocated.
- Protected URL: `https://datapass-visual-gallery-preview.datapass.workers.dev/`
- Independently verified via Cloudflare API: exact owner-only Access policy, both hostname and Worker destinations; `PRIVATE_MEDIA` bound to `datapass-media`; `WEB_ASSETS` bound to `datapass-web-assets`.
- External unauthenticated HTTP fetch was not possible from this environment (DNS resolution failed); **do not** report that as a passed negative-access test.

## Acceptance request
Owner should press **Ctrl+Shift+R** in Edge to bypass the previous cached response, then confirm that the gallery UI and private reference thumbnails render. Test lightbox, selections and export. If there is still an error, capture a new browser screenshot and check the Network tab for status and Content-Type of `/` and `/assets/*.js`.

This fixes the first-observed display bug only. Mongo semantic search, persistent cross-device collections, optimized thumbnails, image intake, selected-item publication, Edge extension integration and full browser/security qualification remain open per `spec/features.csv` and `spec/ux.csv`.
