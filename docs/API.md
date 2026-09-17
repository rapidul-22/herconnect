# Release 1 API contract

> Release 2 adds /api/hiring endpoints documented in HIRING.md. Existing marketplace/auth routes are unchanged.

All paths start /api. JSON requests except multipart image upload. Money is integer paisa in API responses; UI displays BDT. Errors return {error, fields?}. Validation 400, no session 401, forbidden 403, missing resource 404, conflict 409, throttled 429. Authenticated mutations send X-CSRF-Token. The browser includes session cookies automatically on same-origin requests.

| Method | Path | Access and purpose |
|---|---|---|
| GET | /health | Public readiness |
| GET | /auth/me | Current user and CSRF token, or null user |
| POST | /auth/signup | name,email,password,phone; starts session |
| POST | /auth/login | email,password; starts session |
| POST | /auth/logout | Signed-in user; revoke session |
| POST | /auth/forgot-password | email; always generic success |
| POST | /auth/reset-password | token,password; revoke old sessions |
| PATCH | /auth/profile | name,phone,address; own account |
| POST | /auth/change-password | currentPassword,password; revoke sessions |
| GET | /products | q,category,sort,maxPrice,page; approved active catalog |
| GET | /products/:id | Public approved active detail, seller summary and reviews |
| GET | /shops/:id | Approved public shop |
| GET/POST | /wishlist, /wishlist/:id | Own wishlist / toggle eligible product |
| POST | /orders | items [{productId,quantity}],shipping,requestKey; transactional COD checkout |
| GET | /orders | Own purchases; ?sales=true for seller |
| GET | /orders/:id | Buyer or owning seller only |
| PATCH | /orders/:id/status | status,reason; role and current-state checked |
| POST | /orders/:id/reviews | productId,rating,comment; buyer of delivered item |
| POST | /seller/apply | name,city,story; ordinary account |
| GET | /seller/products | Own drafts and active/archived products |
| POST | /seller/products | Product fields; applicant/approved seller |
| PATCH | /seller/products/:id | Product fields and stockDelta; owning seller |
| DELETE | /seller/products/:id | Archive, never hard-delete |
| POST | /seller/uploads | Multipart image; seller only, max 5 MB |
| GET | /admin/sellers | Admin; applications and shop status |
| PATCH | /admin/sellers/:id | status,reason; admin decision and audit |
| GET | /admin/products | Admin moderation inventory |
| DELETE | /admin/products/:id | Admin archives with reason |
| GET | /admin/audits | Admin decision history |

No admin signup endpoint. scripts/admin.js explicitly creates the moderator from environment values. Seed command is opt-in and does not drop collections. Use a separate development database.


## Safety Reporting API

See SAFETY.md for /api/reports, /api/zones/unsafe and /api/resources routes, privacy projections, filters and admin permissions.
