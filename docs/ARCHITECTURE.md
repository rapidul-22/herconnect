# Architecture and data dictionary

> Release 2 adds separate hiring models/routes in server/hiring-models.js and server/hiring.js, scheduling rules in server/hiring-rules.js, and client/src/hiring-pages.jsx. See HIRING.md for data relationships, privacy and transactional acceptance.

## Structure
A single npm project runs Vite for React development and Express for the API. Vite proxies /api, /uploads and /media to Express; a production build is served by Express on one origin. MongoDB Atlas is a replica set and supports the transactions used for stock and orders. Tests use a separate local MongoDB replica set, never the user's Atlas data.

Server files: models.js (schemas), auth.js (authentication), marketplace.js (catalog, orders and moderation), app.js (middleware), index.js (startup), seed.js (opt-in demo data). React uses React Router for pages, TanStack Query for server state, Lucide icons, native form controls and CSS. No generic service/repository/factory layers.

## Data dictionary
| Collection | Main fields | Constraints |
|---|---|---|
| users | name, email, passwordHash, phone, address, isAdmin, shop {name, city, story, status, reason}, wishlist, authVersion | email unique; privileged fields never copied from request bodies |
| sessions | tokenHash, user, authVersion, csrfToken, expiresAt | tokenHash unique, expiry TTL; token raw value only in HTTP-only cookie |
| passwordresets | tokenHash, user, expiresAt | unique token hash; single-use atomic deletion |
| products | seller, name, description, category, price, stock, image, materials, care, active, demoKey | price in paisa; stock non-negative; seller reference; demoKey sparse unique |
| orders | buyer, seller, items [{product,name,image,unitPrice,quantity}], subtotal, deliveryFee,total,shipping,status,history,requestKey,demoKey | buyer+requestKey unique; immutable purchase snapshot; single seller |
| reviews | buyer, product, order, rating, comment, isDemo | buyer+order+product unique; created only for delivered purchases |
| audits | admin, seller/product, action, reason | append-only through application routes |

Timestamps on all records. No hard delete of products through UI. No generic flag shared with future modules.

## Security and consistency
An opaque crypto-random session token is stored hashed in MongoDB. Cookies are HTTP-only, SameSite=Lax, Secure in production. Session payloads expose only required public account fields. Tokens expire after seven days; password reset/change increments authVersion and deletes sessions. CSRF tokens returned on session bootstrap must accompany authenticated writes. Origin is checked for unsafe browser requests including login. No CORS wildcard is needed with the development proxy.

MongoDB withTransaction groups inventory writes and order creation/cancellation. Conditional stock updates check seller ownership, active state and sufficient stock. Checkout checks approval and calculates prices from current products. The cart key is unique per buyer, so retries cannot create duplicate orders. Product edits apply an explicit inventory delta rather than writing a stale stock snapshot. Seller approval is rechecked at checkout; simultaneous administrative approval changes may overlap a transaction snapshot, so approval changes govern subsequent requests rather than cancelling already-started checkout.

User-uploaded images reside in server/uploads. Back up this directory alongside MongoDB before production use. Multi-instance hosting would require object storage; it is not part of the local release. No remote image fetching from seller-supplied URLs.

## Design direction
Rose/berry primary #A63A50, dark plum text #35252E, blush #F9E9ED, ivory #FFFDFB, teal trust accent #3E6B72. Serif editorial headlines paired with a readable sans body. Product photography, restrained borders, generous spacing, curved cards, compact navigation and responsive grids. Functional hover/focus states and modest transitions respect prefers-reduced-motion. Labels use text as well as colour.


## Release 3 architecture

SafetyReport and HelpResource collections, shared Haversine/DBSCAN helpers, a reporting router and React pages reuse the existing session/CSRF/query patterns. Leaflet is bundled locally; OSM supplies map tiles. See SAFETY.md for privacy boundaries and computation limits.
