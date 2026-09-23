# HerConnect — Issues 8–14: central hub update

## What is included
| Issue | Implemented |
| --- | --- |
| 8 | Shared plum, rose, ivory and lavender visual system; refreshed cards, navigation, buttons, forms and mobile styles across existing pages; accessible focus and reduced-motion support. |
| 9 | Repeatable demo seed: 6 shops, 30 products and 90 purchase-linked reviews; 20 service profiles with 40 completed bookings; 36 new safety reports; 12 driver profiles, 6 passengers and 36 completed rides/reviews on a fresh database. |
| 10 | Optional private city, occupation, bio, blood group, emergency contact name/number/relationship. SOS uses the profile contact. |
| 11 | Private person descriptions and witness notes; up to 3 private JPEG/PNG/WebP photos per report; map location and incident time; weighted red/amber/purple report-activity circles. |
| 12 | Suggestions after 2 characters: instant built-in Bangladesh area/landmark matches including Bangla aliases; live Geoapify suggestions when available; visible provider errors and local fallback. |
| 13 | Services & talent: software engineering, data analysis, marketing, design, writing, tutoring, photography, accounting, career coaching, translation, event planning, styling and existing household services. |
| 14 | SOS page plus persistent shortcut: open emergency/trusted-contact dialler, capture location, share/copy message, open SMS draft, support links. |

No dependencies added. No package/lockfile, MongoDB URI, Leaflet vendor file or prior hiring fix is replaced. The existing map navigation animation error is fixed. The update was built against the delivered Issues 6–7 version, not a fresh checkout of your private repository (GitHub access returned 404). Always run the patch check first.

## Installation — Windows CMD
Your last confirmed branch is integration/final-merge-check. These steps leave main unchanged.

1. Extract this ZIP into:
D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect-Issues-8-14-Update
The folder must directly contain issues-8-14.patch.

2. Stop the app, enter the existing project and check work:
```cmd
cd /d "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect1"
git status
```
Continue with a clean working tree. Commit unrelated changes separately; do not discard them.

3. Start from your combined branch:
```cmd
git switch integration/final-merge-check
git switch -c feature/hub-expansion
```
If you have since completed the final main merge, instead update main with git pull --ff-only origin main and create feature/hub-expansion from that updated main. Do not apply this update to an older module-only branch.

4. Check, then apply:
```cmd
git apply --check "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect-Issues-8-14-Update\issues-8-14.patch"
git apply "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect-Issues-8-14-Update\issues-8-14.patch"
git status
git --no-pager diff --stat
```
No output from --check means success. If it fails, STOP and share the error. Do not force it or blindly copy replacement files over newer code. replacement-files is provided for review/recovery only.

5. Existing local .env: keep MONGODB_URI, choose DEMO_PASSWORD of 12+ characters (maximum 72 UTF-8 bytes) and keep your real GEOAPIFY_API_KEY. NODE_ENV should be development. Do not commit .env. New optional fields do not require a destructive migration.

6. Populate demo records (opt-in; intended for your development database):
```cmd
node --env-file=.env scripts/seed-hub.js
```
This runs all four existing seed workflows with expanded datasets. Existing records and passwords are not overwritten. Repeating the command does not duplicate records. Old safety demos remain, so an upgraded database can contain 46 rather than 36 demo reports. Old Rickshaw demo records remain as history and do not appear among currently supported new ride options. Existing demo data is not refreshed to a new date on every run; it naturally ages out of the 180-day risk window.

7. Verify and run:
```cmd
npm run build
npm test
npm run dev
```
Open http://127.0.0.1:5173/. No npm install is needed when your existing dependencies are present. Leave the terminal running. Tests use a disposable database, not your Atlas data.

## Demo accounts
All use the DEMO_PASSWORD chosen when that individual account was FIRST created. Changing the environment variable does not reset existing account passwords.
- Marketplace: buyer1@herconnect.demo through buyer3@herconnect.demo; original shop accounts nadia, farhana, sadia, rumana @herconnect.demo plus tania@herconnect.demo and nusrat@herconnect.demo.
- Services: hiringbuyer@herconnect.demo; worker1@herconnect.demo through worker20@herconnect.demo. The new professional services are worker7 through worker20.
- Safety: safetyreporter@herconnect.demo. My reports contains the fictional reporter's submissions; public Demo mode shows the fictional areas.
- Transport: ridepassenger@herconnect.demo and ridepassenger2@herconnect.demo through ridepassenger6@herconnect.demo; driver1@herconnect.demo through driver12@herconnect.demo.

Safety and transport browsing start in clearly labelled Demo mode in this course build. Switch it off to inspect real submissions/drivers. Personal histories are private: sign in to a demo passenger/customer to see that account's records. There is intentionally no public passenger directory.

Drivers start offline. For a live classroom ride, sign into a fictional driver in another browser, select an address/map point in its Demo location form, send that location and go online. Keep its location fresh and use a nearby passenger pickup with Demo mode enabled. Presence is not fabricated just to fill the page. Never use a real emergency call to test the SOS page.

## Manual acceptance checklist
- Check dashboard, authentication, marketplace, services, safety, transport, account and SOS at desktop and mobile widths.
- Verify all 4 module links and the persistent SOS shortcut.
- Save blood group and emergency contact, refresh the page, and check the values persist.
- SOS: deny location permission and confirm calling stays available; allow permission and check timestamp/accuracy. Share or open an SMS draft only with an agreed test contact. Confirm it never says a message was sent automatically.
- Search Gul, Mir, Dhan, UIU or ধান: local suggestions should appear immediately. Try a new address with a working Geoapify key. Select with mouse or keyboard. Change the input and confirm the old fare clears.
- Temporarily remove the Geoapify key, restart the API and confirm local suggestions remain. Road routing must display its error; it must not substitute a straight-line fare. Restore your key afterwards.
- Create a report with public description and private person/witness details. Open its detail page to upload a photo. A second ordinary account must not see private text, photo metadata or photo bytes. Report owner can remove photos. Moderators can view them.
- Open Area insights with Demo enabled. Check multiple areas, categories and dates; red, amber and purple activity levels. Disable Demo to confirm the fictional reports do not affect real-area indicators.
- Filter Services by Marketing, Software Engineering and Data Analysis. Check profiles and bookings remain functional.
- Confirm marketplace/booking/ride histories and previously fixed features still work.

## Safety-data rules
Private evidence is stored in MongoDB, not in the publicly served upload folder. Uploads accept decoded JPEG/PNG/WebP only, up to 5 MB each and 3 per report. Images are resized and converted to JPEG with metadata removed. Report owner and moderators can retrieve photos; other users and anonymous requests are blocked. Public report descriptions and public area labels are still public, so identifying details belong in the private fields. Do not upload intimate photos or unrelated documents.

Blood group is optional and self-reported. The new private profile fields are included in the owner's session/profile response, not public seller or report views. SOS uses the profile contact. Existing transport-specific emergency contact settings remain separate to preserve previous behavior; update them separately if used.

## Risk-area method
Reports in the last 180 days are grouped by the existing density algorithm: at least 3 reports in a 500 m neighbourhood. Connected clusters can cover a wider area; the displayed 500 m circle around their approximate centre is an indicator, not an exact danger boundary.
Weights: assault 5, stalking 4, harassment 3, verbal abuse 2, unsafe-area concern 2, other 1. Recency multipliers: last 7 days 1; 8–30 days .6; 31–90 days .3; 91–180 days .1. Add weighted values in each cluster. Red: score >=10; amber >=5; purple lower clustered activity. Hidden and future reports are excluded; demo and real reports are queried separately. The endpoint processes at most 2,000 recent reports and reports that limit to the interface.

These are transparent classroom heuristics, NOT validated crime predictions or official unsafe-area designations. Pending community reports can contribute, so false/duplicate submissions can bias the map. No reports does not mean an area is safe. New reports and moderation changes affect the next fetch.

## Search scope and limitations
29 approximate public area/landmark entries provide immediate fallback matching in English/Bangla. They are labelled approximate: confirm the actual street/pickup on the map. They do not replace Google's global address database. Live addresses and road routing still need a working server GEOAPIFY_API_KEY and network access. Failed provider authentication, restrictions or quota must be corrected in Geoapify; no UI patch can supply a valid key. No real key was available here for live provider verification.

## SOS scope
The dialler and SMS links require a supported device/app. Location and clipboard/share need browser support and permission. Shared location is a timestamped snapshot, not background tracking. No automatic SMS, police/ambulance dispatch or staffed emergency monitoring is claimed or implemented. The user must place the call or send the drafted message.

## Validation completed
- Production build passed.
- 36 automated tests passed, including MongoDB integration tests for profile persistence and evidence authorization, conversion, limits and deletion.
- This environment required disabling MongoDB Unix sockets for local test processes; no change to your Atlas settings. Your Windows command remains npm test.
- Demo seed ran twice against an isolated test database; second run preserved counts. Fresh counts: 49 users, 30 products, 20 service profiles, 40 bookings, 36 reports, 12 drivers and 36 rides.
- Browser checks passed with API fixtures: dashboard/login routing, address keyboard/click selection, provider-failure local fallback, quote invalidation, ride flow, SOS permission-denial handling, profile/SOS pages, 390/320 px layouts. Screenshots included. Tiles were blocked in automated browser tests; real provider calls were not verified.
- Existing marker-image warning and unrelated Mongoose deprecation warnings may remain in your merged repository.

## Commit and push
Review changes and tests first. Stage the specific paths listed in FILES.txt, including new files. Do not stage .env, node_modules, dist or database files.
```cmd
git status
git add client/src server shared scripts/seed-hub.js tests/hub.test.js tests/safety-route.test.js tests/safety.integration.test.js docs/ISSUES-8-14.md
git diff --cached --stat
git commit -m "Expand HerConnect hub with private safety tools and professional services"
git push -u origin feature/hub-expansion
```
The git add command assumes this branch contains only the reviewed update; inspect the staged list. Open a PR into integration/final-merge-check if that remains your integration branch. If you already finalized it, use the current combined branch you chose as your base. Do not merge to main until you deliberately accept the complete update. Keep teammate attribution honest: describe supplied implementation, your review, testing and any edits accurately.

## Design references
- Uber Safety Toolkit: clear emergency access, contact and location-sharing patterns; regional functionality is not copied or claimed: https://www.uber.com/us/en/ride/safety/
- Pathao safety information: https://pathao.com/safety/
- Geoapify address autocomplete contract: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
- Bangladesh National Emergency Service record: https://www.itu.int/net4/wsis/archive/stocktaking/Project/Details?projectId=1514906121

This is an expanded course prototype, not a production emergency-response or commercial ride-hailing system. No changes were pushed to your repository by this delivery.
