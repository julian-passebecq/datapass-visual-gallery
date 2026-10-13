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


## Focused persistent-sidebar correction — 2026-10-13 evening

**Owner screenshot evidence:** while **Collections** was active, `Reference feed` appeared in the library navigation but the MongoDB tree was invisible. The initial code mounted `FeedCategoryTree` only if `tab==='feed'`, so the existing behavior was a discoverability defect, not a missing Mongo classification or Access failure.

**Fix:** The VS Code-style MongoDB category navigator is now persistently mounted in the left sidebar on all library tabs (Collections, All media, Private references, Generated & imported, Web assets, Favorites, Selected and Reference feed). Clicking any category selects its path and automatically changes to the filtered Reference feed. The existing selected-image/export/collection state is preserved. The sidebar receives its own scrollable tree area, and desktop navigation spacing was tightened to leave room on shorter Edge windows.

**Exact qualified and deployed runtime:**
- Product SHA: `bfda81fedb4389106b563f9df38322ba8e2fd4be` on this draft PR #3 branch, derived from the previous qualified feed baseline.
- GitHub Actions **run #126** (`38437860045`): **SUCCESS** in Worker qualify and synthetic Chromium. The Chromium test specifically starts in Collections with existing selections, verifies tree visibility, chooses an Agents category, checks the filtered feed, then returns to library modes and confirms the tree stays visible.
- Packaged Worker SHA-256 `e3b2f0e20ccdf883fea8a7a4833876e61ec32d2ec028e7061b70a3dee615f8bf`, 432774 bytes; CI checkout SHA `5210d19aa8231f02d24806e7e40005ea45802bb1` is not the product commit.
- **Active protected Cloudflare deployment** `50ff0e1e-0a0d-4223-aae0-1f11ec482bf7`; Worker version `42ad5472-55dc-4381-8beb-2699fc99b12b` at **100%**.
- Post-deploy Cloudflare checks: same owner-only Access rule covering Worker and preview hostname; `PRIVATE_MEDIA=datapass-media`, `WEB_ASSETS=datapass-web-assets` and `CATALOG` unchanged; the private catalog still contains 113 Mongo references.
- **No product or MongoDB changes beyond this targeted UI/automated-browser patch.** No `main` merge, public image transfer, direct Windows desktop control, new paid service, or claim of real owner-browser success.

**Acceptance:** DVG-015 and DVG-UX-011 updated to require the persistent tree in Collections and every view. The owner should refresh the protected site while Collections is still selected and check that **MONGO CATEGORIES** appears under the Library menu without switching to Feed. Clicking Domains → Ai Agents should automatically open the filtered Reference feed. This live Edge verification and other V1 gates remain open.


## Owner-observed follow-up — clickable category axes and multi-column feed (2026-10-13)

The owner confirmed the permanent Mongo category sidebar and image-rich reference feed display real archived media in the authenticated Edge browser, but reported that the **Domains / Projects / Purposes / Scopes** rows were difficult to click and each reference used an entire horizontal line.

### Implemented focused correction
- Converted each tree axis and nested category into a **single full-width button** with a visible chevron and reference count; Enter/Space activation is provided by the native button. Clicking a root toggles its children; clicking a child selects its facet path and toggles its expansion. The sidebar remains visible across all gallery modes.
- Changed chronological feed cards from full-width horizontal panels to a responsive grid, **3 columns by default**, optional 2/3/4 stored in the existing browser profile. Smaller viewports automatically reduce columns to two or one.
- Cards retain dated source IDs, private archived images, titles, selected-item actions, original source links and topic tags. Text excerpts are clamped for compact layout, with **Full description** to reveal full stored summary/visual notes. No source data deletion or modifications.
- Browser regression tests verify clicking the **right side** of the Domains/Projects/Purposes/Scopes axis row, persisted open/closed tree state, 2/3/4 columns and single-column behavior on mobile-sized viewports, plus existing comparison, image viewer, search, collections, import and export.

### Exact publication and security receipt
- **Deployed product runtime SHA:** `cdc2cc7c278ee0b3a2731eff6686bae258dbf183` on draft PR #3 branch.
- GitHub Actions run **#141** / ID `38442410281`: `qualify` and `synthetic-browser` both **SUCCESS**, after correcting a prior assertion that incorrectly assumed a persisted folder was always collapsed. The source implementation was not changed to mask that test issue.
- CI compiled Worker SHA-256 `67907adf0f7d1e8acf5495eae7b137cc43a86d48cb40c0138b858eeb800252f0`, 439542 UTF-8 bytes; synthetic PR checkout SHA `2785c9c5b2f667834b1309d07b56143ccbec9ee4` (not product SHA).
- Cloudflare Worker upload succeeded only after exact SHA/byte validation and rechecking owner-only Access, protected destinations, KV index and R2 bindings. **Active deployment ID:** `d30a2407-d99a-490e-a76f-a4510dc17d7f`; version `661ced88-7c6d-496a-ab04-5b2d36873c5d` verified **100% active**.
- Post-deployment checks confirmed unchanged owner-only Cloudflare Access, Worker/hostname coverage, private `datapass-media`, original `datapass-web-assets`, existing `CATALOG` KV binding and **113** indexed MongoDB references. No MongoDB or media writes.
- Canonical acceptance updated: DVG-015 / DVG-016 and DVG-UX-011 / DVG-UX-012. Draft PR remains unmerged.

### Live user acceptance remaining
Authenticated owner should press Ctrl+Shift+R on the protected preview, click anywhere across **Domains / Projects / Purposes / Scopes**, expand and select a nested category, then use **Cards per row → 3 / 4** in Reference Feed. The source-backed real Edge visual and responsiveness verdict are **UNKNOWN until the owner tests the new version**. Remaining complete-V1 items are not waived.
