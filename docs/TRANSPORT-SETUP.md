# Safe Transport — final module installation and testing

This update adds the fourth module to your existing HerConnect1 application. It requires Marketplace, Hiring and Safety Reporting already installed. It is not a separate app and is not a replacement for your whole project.

**Main remains unchanged. Create feature/safe-transport from feature/safety-reporting.** Do not merge or push to main just because all module source files now exist. Finish local testing and resolve issues first; only Mahin decides when to merge.

## 1. Get the latest Safety branch
Stop npm run dev with Ctrl+C. Open PowerShell inside:

```powershell
cd "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect1"
git status
```
If there are uncommitted changes, review and commit them on their intended development branch before switching. Do not discard or overwrite them.

```powershell
git fetch origin
git branch -a
```
If feature/safety-reporting already exists locally:

```powershell
git switch feature/safety-reporting
git pull --ff-only origin feature/safety-reporting
```
If it exists only on GitHub (for example, your teammate pushed it):

```powershell
git switch --track origin/feature/safety-reporting
```
If the Safety branch is not on GitHub or your PC yet, complete the Safety installation/push first. Do not start from main or feature/worker-hiring; this patch uses the shared map introduced by Safety Reporting.

Check that your working tree is clean, then:

```powershell
git switch -c feature/safe-transport
git branch --show-current
```
Expected: feature/safe-transport. If this branch already exists from an interrupted installation, switch to it rather than creating it again, and inspect what is already installed.

## 2. Apply the update
Extract HerConnect-Safe-Transport-Update.zip into a separate folder. Read START-HERE.md there. Copy only safe-transport.patch into HerConnect1 beside package.json.

```powershell
git apply --check .\safe-transport.patch
```
Success prints nothing. Only then run:

```powershell
git apply .\safe-transport.patch
Remove-Item .\safe-transport.patch
git status
```
If the check fails, stop and share the error. Your teammate may have edited one of the shared files; those changes must be preserved. Do not force apply, reset, or blindly overwrite with replacement-files. The archive includes replacement-files for review/manual comparison only; do not apply both methods.

No package.json, package-lock.json or .env changes are included. Your security dependency upgrades and the Hiring dates.endAt fix remain intact. A PC with an existing working installation needs no new dependencies; a fresh clone still needs npm ci.

## 3. Seed optional classroom examples
Your existing .env needs MONGODB_URI and DEMO_PASSWORD as before. No new settings or API keys.

```powershell
node --env-file=.env server/seed-transport.js
```
The additive seed creates 4 fictional approved driver profiles, 1 demo passenger and 8 completed demo rides/reviews. New drivers start OFFLINE so the app does not match users to unattended fake drivers. It does not overwrite existing records or reset passwords/availability on reruns.

| Login | Purpose |
| --- | --- |
| driver1@herconnect.demo | Car — Farhana Rahman |
| driver2@herconnect.demo | CNG — Nusrat Jahan |
| driver3@herconnect.demo | Motorbike — Samira Akter |
| driver4@herconnect.demo | Rickshaw — Maliha Hasan |
| ridepassenger@herconnect.demo | Demo passenger with completed ride history |
| Your existing admin email | Driver applications and alert moderation |

Use the DEMO_PASSWORD chosen when each demo account was first created. Demo phone fields are empty, licence/vehicle numbers say DEMO, and sample reviews are labelled fictional. No real driver's identity is represented by these records.

## 4. Build and run tests

```powershell
npm run build
node --test tests/transport.test.js tests/transport-route.test.js tests/safety.test.js tests/safety-route.test.js tests/hiring.test.js tests/cart.test.js tests/guards.test.js
node --test tests/transport.integration.test.js
node --test tests/safety.integration.test.js
node --test tests/hiring.integration.test.js
```
The database-independent command contains 15 checks, including 4 new transport checks. The transport integration file contains one long scenario with many assertions (approval, concurrent assignment, participant privacy, alerts, status flow, reviews, expiry and suspension). Each integration file starts a disposable local MongoDB replica set and never reads your normal Atlas URI. The first run may download MongoDB. Do not replace test connection code with your shared Atlas URI.

Authoring results: production build and 15 database-independent checks pass. Desktop/mobile browser workflows were checked with simulated API and browser location responses; external map tiles were blocked during automated checks. The actual transport MongoDB test could not start in this environment (process exit code 100), so concurrency/persistence integration is not claimed as passed here. Run it on your PC and record its actual result. Source implementation is complete; full-project acceptance testing remains required.

## 5. Run the complete project

```powershell
npm run dev
```
Open http://localhost:5173. All four dashboard cards now open their modules.

- /transport — pickup/dropoff, vehicle, fare estimate and nearest driver request
- /transport/drivers/DRIVER_PROFILE_ID — public driver summary and reviews
- /transport/drive — driver application, online/offline, incoming ride and location sharing
- /transport/rides — passenger/driver history
- /transport/rides/RIDE_ID — live ride screen, status actions, alerts and review
- /transport/contact — your private emergency contact
- /admin/transport — driver approval and alert review

The map uses the bundled Leaflet library and online OpenStreetMap tiles. No map key is needed. Addresses are entered manually; there is no geocoding or road-route service. You can pick map points or type coordinates. The dashed line is straight-line distance, not directions.

## 6. Two-browser demo: request → completion
Use a normal browser window for the driver and an incognito window (or another browser) for the passenger. Two ordinary tabs share cookies and cannot reliably represent two accounts.

1. Start the app and seed as above.
2. Normal window: sign in as driver1@herconnect.demo. Open Driver space.
3. In the labelled demo-location form, keep latitude 23.8103 and longitude 90.4125. Click Send demo location. This goes online without requiring your real device position. Only fictional profiles have this manual control.
4. Confirm the profile says approved, online and location fresh. Matching requires a location update within the past 90 seconds. Send it again if you take longer preparing the next step.
5. Incognito window: sign in as ridepassenger@herconnect.demo. Open Safe transport.
6. Select Car and enable Use fictional demo drivers only. Without that toggle the request correctly excludes demo drivers.
7. Enter pickup address "Demo pickup, Dhaka" and dropoff address "Demo dropoff, Dhanmondi". Keep the default coordinates or pick valid points near the demo driver's location. Check the location confirmation.
8. Click Calculate fare, then Request nearest driver. A requested ride should appear with the assigned driver's name. No live driver dot is disclosed yet.
9. Driver window: Driver space checks for requests every 5 seconds. Click Open assigned ride, then Accept ride within 2 minutes.
10. Passenger window: the page polls every 5 seconds and shows accepted status and the timestamped driver position.
11. Driver: send a new demo latitude such as 23.812 and longitude 90.4125. Passenger should see the position update on the next poll. This is labelled demo input, not actual GPS movement.
12. Driver: click Start ride. Both windows should show ongoing.
13. Driver: click Complete ride. Both show completed; participant slots are released. The live dot is no longer exposed. A fresh approved driver can match again.
14. Passenger: publish one review. A second review for the same ride must not be allowed. Open the driver's public page to see the updated average.

For real browser location testing, Go online with my location asks permission. Leave Driver space open, or explicitly click Share live location on the ride screen. Updates are sent every 15 seconds while that page is open. Navigating away/closing the browser stops updates. Pause location sharing does not cancel a ride. An update older than 90 seconds is marked stale and makes a free driver ineligible for matching. This is not background mobile GPS tracking.

## 7. Panic alert and emergency-contact test
Do this while a ride is requested, accepted or ongoing.

1. Passenger opens Emergency contact, saves a contact name and a number they are authorized to use, then returns to the ride. The saved contact is visible only to that account.
2. Use Record alert using pickup location for a classroom test. The app explicitly labels it as a pickup fallback, not a confirmed current location. The alternative button asks for the browser's current position.
3. Confirm the alert appears on the ride screen for both participants.
4. Admin opens Transport moderation → Ride alerts. The active alert should appear with time, reported point/source and reporter details.
5. Admin records a resolution note and resolves it. Alternatively the triggering user can resolve their own alert. The other participant cannot silently resolve someone else's alert.
6. Confirm the recorded status changes. Ending a ride does not automatically resolve an alert.
7. Inspect call-link destinations without placing a test call to a real emergency service. No button sends SMS or contacts police automatically.

## 8. Checks for important failure cases

| Test | Expected |
| --- | --- |
| Two passengers request the one available driver together | At most one is matched; the other gets no driver |
| Active driver requests a passenger ride | Rejected: already participating in a ride |
| Active passenger submits another ride | Rejected; duplicate same request key returns original ride |
| Driver attempts online/offline or profile edit while active | Rejected; cannot bypass the active-ride lock |
| Driver does not accept within 2 minutes | no_driver_available; both slots released; driver offline |
| Passenger cancellation or driver rejection | Terminal status and slots released; driver rejection goes offline |
| Unrelated account opens a ride URL | Not found; no pickup/dropoff/location/alert disclosure |
| Unapproved/suspended or stale-location driver | Excluded from new matching |
| Passenger attempts accept/start/complete | Rejected; those actions belong to assigned driver |
| Driver tries completion before starting | Rejected |
| Fake fare/driver/status submitted to API | Ignored; backend calculates and matches |
| Coordinates outside allowed Bangladesh rectangle | Rejected |
| Pickup/dropoff less than 0.1 km or over 100 km apart | Rejected |
| Completed ride review by driver/unrelated user | Rejected |
| Driver public profile | No licence, email, phone or exact current location |
| Fresh profile application | Pending and offline until explicit admin approval |
| Admin changes profile to suspended during request | Driver cannot accept; passenger can cancel or request expires |
| App restart after an expired request | Startup sweep releases stale requested assignment |
| Marketplace, Hiring, Safety regression check | Existing navigation and workflows remain usable |

Requests do not automatically switch to another driver after rejection/expiry. Start a new request. The "no driver" result is an honest outcome if all drivers are offline, stale, busy, too far away, or in the other demo/real mode.

## 9. Commit/push only the transport feature branch
Update README.md or a test-results document with your actual local verification results. Never mark the database test passed merely because the source was delivered.

```powershell
git branch --show-current
git status
git --no-pager diff --stat
git --no-pager diff
```
Expected branch: feature/safe-transport. Stage only the release files:

```powershell
git add README.md client/src/App.jsx client/src/auth-pages.jsx client/src/safety-map.jsx client/src/transport-pages.jsx client/src/transport.css
git add shared/transport.js server/app.js server/index.js server/transport.js server/transport-models.js server/seed-transport.js
git add tests/transport.test.js tests/transport-route.test.js tests/transport.integration.test.js
git add docs/TRANSPORT.md docs/TRANSPORT-SETUP.md docs/REQUIREMENTS.md docs/ARCHITECTURE.md docs/API.md
git --no-pager diff --cached --stat
git status
git commit -m "Integrate safe transport rides, tracking and alert workflows"
git push -u origin feature/safe-transport
```
Do not stage .env, node_modules, dist or archives. If a teammate integrates this update, they use their own Git name/email/account and document their real review/testing work. The previous Git collaboration guide applies, replacing starting branch with feature/safety-reporting and new branch with feature/safe-transport.

After a teammate pushes, you can download it into your existing folder:

```powershell
git fetch origin
git switch --track origin/feature/safe-transport
```
If the local transport branch already exists:

```powershell
git switch feature/safe-transport
git pull --ff-only origin feature/safe-transport
```
Use a clean working tree first. If the fast-forward pull or patch check fails, share the error rather than force/reset. Git switching updates the files in the same project folder; no separate module app is run.

**Stop before merging main.** All four module implementations are now present, but final project testing, outstanding bug fixes and presentation preparation still remain. Your instruction to keep main unchanged remains in effect.

## Folder map

| File | Purpose |
| --- | --- |
| shared/transport.js | Vehicle/fare constants, distance ranking, fresh-location and status rules |
| server/transport-models.js | Driver, ride, participant lock, alert, review and emergency-contact collections |
| server/transport.js | Validated API, transactional assignment/release, privacy and moderation |
| server/seed-transport.js | Additive fictional accounts, offline profiles, ride/review examples |
| server/index.js | Initialize collections and requested-ride expiry sweep |
| server/app.js | Mount transport API under /api/transport |
| client/src/transport-pages.jsx | Request, driver console, ride detail/history, contacts, reviews and admin |
| client/src/transport.css | Responsive rose/lilac transport styling |
| client/src/safety-map.jsx | Shared map with optional transport labels/colours/straight-line overlay |
| client/src/App.jsx | All four dashboard links and routes active |
| client/src/auth-pages.jsx | Help/privacy/terms reflect fourth module |
| tests/transport*.test.js | Rules, route check with mock storage, real MongoDB integration scenario |

See TRANSPORT.md for the complete rules and limits, including the demo fare constants, timing, privacy and panic-alert scope.
