# Safety Reporting — installation, testing and Git

This is an incremental update for HerConnect1 with Marketplace + Worker Hiring already installed. It includes Safety Reporting and keeps Safe Transport as the remaining module.

**Do not merge into main. Work starts from feature/worker-hiring.** This is your agreed workflow until the whole project is complete and checked. Ignore older guides that tell you to merge main now.

## 1. Prepare your branch
Stop the development server with Ctrl+C. Open PowerShell in your existing HerConnect1 project.

```powershell
git status
git switch feature/worker-hiring
git status
```
If changes exist, review and commit them on their intended development branch first. Do not discard them. Your hiring end-time fix should already be present: server/hiring.js must use dates.endAt in fitsAvailability. The safety update does not overwrite hiring.js or your edited hiring integration test.

Once the working tree is clean:

```powershell
git switch -c feature/safety-reporting
git branch --show-current
```
Expected: feature/safety-reporting. This branch includes Marketplace AND Hiring because it starts from feature/worker-hiring. Do not create it from main. If the safety branch already exists from an interrupted installation, use git switch feature/safety-reporting instead of creating it again.

## 2. Apply the update
Extract HerConnect-Safety-Reporting-Update.zip to a separate folder outside your project. Copy only safety-reporting.patch into the root of HerConnect1 (beside package.json).

```powershell
git apply --check .\safety-reporting.patch
git apply .\safety-reporting.patch
```
A successful check prints nothing. Run the second command only if the check succeeds. If it reports a conflict, stop and share the output; do not force the patch or reset your files. The archive also contains replacement-files for manual comparison, not a second application to perform after the patch.

After success, remove only the copied patch:

```powershell
Remove-Item .\safety-reporting.patch
git status
```
The module belongs inside the existing project, not in a second nested application. No npm install, package changes, new .env settings, or API keys are needed. Existing npm dependencies must already be installed. Your local Nodemailer/Sharp upgrades are preserved.

## 3. Add demonstration content (optional, recommended for walkthrough)
Keep your current MONGODB_URI and DEMO_PASSWORD in .env. Run:

```powershell
node --env-file=.env server/seed-safety.js
```
Creates 10 fictional reports, 5 fictional facilities with no invented telephone numbers, and the national emergency contact. It does not overwrite existing records, reset passwords, or seed Marketplace/Hiring again.

Demo login: safetyreporter@herconnect.demo
Password: the DEMO_PASSWORD used when that account was first created. Your existing admin account manages this module too. A newly signed-up member can submit reports without the seed.

Real reports/resources show by default. Turn on **Show fictional demo data only** on reports, insights, resources, or admin queue to inspect seeded examples. Two clusters should appear shortly after seeding. Seed timestamps do not reset on reruns; incidents older than 180 days no longer form current hotspots.

## 4. Build and run automated checks

```powershell
npm run build
node --test tests/safety.test.js tests/safety-route.test.js tests/hiring.test.js tests/cart.test.js tests/guards.test.js
node --test tests/safety.integration.test.js
node --test tests/hiring.integration.test.js
```
The database-independent command contains 11 checks. The safety integration file contains one scenario exercising multiple API operations. Integration tests start their own disposable local MongoDB replica set; they do not use .env or your Atlas database. The first run may download MongoDB. Do not replace the test connection with your normal Atlas URI.

Authoring verification: production build and 11 database-independent checks pass. Browser flows were checked with simulated API responses. Real MongoDB integration could not start here (open: Operation not permitted, exit code 100); it is included for your Windows computer. Passing browser tests does not establish database persistence or transaction correctness. Your earlier Hiring integration run passed after the dates.endAt fix.

## 5. Start the complete application

```powershell
npm run dev
```
Open http://localhost:5173. Sign in, then open **Safety & support** from the dashboard or sidebar.

Direct pages:
- /safety — public feed and filters
- /safety/new — submit a report (login required)
- /safety/mine — your reports (login required)
- /safety/reports/REPORT_ID — report detail
- /safety/zones — computed area insights
- /safety/resources — support directory
- /admin/safety — admin report queue

Map tiles need internet access. If tiles cannot load, coordinates and text inputs remain usable. Geolocation is optional: allow it only if you want the browser to supply your location. No API key needed. Do not click the real emergency call link merely to test a call; inspect its tel:999 destination instead.

## 6. Manual checks before committing

| Action | Expected result |
| --- | --- |
| Open dashboard | Marketplace, Hiring, Safety active; only Transport coming soon |
| Public feed, demo toggle | Only the selected real/fictional dataset appears |
| Category and area filters | Matching reports; useful empty state when none |
| Submit anonymous report | Saved as pending; name hidden in an incognito window |
| Submit named report | Display name public; no email, account ID or private notes public |
| Pick map point, then edit coordinates | Map follows point; required location confirmation |
| Future date or invalid coordinates | Submission prevented/rejected |
| My reports | Only the logged-in user's submissions, including hidden reports |
| Reporter detail | Exact coordinates and private moderation history visible |
| Sign in as admin, open report | Reporter name/email visible; private decision form |
| Mark reviewed, then resolved | Status and history update for reporter; no skipped progression |
| Hide a report | Removed from public feed/hotspots; direct public URL returns not found |
| Two admins review same version | Second stale update rejected; refresh before retrying |
| Demo area insights | Two fictional clusters; category counts displayed |
| Real area insights | Demo reports excluded; fewer than 3 nearby reports form no cluster |
| Resource search/filter | Matching facility types; demo facilities labelled and cannot be called |
| Use my location | Permission/denial handled; coordinate-bearing resources sort by straight-line distance |
| Admin resource add/edit/delete | Changes persist after reload; source required for verified entries |
| Reload or restart application | Saved reports and moderator decisions remain in MongoDB |
| Marketplace + Hiring | Navigation, bag, bookings and logout still work |

For privacy checks, use an incognito window or another account. Viewing your own report intentionally shows private fields. Do not include actual sensitive incidents in a classroom demo.

## 7. Commit and push only the safety branch
Review all changes first. Update README.md with your actual local test results once known.

```powershell
git branch --show-current
git status
git --no-pager diff --stat
git --no-pager diff
```
Expected branch: feature/safety-reporting. Stage only module files:

```powershell
git add README.md client/src/auth-pages.jsx client/src/App.jsx client/src/safety-pages.jsx client/src/safety-map.jsx client/src/safety.css client/src/vendor/leaflet server/app.js server/index.js server/safety.js server/safety-models.js server/seed-safety.js shared/safety.js tests/safety.test.js tests/safety-route.test.js tests/safety.integration.test.js docs/SAFETY.md docs/SAFETY-SETUP.md docs/REQUIREMENTS.md docs/ARCHITECTURE.md docs/API.md
git --no-pager diff --cached --stat
git status
git commit -m "Add safety reports, area insights and support directory"
git push -u origin feature/safety-reporting
```
Do not stage .env, node_modules, dist, database data, or downloaded update archives. Verify:

```powershell
git status
```
Expected: working tree clean and branch up to date with origin/feature/safety-reporting. If other unrelated changes remain, review them separately.

**Stop here. Do not merge, switch to main to develop, or push to main.** GitHub may offer a pull request; no merge is needed. Keep working on this development branch. The next module branch should start from this one so it carries all completed work.

Each team member should use their own Git identity, make real contributions and commit regularly on their assigned development branch. Do not create artificial commits or commit as someone else.

## Files added and changed

| Folder/file | Purpose |
| --- | --- |
| shared/safety.js | Categories, resource types, Haversine distance, DBSCAN clustering |
| server/safety-models.js | Report and resource MongoDB collections/indexes |
| server/safety.js | Validation, privacy, authenticated report actions, public queries, admin actions |
| server/seed-safety.js | Additive optional demo and sourced emergency-resource seed |
| server/app.js, server/index.js | Mount API, initialize collections, allow map tiles in CSP |
| client/src/safety-pages.jsx | Feed, form, own/detail pages, insights, directory, moderation |
| client/src/safety-map.jsx | Leaflet map wrapper with coordinate and tile-failure support |
| client/src/safety.css | Responsive rose/lilac/sage design |
| client/src/vendor/leaflet | Bundled Leaflet 1.9.4 and licence/images |
| client/src/App.jsx | Dashboard/sidebar links and routes |
| client/src/auth-pages.jsx | Updated help, privacy and terms text; account forms unchanged |
| tests/safety*.test.js | Pure rules, actual route with mocked storage, full MongoDB integration |
| docs/SAFETY.md | Scope, privacy model, APIs, limitations and map/source references |

Safety Reporting is a community information feature. It neither dispatches responders nor confirms allegations. Resource verification is a moderator's documented check, not an automated guarantee. Anonymous reports hide account identity publicly but cannot hide identifying information written into public text.
