# HerConnect+ — Issues 15–18 update

This is an incremental update for the project with Issues 8–14 already applied. It is not a complete replacement project. Apply the patch inside HerConnect1. Do not create a second application folder.

## What changed

| Issue | Result |
|---|---|
| 15 | New signup accepts exactly gmail.com, herconnect.local and herconnect.demo. Spaces around the email are trimmed and case is normalised. Server validation blocks lookalike domains. Existing accounts on other domains can still sign in and request password resets. |
| 16 | Guest sidebar shows My dashboard only. The dashboard previews the four modules, but opening a module or its direct URL requires login. Module APIs also require a session. Guest shop promotion, module shortcuts and shopping bag are hidden. |
| 17 | Sign in appears beside Join us in the header, including narrow mobile layouts. |
| 18 | Safety reports now lead directly to an optional photo-upload step. Photos can be labelled Incident, Person or Vehicle with a private caption. Each transport journey has a report-and-photo panel; its passenger and driver can create their own ride-linked reports and manage their own photos there. |

The standalone SOS tools, help, terms, privacy and dashboard overview remain available without login. Completing login or signup still opens the central dashboard, as in the previous update.

A domain allowlist does NOT verify email ownership. The local/demo domains are classroom addresses and normally cannot receive email. Accepting these domains does not grant moderator access or mark an account as a trusted identity.

## Image behaviour and privacy

- Save the incident report first, then optionally upload photos one at a time. Report saving and image uploading are deliberately separate steps.
- JPEG, PNG or WebP only; up to 3 images per report; maximum input size 5 MB each.
- Server checks permission before accepting the upload, decodes/resizes the image, strips metadata and stores a JPEG privately in MongoDB.
- Choose Incident, Person or Vehicle and add an optional private description of up to 200 characters.
- Reporter can upload/delete; reporter and moderators can view. Another rider or driver cannot view your photos just because they participated in the same ride.
- Photo bytes, captions, private person details and ride reference are excluded from other members' report responses.
- The ordinary report description and approximate area can appear in the signed-in community feed. Do not place a person's name or identifying details in that description; use the private fields instead.
- A ride reference is checked on the server. An unrelated account cannot attach a report to your ride.
- Reports linked to fictional demo rides remain in the demo dataset.
- If uploading fails, the report remains saved. Retry from the upload screen, My reports or the linked journey. Refreshing the upload step does not delete the saved report; open My reports to resume.
- These are supporting images for an allegation, not verified proof of guilt. No automatic police report, face recognition or emergency dispatch is added.

## Before starting

Use Windows CMD or a VS Code terminal configured as Command Prompt. These commands use CMD syntax.

Your latest confirmed development base is `integration/final-merge-check` after PR #8. This guide leaves main unchanged. If you have since merged the full project into main and moved development there, start from updated main and use main as the later PR base instead. Do not blindly use an outdated branch.

The patch is built against the delivered Issues 8–14 source. Your private GitHub working copy was not fetched for this update. `git apply --check` is therefore mandatory. If it fails, stop and share the error rather than forcing the patch or overwriting whole files.

## 1. Download and extract

Extract HerConnect-Issues-15-18-Update.zip to:

```text
D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect-Issues-15-18-Update
```

Inside that folder there should be `issues-15-18.patch`, this README, FILES.txt, replacement-files and previews. If Windows creates another nested folder, use the actual patch path in the commands.

Do not paste the complete replacement-files folder over your project. The patch preserves unrelated changes better; the replacement files are included for inspection or a guided manual repair.

## 2. Stop the app and check your current work

Stop npm run dev with Ctrl+C, then run:

```cmd
cd /d "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect1"
git status
git branch --show-current
```

Proceed when the working tree is clean. If there are existing changes, save them in a suitable commit on their current branch first. Do not discard them to make this guide work.

## 3. Update the integration branch and create a fix branch

```cmd
git fetch origin
git switch integration/final-merge-check
git pull --ff-only origin integration/final-merge-check
git --no-pager log -5 --oneline
git switch -c fix/access-incident-images
```

The integration history must include the Issues 8–14 hub expansion (PR #8 / commit 07b0022, or its merged equivalent). If the fix branch already exists because you started earlier, switch to it rather than creating it again, and check whether the patch has already been applied.

## 4. Check and apply the patch

```cmd
git apply --check "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect-Issues-15-18-Update\issues-15-18.patch"
```

No output means the check succeeded. Then:

```cmd
git apply "D:\Varsity File\UIU\4.1\Software Eng. Lab\HerConnect-Issues-15-18-Update\issues-15-18.patch"
git status
git --no-pager diff --stat
```

Expect 23 modified/new files. Ordinary diff statistics do not count untracked new files until they are staged. Do not apply the patch twice. If the PC restarts, the applied files remain on disk; check git status and resume.

## 5. Configuration and database

- Keep your existing .env unchanged.
- No new environment variables, dependencies, migration command or demo seed are required.
- Keep MongoDB and Geoapify settings you already use.
- Do not run npm run setup or reseed just for this update.
- No package.json or package-lock.json is supplied; keep your existing dependency/security updates.
- Existing accounts, reports and photos continue to work. Earlier photos display as Incident if they have no type.
- Only if node_modules is absent, run npm ci first. Otherwise proceed directly to the build.

## 6. Build and test

Run separately:

```cmd
npm run build
npm test
```

This update passed a build and 40 tests in the development environment. The MongoDB test runner used an environment-only Linux flag to disable Unix sockets; that helper is not required or supplied for your Windows setup. The tests use temporary test databases, not your Atlas application data.

Some older test fixtures previously used example.test/test.example addresses or anonymous browse requests. They are updated to allowed demo addresses and signed-in member browsing so they match the new policy. The tests still check that private data is hidden from other members and that guest requests are blocked.

If a command fails, stop before committing and send its error output. Existing unrelated warnings should not be mistaken for a failed build or test.

## 7. Run and manually verify

```cmd
npm run dev
```

Open http://127.0.0.1:5173/ and use Ctrl+F5 if necessary. Keep the terminal running.

### Guest and signup

1. Use a private/incognito browser window.
2. Confirm My dashboard is the only sidebar module-navigation item.
3. Confirm Sign in and Join us are visible in the header.
4. Click each dashboard module: it should open login.
5. Paste /marketplace, /hiring, /safety and /transport into the address bar directly: each should open login.
6. New signup with an unused gmail.com, herconnect.local or herconnect.demo address should succeed. Do not use someone else's real address.
7. yahoo.com and gmail.com.evil.test should be rejected. Existing non-allowed-domain accounts should still be able to log in.
8. After login, confirm all four modules and your existing member actions are available.

### Safety photos

1. Open Safety & support, then New report.
2. Complete the incident details, select/confirm the map point and accept the notice.
3. Click Save report & add photos.
4. Choose Incident, Person or Vehicle, select a non-sensitive test image, optionally add a caption, then upload.
5. View the saved photo, add another if desired, and remove one.
6. Refresh and reopen My reports to confirm uploaded photos persist.
7. Confirm a 4th photo is unavailable/rejected and a file over 5 MB is rejected.
8. Use another account to open the report: private photos, captions and person details must be absent. Use a moderator account to confirm moderator viewing.

### Transport photos

1. Sign in as a demo passenger/driver with a ride, or use an account with an existing journey.
2. Open Safe transport > My rides > View journey.
3. Find Report an incident & add photos.
4. Click Create journey report, describe a fictional incident, confirm its actual incident point and save.
5. Upload a test vehicle photo and return using Back to journey.
6. The photo and your report should now appear in that journey's report panel. You can add/remove photos there too.
7. Another participant in the same ride must not see your private photo panel entries. Their panel lists only reports they personally created.
8. Demo-linked reports remain labelled demo. Do not upload real accusations as demonstration data.

Transport incident reporting opens the shared Safety form, with the ride linked privately. A ride's pickup is not automatically treated as the incident location; the reporter must confirm where the incident occurred. This avoids storing a misleading location.

## 8. Stage only this update

After testing, stop the app and run:

```cmd
git branch --show-current
git status
git add client/src/App.jsx client/src/auth-pages.jsx client/src/dashboard.jsx client/src/evidence-panel.jsx client/src/hub.css client/src/safety-pages.jsx client/src/transport-pages.jsx
git add server/app.js server/auth.js server/safety-models.js server/safety.js shared/signup.js
git add tests/access.test.js tests/api.test.js tests/hiring.integration.test.js tests/hiring.test.js tests/safety-route.test.js tests/safety.integration.test.js tests/safety.test.js tests/shared-account.integration.test.js tests/transport.integration.test.js tests/transport.test.js docs/ISSUES-15-18.md
git diff --cached --stat
git diff --cached --name-only
git diff --cached --check
```

Confirm the branch is fix/access-incident-images. Confirm no .env, node_modules, database files or uploaded photos appear in the staged list. Review the actual staged diff if you have made other changes since applying the patch.

## 9. Commit and push

```cmd
git commit -m "Restrict signup and module access and add private journey evidence"
git push -u origin fix/access-incident-images
```

These commands publish the fix branch, not main.

## 10. Create and merge the pull request

In rapidul-22/herconnect, create a pull request with:

- Base: integration/final-merge-check
- Compare: fix/access-incident-images
- Title: Fix signup domains, guest access and incident photos (issues 15–18)

Suggested description (record only tests you actually ran):

```text
Why:
Guests could browse module data, sign-in was hard to find, and transport lacked a linked private evidence flow.

Changes:
- Exact signup domain allowlist, retaining login for existing accounts.
- Dashboard-only guest navigation, prominent sign-in and authenticated module pages/APIs.
- Shared labelled photo upload for Safety reports and ride-linked incident reports.
- Reporter/moderator photo privacy; other ride participants excluded.

Validation:
- npm run build: [your result]
- npm test: [your actual result]
- Guest navigation/signup: [your result]
- Safety and transport image upload, privacy and removal: [your result]
```

Review Files changed. If GitHub reports conflicts, do not force-push or blindly accept all changes from one side; inspect the conflict first. When checks and manual review pass, use Create a merge commit and confirm the merge. Main remains untouched.

## 11. Bring the merged version onto your PC

```cmd
git switch integration/final-merge-check
git pull --ff-only origin integration/final-merge-check
git status
git --no-pager log -3 --oneline
```

You should see the new merge commit and a clean working tree. Run the merged version normally with npm run dev. If the merge resolved conflicts or included additional code, rerun the build and tests on that combined result. No need to apply the patch again.

Do the eventual integration-to-main merge separately after the complete project is accepted.

## Verification performed for the delivered patch

- Production frontend build passed.
- 40 automated tests passed; zero failures or skips, using isolated temporary MongoDB instances.
- Browser checks with API fixtures: guest route guards, no guest module fetches, header buttons, rejected signup domain, report/ride linkage, failed-upload retry, photo deletion, 320/390px layouts and no JavaScript errors.
- Actual image decoding, ownership restrictions, moderator access, upload size/type limits, CSRF and demo inheritance were checked against the backend using temporary MongoDB.
- Screenshots use fictional browser fixtures. Live Geoapify, your Atlas database and your private remote branch were not used for this update.
