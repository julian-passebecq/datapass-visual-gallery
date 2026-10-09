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
