# HerConnect — Issues 6 and 7 update

## What changed
- Removed latitude/longitude inputs from passenger booking and fictional driver location forms. Search an address, use current location for pickup, or select a map point. Coordinates remain internal because routing requires them.
- Pickup and destination search appear before the map. Suggestions start after 2 characters and a 250 ms pause. Keyboard selection, cancelled stale requests, and selection validation remain supported. Search errors now identify missing/rejected provider configuration or quota exhaustion; a retry button is available.
- Removed Rickshaw from new ride requests, driver applications and directory results. Existing Rickshaw records and ride history remain readable. Existing Rickshaw drivers must select a supported vehicle and submit for review to offer new rides. No database deletion or migration is performed.
- Kept Car, CNG and Motorbike. New demo driver seeds use these types. Existing seeds are not overwritten.
- Fare panel shows base fare, exact returned road distance in metres, distance charge, rounding and total in BDT. Rates are project demonstration rates, not official transport prices.
- Removed Marketplace NEW badge.

## Fare policy
| Vehicle | Base (BDT) | Per road km (BDT) |
| --- | ---: | ---: |
| Car | 80 | 30 |
| CNG | 50 | 22 |
| Motorbike | 30 | 15 |

Distance charge is rounded to paisa; total is rounded to the nearest taka. No time charge, surge, toll or extra fee is added. Example: 2 km by Car = 80 + 60 = BDT 140. Travel time is an estimate, not a billed item. CNG uses a car-route approximation. This update makes the existing price policy explicit; it does not invent commercial rates or payments.

## Before applying
This incremental patch targets the previously supplied Issues 3–5 source. I could not inspect your current private GitHub branch; use git apply --check to detect differences. It does not replace package.json, package-lock.json, Leaflet vendor files, .env, or existing hiring fixes. No new dependencies. Your source-map fix remains intact.

PR #5 must be merged into feature/safety-reporting first. Keep PR #4 to main unmerged.

## Apply in Windows CMD
1. Extract this ZIP to your Desktop as HerConnect-Issues-6-7-Update (the folder containing issues-6-7.patch). Stop the running app with Ctrl+C.
2. In the project terminal:

```cmd
cd /d "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect1"
git status
```

Continue only with a clean working tree. Commit any unrelated work separately first; do not discard it.

```cmd
git switch feature/safety-reporting
git pull --ff-only origin feature/safety-reporting
git switch -c fix/transport-search-fares
```

3. Check and apply (adjust the Desktop path if your extraction folder differs):

```cmd
git apply --check "%USERPROFILE%\Desktop\HerConnect-Issues-6-7-Update\issues-6-7.patch"
git apply "%USERPROFILE%\Desktop\HerConnect-Issues-6-7-Update\issues-6-7.patch"
```

If --check reports an error, STOP and share its output. Do not force the patch or overwrite whole files. Replacement files are included for review, not blind copying over newer code.

## Address search setup and diagnosis
Your project-root .env must have this entry with your own real key:

```dotenv
GEOAPIFY_API_KEY=YOUR_REAL_GEOAPIFY_KEY
```

Keep existing MongoDB settings. Do not share or commit .env. Restart npm run dev after editing .env. The backend makes the provider request; restrictions must allow that backend request. A key limited to browser referrers can reject a server request.

Create/check your key: https://myprojects.geoapify.com/
Official autocomplete documentation: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/

Sign in, then type Dh or Gul in Pickup. A suggestion list should appear after a short pause. Choose an item; typing text alone does not identify a precise location. If nothing appears, read the status below the field. If the message is unclear, open browser Developer Tools > Network and inspect /api/transport/places?q=...; share the status and error message, never your API key. Missing key, provider rejection, exhausted quota and network failures cannot be fixed by changing the dropdown styling. Places coverage depends on Geoapify; this is not a copy of Google's places database. Map selection remains available if search is unavailable, but calculating a road fare still requires the routing provider.

## Verify
```cmd
npm run build
npm test
npm run dev
```

Open http://127.0.0.1:5173/ and leave the terminal running.
- No Marketplace NEW badge.
- No coordinate entry on passenger or demo-driver forms.
- Search after two characters; select with mouse or ArrowDown/Enter.
- Enter a different destination: old route quote clears immediately.
- Calculate without selecting both locations: clear prompt, no ride created.
- Map pickup/dropoff and current-location pickup still work.
- Only Car, CNG, Motorbike available for new requests and driver applications.
- Fare breakdown adds up to the displayed total; existing ride history remains readable.
- Test at desktop and mobile widths, with a real provider key.

Verification performed here: production build passed; 7 focused routing/transport tests passed with simulated provider responses. Browser verification could not start because Chromium crashed in this environment. Live Geoapify service was not verified because no real key was supplied. Full MongoDB integration results are not claimed; run npm test on your PC before merging.

## Commit and push
After your checks pass:

```cmd
git status
git add client/src/App.jsx client/src/address-search.jsx client/src/transport-pages.jsx client/src/transport.css server/transport.js server/transport-routing.js server/seed-transport.js shared/transport.js tests/road-routing.test.js docs/ISSUES-6-7.md
git commit -m "Simplify transport locations and fares and remove marketplace badge"
git push -u origin fix/transport-search-fares
```

Create a pull request with base feature/safety-reporting and compare fix/transport-search-fares. Record actual build, test and manual results. Review changes, then choose Create a merge commit after accepting them. Do not target main.

After merging:
```cmd
git switch feature/safety-reporting
git pull --ff-only origin feature/safety-reporting
```

No GitHub changes were made by this delivery. No database migration or reseed is needed.
