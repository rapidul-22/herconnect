# Release 3 — Safety Reporting

## Scope and decisions
This release adds the third module to the existing application: public reports, anonymous/named submissions, map location selection, personal report tracking, computed hotspots, help-resource search/distance sorting, and admin moderation/resource management. Safe Transport remains unimplemented.

Anonymous means hidden account identity in public API responses, not anonymous to the database or moderators. Names and email addresses are never included for anonymous reporters publicly. Named reports expose only display name. Description and area are public: users must avoid personal identifiers. Public map coordinates are rounded to 3 decimal places; the reporter and admin can see exact coordinates and private moderation history. This does not guarantee anonymity of information the user writes into the report.

Reports appear immediately as pending (not verified facts). Status moves pending → reviewed → resolved; admins may hide spam/identifying content from public feeds and hotspots at any stage. Review notes remain private to reporter/admin. Status does not imply police action. Admin edits use an expected history length to reject stale updates. Retry keys prevent duplicate submissions. Account rate limit: 10 submission attempts/hour.

## Hotspot definition
DBSCAN with Haversine distance: 500m neighbourhood, minimum 3 reports including the core point. Density-connected groups can extend beyond 500m. Noise points are excluded; missing reports never prove safety. Uses incident dates within 180 days, excludes hidden reports, includes pending/reviewed/resolved reports. Real and fictional datasets are separate. Counts measure reports, not distinct verified incidents or independent people. Only latest 2000 reports processed; response/UI explicitly disclose if capped. O(n²) computation suits a course dataset; spatial indexing/caching needed at scale. No crime prediction or official unsafe-area classification.

## Data
SafetyReport: reporter reference, anonymous flag, category, description, location, incident time, status, hidden flag, private history, retry key, demo flag. Unique (reporter, requestKey).
HelpResource: name, type, phone, address, optional coordinates, 24-hour flag, verification source/date, demo flag. Admin owns updates. Empty numbers are allowed for fictional placeholders and cannot be dialled in UI. Only verified real entries get call links. Nationwide entries have no distance.

## API
- GET /api/reports: public paginated feed; category, area, status, demo=true/false, page.
- POST /api/reports: authenticated submission; account stored internally, status/identity fields cannot be spoofed.
- GET /api/reports/mine: authenticated owner's reports including hidden entries.
- GET /api/reports/admin: admin report queue with identity/history.
- GET /api/reports/:id: public projection, or private detail for owner/admin; hidden reports return 404 to everyone else.
- PATCH /api/reports/:id/status: admin; status, hidden, note, expectedVersion (history length).
- GET /api/zones/unsafe: live clusters, demo=true/false.
- GET /api/resources: q, type, optional lat+lng for straight-line distance, demo=true/false.
- POST /api/resources, PUT /api/resources/:id, DELETE /api/resources/:id: admin.

Existing session cookies, CSRF/origin checks, Zod validation and error responses are reused. Bangladesh bounding rectangle: latitude 20–27, longitude 88–93 (not a political border test). Incident timestamps must include timezone and cannot be future times. No uploads, notifications to authorities, emergency dispatch, or automated verification.

## Maps and dependencies
Leaflet 1.9.4 is bundled under client/src/vendor/leaflet with its BSD licence. No package.json/lock changes or API keys. https://leafletjs.com/download.html
OpenStreetMap tiles require internet; visible attribution, normal browser caching, no prefetch/offline download. https://operations.osmfoundation.org/policies/tiles/
Map tiles are fetched directly from OSM, which receives browser network information and requested map area. Text/coordinate inputs work when tiles fail. Geolocation requires permission; denial has a clear error and manual fallback. CSP allows only the tile image origin in addition to existing image sources.

## Resource accuracy
The seed includes the national emergency service 999 with source, plus separate fictional facilities without telephone numbers. No invented real contacts. Admins can add sourced local facilities; source presence is a moderation record, not automated verification. Do not mark an entry verified without checking its details. Resource locations are straight-line proximity, not driving routes or live operating status.

Source for seeded 999 entry (checked 14 September 2026): https://www.itu.int/net4/wsis/archive/stocktaking/Project/Details?projectId=1514906121 . The ITU record describes Bangladesh’s national emergency service and 24/7 operation.
