> Latest incremental update: Issues 3, 4 and 5. See [dashboard, road routing and shared-account notes](docs/ISSUES-3-4-5.md). New road quotes and address suggestions require a server-side `GEOAPIFY_API_KEY`. Live provider and MongoDB verification must be completed locally before accepting this update. Main remains unchanged.

# HerConnect+ — Release 4: All Four Modules

A responsive women-focused platform built with React, Express and MongoDB. Accounts, dashboard, Marketplace, Domestic Worker Hiring, Safety Reporting and Safe Transport are implemented as a university prototype. Full-project acceptance testing is still required.

**Start here:** follow the setup below. No existing Atlas collection needs to be deleted. The package contains no database passwords.

## Release 4: Safe Transport

Start with **docs/TRANSPORT-SETUP.md**. This incremental update adds driver application/approval, nearest-driver ride requests, transaction-protected participant locks, timestamps and location updates, timeouts/cancellation, private contacts and panic alerts, post-ride reviews and moderation.

**Branch rule: create feature/safe-transport from feature/safety-reporting. Do not merge or push to main until the full project is checked and Mahin explicitly requests it.**

No npm dependency or .env changes. Optional additive demo seed: `node --env-file=.env server/seed-transport.js`. Four fictional drivers start offline; use the two-browser demo walkthrough to bring one online and request a ride. Demo mode is separate from real matching.

Verification: production build and 15 database-independent checks pass. Browser application/approval, ride request, tracking, alerts, completion/review and responsive checks pass with simulated APIs/location. The real Transport MongoDB integration test is included but could not start in this environment (database process exit code 100). Do not treat database concurrency or persistence as verified until your local test passes.

Scope: fare uses classroom straight-line constants; no road routing, payment processing or automated SMS/police dispatch. Browser location sharing requires permission and an open page. Details and acceptance rules are in docs/TRANSPORT.md.

## Release 3: Safety Reporting

Start with **docs/SAFETY-SETUP.md**. This incremental update adds public/named/anonymous reporting, map location selection, private report tracking, live hotspot clustering, a support directory and admin moderation/resource management. Demo reports and facilities are explicitly fictional and separate from real results.

**Branch rule: start feature/safety-reporting from feature/worker-hiring. Do not merge into main until the full project is complete and the owner explicitly requests it. This overrides merge instructions in older release guides.**

No new npm dependencies, environment settings or API keys. Leaflet 1.9.4 is bundled with its licence; map tiles require internet. Optional seed: `node --env-file=.env server/seed-safety.js`.

Verification: production build and 11 database-independent checks pass. Browser flows pass against simulated APIs. The full Safety MongoDB integration test is included but blocked in the authoring environment before execution by MongoDB exit code 100 (`open: Operation not permitted`). Run it locally; do not mark it passed until your result confirms it. Your prior Hiring integration test passed locally after correcting `dates.endAt`.

## Release 2: Domestic Worker Hiring

Worker applications and independent approval, directory/search, availability, booking requests, transaction-protected acceptance, cancellation, customer completion, reviews and privately moderated complaints are implemented. Start with **docs/HIRING-SETUP.md** for the incremental installation, demo accounts, manual checks and Git steps. Rules and API details are in **docs/HIRING.md**.

No new dependencies or .env variables are required. Keep any dependency security upgrades already made locally. The new demo command is `node --env-file=.env server/seed-hiring.js`; it is additive and separate from the marketplace seed.

Hiring build and seven database-independent tests passed; browser workflows passed using simulated API responses. The live-database integration suite is included but its MongoDB process exited with code 100 before execution in the authoring environment. Your Atlas cluster was not accessed.

## Previous update: logout and multi-shop bag

The top bar now has a labelled Log out button on desktop and mobile. The bag retains products from different shops, groups them by shop and checks out each shop separately. Successful checkout removes only purchased quantities; a failed checkout leaves the bag intact. See docs/LOGOUT-BAG-FIX.md for installation, validation and Git steps.

## Current progress

| Area | Status |
|---|---|
| Revised requirements, architecture, API contract, test plan | Written in docs/ |
| Signup, login, logout, protected pages, profile, password change | Implemented |
| Password reset | Implemented; SMTP needed for real emails; local development prints reset links in the API terminal |
| Main dashboard with all four modules | All four module routes active |
| Marketplace search, categories, price filter, sorting, pagination | Implemented |
| Product detail, shop page, wishlist and persistent device cart | Implemented |
| COD checkout, purchase snapshots, order history, cancellation | Implemented with MongoDB transactions and retry protection |
| Seller application, product image upload, inventory and sales | Implemented |
| Admin seller approval, suspension, listing archive and decision history | Implemented |
| Reviews | New reviews require a delivered purchase; 30 sample reviews are labelled demo |
| Sample content | 4 fictional shops, 10 products, 3 buyers, 30 reviews and bundled photographs |
| Worker Hiring | Profiles, schedules, bookings, reviews and complaint moderation implemented; see docs/HIRING.md |
| Safety Reporting | Implemented; see docs/SAFETY.md |
| Safe Transport | Implemented; see docs/TRANSPORT.md |
| Build | Successful in the authoring environment |
| API guard tests | 4 tests passed |
| Browser checks | Passed at desktop/mobile sizes using fixture API responses; see docs/TESTING.md |
| MongoDB integration suite | Included but blocked here before tests by local MongoDB process permission error; run on your computer |
| Atlas connection | Not tested; the supplied cluster was not modified |

Read docs/TESTING.md for browser verification results and the full test boundary. Do not treat a successful frontend build as proof that the Atlas connection or checkout transactions work on your computer.

## Requirements

- Node.js 22 or newer (Node 24 recommended), npm, and internet for initial installation.
- MongoDB Atlas database user with read/write access to the chosen database.
- Your computer's current IP allowed in Atlas Network Access. Do not use unrestricted access as the default.
- VS Code is optional. All commands run from the extracted `herconnect` directory, not its parent and not `client`.

## Setup on Windows / PowerShell

1. Extract the ZIP. Open the `herconnect` folder in VS Code and open its terminal.
2. Install the exact dependency versions:

```powershell
npm ci
npm run setup
```

3. Open `.env`. Replace `MONGODB_URI` with your current Atlas connection string and specify the development database name. Example structure:

```dotenv
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.spd9gkz.mongodb.net/herconnect_dev?appName=HerConnect
PORT=4000
APP_URL=http://localhost:5173
NODE_ENV=development
ADMIN_EMAIL=admin@herconnect.local
ADMIN_PASSWORD=choose-a-unique-password-at-least-12-characters
DEMO_PASSWORD=choose-a-demo-password-at-least-12-characters
```

Keep the actual `.env` private. It is ignored by Git. Rotate the database password that was shared in chat, and use the new value in the URI. If the password contains reserved URI characters, encode that password component before inserting it.

Your original URI did not select an application database. This example deliberately uses `herconnect_dev` to keep project records in a named development database.

4. Add the sample content and create your moderator:

```powershell
npm run seed
npm run admin
```

The seed is additive: it uses unique demo keys and does not drop collections or overwrite existing products/passwords. Running it again will not reset changed stock, archived listings or demo account passwords. Run it only against your development database.

5. Start the project:

```powershell
npm run dev
```

Open **http://localhost:5173**. Keep this terminal running. One command starts both the API on port 4000 and Vite on port 5173. Stop both with Ctrl+C.

## Accounts for trying the workflows

All sample accounts use the `DEMO_PASSWORD` you set before the first seed.

| Account | Email | What to test |
|---|---|---|
| Buyer | buyer1@herconnect.demo | Saved items, checkout, purchases, reviews |
| Buyer | buyer2@herconnect.demo | Separate buyer / access isolation |
| Buyer | buyer3@herconnect.demo | Separate buyer / access isolation |
| Mati & Me | nadia@herconnect.demo | Ceramic listings and sales |
| Little Loom | farhana@herconnect.demo | Tote, scarf and earrings |
| The Gentle Edit | sadia@herconnect.demo | Candles and sample beauty collection |
| Crumbs by Rumi | rumana@herconnect.demo | Sample cookie listing |
| Moderator | Your ADMIN_EMAIL | Approvals, suspension, listing moderation |

You can also create a fresh account through signup. A new account has no fake order history. Sample buyers have fictional completed purchases so you can inspect a populated order page; their seeded reviews cannot be posted twice.

`npm run admin` never upgrades an existing ordinary account or resets an existing admin password. Use a dedicated new email when creating the moderator. Password recovery can reset an existing admin password.

## Recommended first walkthrough

1. Browse Marketplace without signing in; search for “mug” and open a detail page.
2. Sign up. Check the four-module dashboard. All four cards open their implemented modules.
3. Save a product, add it to the bag and place a COD order. Your bag can hold products from several shops. Use the checkout button for the shop you want to order from; the other items remain in your bag.
4. Sign out and sign in as that product's seller. Open My shop → Manage sales → order. Confirm, ship and deliver it.
5. Sign back in as buyer. Open the delivered order and submit a review.
6. With your new account, apply for a shop and create a product using an uploaded photo.
7. Sign in as moderator and approve that shop. Its active products are now public.
8. Try cancelling a pending order. Stock returns once; the seller is not punished for a buyer's cancellation.

## Payment and delivery rules

- COD only, BDT 60 delivery per order.
- The server recalculates prices and stock. The cart is an estimate, not a source of trusted totals.
- No gateway, charge, real courier booking or real fulfilment is performed by this prototype.
- Pending → confirmed → shipped → delivered, advanced by the seller.
- Buyer or seller may cancel pending/confirmed with a reason. Shipped/delivered/cancelled orders cannot go backwards.
- Product names, prices and images are copied into the order so edits do not rewrite purchase history.
- Each product can be reviewed once per delivered order by its buyer.

## Password reset

For local testing, leave SMTP values empty and keep `NODE_ENV=development`. Request a reset and copy the link printed in the API terminal. This link is sensitive and expires after 30 minutes. No reset link is sent to the browser automatically.

For email delivery, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in .env. The application uses Nodemailer. Real SMTP delivery has not been verified in this environment. In production, empty SMTP configuration does not print tokens and cannot deliver reset emails.

## Build and run the bundled production-style app locally

```powershell
npm run build
```

Stop `npm run dev`. Set `APP_URL=http://localhost:4000` in .env, keep `NODE_ENV=development` for HTTP localhost, then run:

```powershell
npm start
```

Open http://localhost:4000. Express serves the built frontend and API together. For real public deployment, use HTTPS, `NODE_ENV=production`, a matching HTTPS APP_URL, actual SMTP and a backed-up uploads volume. Deployment itself is outside this handoff.

## Tests

```powershell
npm run test:guards
npm test
```

`test:guards` runs input validation, origin protection, unauthenticated access and safe error/header checks without MongoDB.

`npm test` also starts a temporary MongoDB replica set with mongodb-memory-server and runs transactional API tests. The first run may download the matching MongoDB binary. It does not read `.env`, use Atlas credentials, or touch your development database. The temporary database is removed on completion.

The authoring environment blocked the MongoDB process with `open: Operation not permitted`, exit code 100, so database integration tests did not execute here. This is recorded as unverified, not as a passing suite. If you see an error on your computer, send the exact terminal output with secrets removed.

## Project structure

| Path | Purpose |
|---|---|
| client/src/App.jsx | Layout, navigation, route protection and dashboard |
| client/src/auth-pages.jsx | Account forms, profile and help/privacy/terms pages |
| client/src/market-pages.jsx | Catalog, product, cart, checkout, orders and reviews |
| client/src/seller-pages.jsx | Shop management, upload form and moderation |
| client/src/shared.jsx | API client, server-state actions, cart and common UI |
| client/src/styles.css | Responsive berry/blush design system |
| client/public/images | Bundled illustrative product photography |
| server/models.js | MongoDB schemas and indexes |
| server/auth.js | Secure cookie sessions, profile and password recovery |
| server/marketplace.js | Marketplace routes and transaction rules |
| server/app.js | Middleware, errors and frontend serving |
| server/index.js | Database connection and server startup |
| server/demo-data.js / seed.js | Fictional sample content and additive seed |
| scripts/setup.js / admin.js | Environment-file setup and moderator creation |
| tests | API guards and database integration checks |
| docs | Requirements, architecture, API contract, testing and image credits |

## Deliberate simplifications

- Secure server-backed cookie sessions replace the proposal's JWT tokens. This makes logout/revocation straightforward for one web app. No auth tokens live in localStorage.
- The bag supports multiple shops. Checkout is separate for each shop, with BDT 60 delivery per shop order.
- Cart is device-local per account; wishlist and orders are in MongoDB.
- Reviews aggregate from actual stored review records instead of maintaining a fragile separate average counter.
- Shop approval is manual application review, not identity/background verification.
- Product photos are stored on the local server. Back up `server/uploads` when preserving user content. Object storage is a later deployment concern.
- Own orders are capped at the latest 100, moderator lists at 200 records, public shop pages at 100 products and detail reviews at 50. Global catalog has pagination. Add pagination to these capped views if the project grows beyond these limits.
- English UI; Bangla translation can be added as a separate agreed task.

## Next checkpoint

**All four module implementations delivered.** Run the checks in docs/TRANSPORT-SETUP.md and regression checks for earlier modules. Full project acceptance is not yet claimed. Previous-module issues remain deferred unless explicitly fixed. Keep all changes on feature branches until Mahin requests the final merge.
