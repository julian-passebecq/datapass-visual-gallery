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
