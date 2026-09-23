# Dashboard, road routes and one-account access

This update supersedes the straight-line fare and manual-address instructions in the original Transport release. Read this file before the older TRANSPORT-SETUP.md when configuring maps.

## Issue 3: central dashboard
- `/` opens `/dashboard` for both visitors and signed-in users. No automatic Marketplace landing.
- Successful login/signup opens the dashboard, including logins that previously contained a `next` parameter. Users choose their module after authentication.
- Four equal module cards, responsive rose/lilac/peach/sage styling, keyboard focus, and links to each account's activities.
- Direct module URLs remain usable; refreshing `/transport` stays on that intentionally selected module.
- No fake activity totals or product feed dominating the dashboard.

## Issue 4: suggestions and road routes
- Add `GEOAPIFY_API_KEY=your_actual_key` to the API server's local `.env`. Do not use a VITE_ variable or commit the key.
- GET `/api/transport/places?q=...`: authenticated member search, 3-160 characters, five Bangladesh-filtered suggestions. Names and coordinates returned together. Search starts after a 400 ms pause, cancels obsolete requests, and supports keyboard selection.
- POST `/api/transport/estimate`: server calls Geoapify routing and returns road distance, time, route geometry and server-calculated fare. Key never reaches the browser.
- POST `/api/transport/rides`: send `quotedFare` (integer paisa) from the estimate, in addition to existing request fields. The server retrieves/calculates its own road fare; a different price or missing quoted fare returns 409. Client fare/route/driver fields do not control stored values.
- Identical routes are cached for five minutes, up to 256 entries per API process. The map endpoints allow 40 requests per member per minute. Existing ride-request limit remains 20/hour. Tests mock external map calls, not database writes.
- Car uses drive routing; Motorbike uses motorcycle. CNG uses drive and Rickshaw uses bicycle as explicit approximations. They are not local legal-route guarantees; duration is not live traffic or driver pickup arrival time.
- Route must be 0.1-100 km by road. Provider failure produces a visible error; no silent straight-line fallback. Points more than 500 m from route endpoints are rejected so a distant snapped road is not presented as the chosen doorstep.
- The selected road geometry is stored with the ride and rendered in its private detail view. Old rides/seed records remain unchanged and labelled legacy straight-line estimates, with no invented road geometry.
- Editing a searched address clears its old coordinates and estimate. Selecting a new suggestion, map point, vehicle or GPS pickup invalidates the old estimate. Typed addresses alone cannot submit with hidden default coordinates.
- Manual map/coordinate entry remains available, but new fare calculation and booking still require a working provider key.
- Driver matching remains the existing proximity ranking within 10 km; this update does not claim fastest road travel time to pickup, automatic navigation, traffic data, payment processing or emergency dispatch.
- The privacy page discloses search/address and coordinate transfer to Geoapify. OpenStreetMap tile attribution remains; route attribution is displayed separately.

## Issue 5: one account across modules
A normal member already has one User record and one session shared across the APIs. This update makes that explicit in signup, profile and dashboard links, and adds a database integration test that verifies one session can own a shop application, worker profile, driver profile and safety report while accessing buyer/customer/passenger history.

No role selector or extra signup is needed. Shop/worker/driver approvals remain required. Members cannot approve their own applications. A member cannot buy their own product, book themselves, or take two active transport roles at once. Moderator accounts remain dedicated administration accounts; this patch does not weaken moderation rules. Multiple browser accounts are needed to simulate two different people in a booking, not to use different modules as one person.

## Verification record
- Production build: passed on the supplied source snapshot.
- Database-independent checks: 18 passed, including road distance/fare, provider failures, malformed geometry, search guards, fare change checks and previous module guards.
- Browser with API fixtures: guest dashboard, login dashboard, module links, address suggestion keyboard/click selection, coordinates, route/price, ride detail, edit invalidation, and 390/320 px layouts passed. External map tiles were blocked in this check.
- Transport and new shared-account MongoDB integration tests: attempted, blocked at MongoDB startup (exit 100) in the authoring environment. Not reported as passed.
- Live Geoapify: not tested; no account/key was supplied. Teammate must test real Bangladesh searches and road routes, document results and provider limits before merging.
- GitHub source access returned 404. Patch is against the last delivered source snapshot, not a verified checkout of remote merge 94dbf41. Always use `git apply --check`; stop on a mismatch.
- Your teammate's vendor Leaflet file, package.json, package-lock.json, .env, marketplace source and earlier Hiring fix are not replaced by this update.

## Files and review points
- `client/src/dashboard.jsx`, `dashboard.css`: shared entry page and four module cards.
- `client/src/App.jsx`, `auth-pages.jsx`: public dashboard and authentication landing; shared-account copy/links and privacy notice.
- `client/src/address-search.jsx`: debounced, keyboard-accessible address selection.
- `client/src/transport-pages.jsx`, `transport.css`: road fare/geometry, input invalidation, display of routing limits and legacy rides.
- `client/src/safety-map.jsx`: optional road geometry overlay; Safety map behavior preserved.
- `server/transport-routing.js`: provider calls, validation, modes, fare computation, cache and safe errors.
- `server/transport.js`, `transport-models.js`: authenticated search/quote routes, accepted fare check and persisted road data.
- `tests/helpers/road-provider.js`: explicit offline provider fixture; never enabled in production.
- `tests/road-routing.test.js`: map service checks.
- Existing `tests/transport*.test.js`: adjusted to road routing with a mocked provider.
- `tests/shared-account.integration.test.js`: one session across four modules, no duplicate users and no moderator privilege.

## Provider references
- Address search/API key: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
- Road routing/modes: https://apidocs.geoapify.com/docs/routing/
- Provider projects: https://myprojects.geoapify.com/
- Plans/usage limits: https://www.geoapify.com/pricing/

Check your provider account's current allowance. This project does not create an account, buy a plan, guarantee worldwide address coverage or authorize charges.
