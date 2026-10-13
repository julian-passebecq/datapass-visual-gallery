# Private MongoDB reference feed — 2026-10-13

Status: **DEPLOYED / SYNTHETIC-QUALIFIED / REAL-BROWSER PENDING**. This is a focused selected increment, not a full-V1 release or approval to merge.

## Owner intent
Build a Flus-inspired stream of archived references and images (not conversations/chat messages) plus a VS Code-style collapsible three-level category sidebar. Use the classifications already stored in MongoDB rather than inventing a new taxonomy or migrating stored media.

## Canonical source and publication
- Product repository: `julian-passebecq/datapass-visual-gallery`.
- Branch: `feat/gallery-mongo-feed-tree-v1`, **draft PR #3**, based on gallery PR #2 branch `feat/gallery-search-collections-import-v1` head `eaa0afabc721767a5bc0f07b3c9f65e33ef769ed` at preflight.
- **Qualified runtime code SHA:** `e0c0e757497f57b5fc4b75f4c3419ed7e318ce1c`.
- GitHub Actions run #105 / ID `38424110997`: **SUCCESS** in `qualify` (job `115388839239`) and `synthetic-browser` (job `115388839046`). Tests include the Mongo taxonomy/path/filter/cursor security contracts and a Chromium journey navigating feed/categories and opening a private-media mock.
- CI synthetic PR checkout SHA: `41736f89530bf6288a0acc081a5cd9d645b90884`, distinct from runtime product SHA.
- Compiled Worker SHA-256: `63a1551b8eb701ef41567f5aeededf0b8dd0dfadc58a1b8a30b48722029be9f9`, 432158 bytes.
- Existing protected Cloudflare Worker: `datapass-visual-gallery-preview`.
- **Verified deployment:** `2d82c9a8-c5ae-405f-a929-e698fe97a30a`, version `dc4263a5-34f3-48b8-a9c1-6b02aba94438` at **100%** allocation.
- URL: `https://datapass-visual-gallery-preview.datapass.workers.dev/`.
- Cloudflare Access: one existing single-owner allow rule, protecting both Worker and hostname destinations. Verified after deployment.
- Bindings verified unchanged: `PRIVATE_MEDIA` → `datapass-media`, `WEB_ASSETS` → `datapass-web-assets`, `CATALOG` → existing private EU KV namespace.

## Private data provenance
- MongoDB Atlas project `datapass_visual_memory`, cluster `Clusterdatapassvisualmemory`, database `reference_memory`, collections `references` and `assets`: **read-only inspection**.
- Retrieved 113 unique references and 99 asset records at the observed source revision. Every reference has classification metadata.
- Snapshot `catalog-v1` in existing private Cloudflare KV refreshed to 113 references; 89 references have archived media and there are 108 media associations after merging approved prior snapshot associations.
- Private snapshot SHA-256 `f326f946597aa8e04acd1bca90eabcf4cd221ab903e7d3c0953ad7be25700248`, 181680 UTF-8 bytes, generated `2026-10-13T15:45:12.067Z`.
- Previous 99-record snapshot backed up privately as `catalog-v1-before-feed-20261013` before cutover and reread verified at 113.
- MongoDB remains the source owner; KV is a pinned/generated read-only retrieval projection plus unrelated owner-owned collection state. No Atlas writes, schema changes or new indexes. **Refreshing the snapshot is manual, not continuous synchronization**.

## Implementation and UX
- New authenticated `GET /api/taxonomy`: complete bounded reference-classification index derived from domains, routes/projects, purposes, scopes, topics and tags. Category branch counts count unique references within each path. References may appear in multiple branches because MongoDB fields are multi-label facets, not actual parent-child folder relationships.
- New authenticated `GET /api/feed`: newest/oldest ordering, 24-per-page default, bounded pagination, descriptive keyword search, archive-only filter, exact filter-path intersection and 409 on stale/mismatched cursor. Returned cards preserve source IDs, dates, titles, summaries, source kinds, optional trusted HTTPS source links and authenticated private R2 references. Link-only references are also represented.
- New `Reference feed` navigation and collapsible tree sidebar. Branches: Domain → Topic → Tag; Project → Domain → Topic; Purpose → Domain → Tag; Scope → Domain → Topic. No authored taxonomy or extra database.
- Image-rich chronological cards include screenshot thumbnails, provenance, selected-image action, link to public source where available and archive count. Existing media grid, viewer, comparison, collections, favorites and import UI preserved; no automatic private-to-public publishing.
- Accessible buttons, nested expansion/collapse labels, category search and responsive layout. Feed is **not a ChatGPT/Claude transcript viewer**.

## Qualification limits and release gates
- Real owner-authenticated Windows Edge feed, tree and archived image navigation remain **UNKNOWN**, not PASS. Anonymous negative test of deployed static/media/feed routes still requires supported signed-out browser interaction; the Worker code rejects missing Access JWT and Cloudflare Access destinations/policy were verified.
- Snapshot renewal is currently explicit/manual. Future ingestion-triggered synchronization needs separate approved connector ownership; no unapproved scheduler created.
- User-custom named dynamic feeds/AND–OR–NOT rules were not added; existing saved Collections remain the manual curation surface. An automatic folder is a multi-label classification view rather than a destructive move.
- Complete V1 still has unrelated open gates (optimized actual thumbnails, full Mongo intake for generated media, selected public publishing, Edge companion qualification and real user journey).
- No main merge, public raw images, secrets, signed R2 URLs, unrelated repo changes, new paid service or Windows-local claims.

## Owner smoke test
1. Open protected URL in Edge; hard refresh.
2. Click **Reference feed** at the top of the left Library menu.
3. Expand Domains → Ai Agents → a Topic (and its Tags). Verify counts and that feed cards change; click All references to reset.
4. Try Projects → Datapass Pm → a Domain, and scroll date-grouped posts. Confirm some saved links appear without images.
5. Open an archived screenshot from the feed and return; select one and locate it under Selected or Collections.
6. Search a phrase such as agent cockpit while in Feed, change the With archived media filter, and test Load more references if applicable.
7. Report screenshot and unexpected behavior. This is required before real-browser acceptance.

Final outcome: verified protected preview deployment and synthetic CI for the new feed/tree; actual Edge UX still requires owner inspection.
