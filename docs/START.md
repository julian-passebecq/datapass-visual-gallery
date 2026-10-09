# Visual Library — START
TARGET=CHATGPT.COM for this bounded initial implementation, independent of Codex/Claude native sessions.
Owner-provided scope: 2026-10-09, datapass-visual-gallery and Cloudflare. Product repo owns code, CSV acceptance and release evidence. The Galaxy hub is a source router, not another implementation store.

Baseline: main 8e071a969c683682095f2a7bad0f6d376c184e00; isolated branch feat/visual-library-full-v1. No local Windows claim and no production merge. Source rules: galaxy-knowledge-csv/PROJECT_INSTRUCTIONS.md, galaxy-hub/START.md and sources.json. Cloudflare R2 buckets datapass-media/datapass-web-assets and existing datapass-media-mcp reused; no migration and no bulk reads. Access and deployment are separate gates.

Acceptance owner: spec/features.csv and spec/ux.csv. Current implementation includes React gallery, read-only authenticated R2 gateway, browser-local selection, favorites and manifest export. It lacks server-backed semantic Mongo retrieval, image ingestion and Edge integration; gates remain OPEN, not passed.

Immediate evidence needed: npm install/test/check/build, Cloudflare Access policy and JWT configuration, authenticated R2 user journey, CI at exact SHA. Expected time to qualify depends on Cloudflare Access app/permissions and Windows browser state, roughly 2-6h additional for available credentials and stable service, low confidence. Complete envisioned cross-app integration may take 1-3 days beyond that, moderate uncertainty. No token quota or billing assumption.
