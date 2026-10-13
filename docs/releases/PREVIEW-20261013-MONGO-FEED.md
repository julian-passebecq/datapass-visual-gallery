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


## Owner UX follow-up — root axis exploration and compact/tagged cards (2026-10-13)

**Source of request:** In authenticated Edge, clicking `Scopes` expanded the navigator without changing the feed; a full-width list wasted space, and the labels displayed on each reference card could not be clicked to search.

### Delivered functional scope
- Clicking a root category **Domains / Projects / Purposes / Scopes** now both toggles the left tree and opens that axis's named feed view. A read-only taxonomy request shows actual Mongo category values and counts. Clicking one value filters the feed.
- The feed defaults to **4 cards per row** (previously 3) and still lets the owner choose 2/3/4; the local preference migrated to `dvl:feed-columns:v2` without erasing a prior two-column preference. Narrow screens automatically use fewer cards.
- The reference cards use shorter, smaller titles and excerpt previews, while `Read full description` retains the complete stored summary and image-observation text.
- Each card now shows up to two clickable tags, with `+N tags` to expand the rest. Clicking any tag filters references through the actual authenticated private `/api/feed` endpoint. Tag selection intersects the existing Mongo category path. A selected tag can be toggled off, and **Clear filters** is visible.
- Backend facet-path parsing is safely expanded from 3 to 4 distinct fields, with explicit axis validation, cursor-fingerprint updates and zero-match behavior.
- Existing media grid, original R2 objects, side-by-side comparison, Collections, import and favorites are unchanged. MongoDB was read-only.

### Exact CI and private Cloudflare evidence
- **Deployed source SHA:** `5b5e421d32ecb0e3cc7a94e2f681030ce3dea2b5` in draft PR #3.
- GitHub Actions **run #163**, run ID `38445667660`: Worker `qualify` **SUCCESS** and `synthetic-browser` **SUCCESS**. Coverage includes root Scope axis, category value selection, default four-column layout, two/three/four layouts, mobile single column, extra-tag expansion and a click-to-filter/toggle journey, plus existing gallery workflows. The initial failed test expected titlecase `Datapass` instead of source-preserved `DATAPASS`; corrected the case-sensitive assertion without modifying the source classification.
- CI compiled Worker SHA-256: `32a5f814dfd0448b5699b79e707040df6dc68f7c84fe60649bb8f967e50cb961`, **451680** UTF-8 bytes. CI synthetic PR checkout SHA `c332482af90602af12dcb19b59ab269c4555c17f` is not the product runtime SHA.
- Cloudflare Worker upload returned HTTP 200 after verification of the exact script byte count and digest. Active deployment ID: `c6b3cfba-fa01-4034-87af-74816264da35`, active Worker version `a311120e-0058-466e-871d-fe67655c760b` **100%**.
- Post-deploy verified owner-only Access, Worker and hostname protection, existing R2 bindings `datapass-media` and `datapass-web-assets`, private KV `CATALOG` binding and the same **113** Mongo-derived private reference records. No Atlas write, new service subscription, public asset publish or change to original image bytes.
- Product-owned acceptance changed: DVG-015/016/017, DVG-UX-011/012/013. Historical receipts remain intact.

### Not yet qualified
- Actual owner Windows Edge click-through and rendering after this update remain **UNKNOWN**, despite successful GitHub-hosted synthetic Chromium.
- Live semantic similarity, automatic Mongo sync/intake, true reduced-byte thumbnails, approved public asset publication and the separate Edge extension qualification remain outstanding V1/R&D gates.
- No merge to main, no unrelated repository write, no force push and no Windows desktop attestation.

### Owner test
Hard refresh the authenticated preview. Click `Scopes` and inspect the new Scopes heading and value/count chips; click a scope to filter. In the feed, use **Cards per row: 4**, then choose **+N tags** on a card and click one of its tags. Verify the visible filter, its count, and **Clear filters**. Check full-description expansion and an image in the original viewer.

## Owner screenshot follow-up — image-dominant cards and no-click hover preview (2026-10-13)

The owner screenshot of the four-column feed showed the archived tall screenshots cramped into ~145 px media frames while repeated category, timestamp, ID, description and tag labels occupied much of the card. The user requested more screen space for images and an enlarged preview by simply hovering, without opening the zoom viewer.

### Focused code and UX corrections
- Media image region increased to roughly **258 px** at four columns on desktop (formerly ~145 px; responsive 235–305 px depending on viewport). Screenshots retain `object-fit:contain` so no source pixels are intentionally cropped.
- Replaced repeated always-visible source kind/date/ID/context/summary with a compact image/title/actions card. Full source metadata and analyses remain accessible via native expandable **Info**; tags and their existing clickable Mongo predicates remain inside **Tags**. The optional original source action and Select control remain available. Nothing is deleted or recategorized.
- A desktop pointer hover or keyboard focus produces a large fixed preview (maximum 510 px wide/720 px high, bounded by viewport) above the grid, using the same owner-authenticated private R2 URL. Hover also gently scales the in-card image; pointer exit/blur/Escape/scroll dismisses the preview. The preview is pointer-events-none, and clicking the card still opens the original lightbox. Small-screen/touch interaction retains click navigation.
- No extra Cloudflare Images subscription, public R2 copy, Blob URL export, or Atlas/Cloudflare source data modification. Hover does not supply bandwidth-reducing thumbnails.

### Exact code and deployment evidence
- GitHub product runtime SHA **`b8bb2e9181fb917b7cb2631c9bce88f1e0421eb7`**, draft PR #3 based on the existing gallery PR #2 branch.
- GitHub Actions run **#178**, run ID `38458158353`: Worker `qualify` job `115506118088` **SUCCESS** and `synthetic-browser` job `115506118356` **SUCCESS**. Synthetic Chromium asserts the increased media area, a floating preview larger than the thumbnail using the exact private route, disappearance on pointer exit, Info and Tags closed initially, tag filtering after expansion, mobile hover fallback, and preexisting import/collection/compare/viewer workflows.
- Compiled Worker SHA-256 **`551715e85bc2f93b54d6de5c2ce0e0f6843979bcda96f7b8bdfd8fa29b163250`**, **459680 UTF-8 bytes**. The synthetic PR checkout SHA `1ccadbef894aaba0bf23900a921412cab4e7dae1` is distinct from the code SHA.
- Owner-protected Cloudflare Worker deployment ID **`36f9d2c4-cd97-4153-9fb1-e78c9c10d11a`**; Worker version **`1b8e2587-5769-4018-96af-a72d3ba1de50`** verified **100% active** at `https://datapass-visual-gallery-preview.datapass.workers.dev/`.
- Post-deploy verification: the same single-owner Cloudflare Access rule still protects hostname and Worker; private `datapass-media` R2, approved `datapass-web-assets` R2, private `CATALOG` KV binding and 113 Mongo-derived records remained unchanged.

### Open gates
- Owner has not yet qualified the **new version's** actual Edge hover and four-column image readability; synthetic CI is not direct desktop control. User should hard refresh the protected preview and hover a tall screenshot without clicking, try Tags/Info, and verify the existing click-to-open viewer.
- Existing V1/other open gates remain: full reduced-byte thumbnails, automatic Mongo intake/snapshot refresh, controlled publishing, signed-out private Access/media denial in a real browser, and separately authorized Edge integration.
- PR remains draft and unmerged; no main branch merge, no public media publication, no new paid service, no Windows qualification claim.
