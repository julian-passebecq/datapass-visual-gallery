# Contracts and security
## GET /api/media?source=all|private|public&q=&limit=80&cursor=
Returns {items:[{id,source,key,title,size,uploaded,mime,url}],cursor?,hasMore,sources}. Cursor opaque; R2 list ordering. Search matches lowercase object key/path, not Mongo semantics. Unsupported extensions omitted.
## GET /api/file/:source/:key
Private authenticated bytes via R2 get; no signed URLs, no public R2 access. Response type allowlisted. No write endpoints.
## Access
Every request, including static assets and media bytes, must have valid Cloudflare Access JWT: audience ACCESS_AUD, issuer ACCESS_TEAM_DOMAIN, JWKS validation. Reject missing configuration. Cloudflare Access app should also protect direct worker routes/preview deployments and restrict user identity. No anonymous public origin. Verify Access issuer format against live Cloudflare account configuration.
## Selection manifest
schema datapass.visual-selection/1; exportedAt ISO timestamp; items have id, source, key, title, mime. Local selected/favorite state is per-origin browser localStorage, never source-of-truth Mongo. Selection is not authorization to publish.
## Future integration
Mongo semantic adapter maps existing reference IDs and source-backed tags to exact R2 keys; server-side credentials only and bounded pagination. Edge extension uses opt-in tab open and scoped messaging; no surprise host permissions or webpage scraping. ChatGPT Media MCP continues to serve image inspection, not duplicate private originals.

## GET /api/references?q=<descriptive terms>&limit=35
Read-only metadata-relevance search from a verified derived snapshot of MongoDB references/assets. Returns source reference IDs, titles, tags, visual notes and exact authenticated private-media URLs. Search mode is **lexical weighted metadata**, not vector semantic search. The snapshot is stored in EU-jurisdiction Workers KV under catalog-v1, separately from MongoDB authority. Missing index returns explicit 503.
## GET/PUT /api/collections
Owner Access sub is SHA-256 namespaced in KV. State includes revision, named collections and favorites, no originals. PUT enforces same-origin Origin and If-Match revision; Cloudflare KV is eventually consistent, so this is best-effort conflict detection and not a transactional database. Max 40 collections x 200 references. Other users cannot read another sub's state.
## POST /api/import
Explicit multipart import into **private** datapass-media R2 under originals/gallery-import/. PNG/JPEG/WebP/GIF signature checks, 8 MiB maximum, purpose and tags recorded as R2 metadata. Images appear in Generated & imported filter but are marked PENDING_REFERENCE_INTAKE until normal Mongo reference intake; this Worker never writes MongoDB. No public publishing route.
## Browser/UI
Selections include saved image metadata across pages and filters, so export cannot silently drop unloaded selections. Large image viewer preserved. The Edge extension requires a separate non-destructive integration reviewed against its newest dashboard branch.

## R2 media list pagination and visual compare increment

The listing endpoint now returns **no more than the requested** limit (1-100) with an opaque cursor containing its current bucket page and intra-page offset. A cursor is only valid with its original source and case-normalized filename query; mismatch is rejected. Generated imports remain in private R2 and receive the generated source label. R2 listing is bounded to eight upstream pages per response and may return a smaller page plus continuation when a filename query has sparse matches. This avoids the former behavior of returning an entire large R2 page when the UI only requested 80 items. The cursor is not a secret or authorization token; every request still requires owner Cloudflare Access authentication.

The website adds local-only two-image comparison and zoom; no media is moved or published. Adjustable card size and native lazy image decoding reduce off-screen rendering work. **These do not downscale original image payloads**. Cloudflare Images transformation binding requires separate subscription/billing approval or a separately designed offline thumbnail pipeline; no new paid dependency is introduced by this increment.


## Private MongoDB-derived reference feed

`GET /api/taxonomy` returns `{schema:"datapass.visual-gallery.taxonomy/1",snapshotAt,count,entries,semantics}`. Each entry is a reference ID with classified `domains`, `routes`, `purposes`, `scopes`, `topics`, `tags`, and `hasMedia`. Requires Cloudflare Access JWT. It does not update MongoDB or expose source files without Access. A complete bounded snapshot (up to 5000 references) is required for truthful category counts.

`GET /api/feed?limit=24&q=&order=newest|oldest&media=all|images&path=<opaque-base64-JSON>&cursor=<opaque>` returns `{schema:"datapass.visual-gallery.feed/1",snapshotAt,source,total,entries,cursor?,hasMore}`. Path is a JSON array of at most three distinct field/value predicates on existing classifications. Predicate combinations are AND; the source's multi-valued fields may place the same reference in multiple branches. Missing categories use `__unclassified__`. User path/cursor parsing is bounded and rejects invalid fields and stale cursor/filter combinations. Feed results preserve stable Mongo `reference_id`, dates, source kind, summary and exact protected `/api/file/private/...` links. External source link is allowed only for original HTTPS reference sources.

**A domain → topic → tag tree is a virtual facet UI, not MongoDB's authored folder relationship.** Curated Collections remain a separate product-owned user store. The read-only snapshot is regenerated explicitly from `reference_memory.references` and `assets` and stored at private KV key `catalog-v1`; it is **not** continuously updated. This feature does not use an LLM, clone Mongo collections into public Git, or expose unauthenticated objects.


## Facet root overview and clickable tags (2026-10-13)

The **root axis** buttons Domains/Projects/Purposes/Scopes select the corresponding feed overview and toggle their sidebar tree group. The feed fetches only the existing read-only `GET /api/taxonomy` projection to render actual value/count chips. Selecting a chip creates a first-class category path. A root view does not invent one MongoDB folder: it explicitly shows the chosen axis and its concrete values.

`GET /api/feed` now optionally accepts `axis=domains|routes|purposes|scopes|topics|tags`, validated against known facet names. When set, it includes only references classified under that axis. Changing `axis` invalidates the cursor fingerprint. The existing base64 JSON `path` now permits **up to 4 distinct facet fields** (previously 3), retaining AND intersection semantics. Duplicate field names, invalid values, unmatched tag filters, and malformed paths retain explicit failure/empty-result behavior.

A card's `tags[]` values from the private MongoDB reference snapshot are filter controls, not decorations. Selecting a tag replaces any previous tag predicate while retaining the other route/domain/topic/scope/purpose predicates; selecting it again removes the tag predicate. The selected filters are visible and explicitly clearable. Tags remain read-only; pressing a tag does not edit classification, publish media, or create a collection.

The compact feed defaults to 4 cards per row. Card-size preference uses `dvl:feed-columns:v2`; an old explicitly selected 2-column layout remains 2, whereas legacy 3-column default is replaced by the new 4-column default. The user may choose 2, 3, or 4. Responsive layouts reduce columns where necessary. The original full summary/visual notes remain accessible through each card's expandable full-description control. Extra tags are hidden behind `+N tags`, never discarded.
