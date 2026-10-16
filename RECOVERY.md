# DataPass Visual Gallery — Git-first recovery

The **existing** production-adjacent viewer is Cloudflare Worker `datapass-visual-gallery-preview`, currently deployed separately from this source repository. This PR adds a reviewable standalone read-only client; it **does not** overwrite the Worker or assert that the live outage is fixed.

## Run
Serve `index.html` using a local static HTTP server. It requests `GET /api/catalog` from the **same authenticated origin** and private image paths `/api/media/<asset_id>`. Without the authenticated API it displays a safe explicit error, rather than sample private data or an invented working state.

## Backend adapter contract (to implement/verify in the existing Worker)
- GET /api/catalog: authorized only, Content-Type application/json; shape `{"schema_version":"datapass.reference-catalog/1","references":[{"reference_id":"REF-1","title":"...","summary":"...","purposes":["RESEARCH"],"scopes":["DATAPASS"],"tags":["agent"],"asset_id":"ASSET-1","source_url":"https://example.org"}]}`.
- GET /api/media/:asset_id: authorized only; server resolves asset ID from validated **Git-generated immutable manifest**, then streams from private R2 with restrictive cache/privacy headers. Reject path injection, arbitrary user-supplied R2 keys, unapproved external URLs and unauthenticated requests.
- No MongoDB, no permanent public object URLs, no secrets/real references in frontend repo.
- On failures send explicit 401/403/404/503; never fall back to public sample or private R2 keys.
- Build a static catalog from a pinned Git commit, checksum and data schema. The pre-existing Cloudflare KV may cache the generated catalog but never own truth.

## Cutover
Inspect live Worker source/config, confirm current access policy, back up active version and test on synthetic fixtures. Verify existing UI features and private data semantics before moving traffic. Keep no-op rollback. Do not deploy from this PR until source-to-Worker adapter and security journey are qualified.
