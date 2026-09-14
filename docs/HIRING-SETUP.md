# Worker Hiring — Install, Test and Commit

## What this update expects

Apply to the existing HerConnect1 project after the logout/multi-shop bag update. Keep your .env, MongoDB database and updated package.json/package-lock.json. This patch does not modify dependencies or marketplace business logic. No extra npm packages are required.

## 1. Prepare your branch

Stop npm run dev with Ctrl+C. In the folder containing package.json:

```powershell
git status
```

With a clean working tree:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/worker-hiring
```

If you have unfinished changes, do not discard them or run reset --hard. Commit them appropriately on their own branch first, or retain a separate backup and finish them before this update. Do not mix unrelated fixes into the hiring commit.

## 2. Apply

Extract HerConnect-Worker-Hiring-Update.zip. Copy worker-hiring.patch into your project root temporarily.

```powershell
git apply --check .\worker-hiring.patch
git apply .\worker-hiring.patch
```

The check should print nothing. If it reports an error, stop and share that error; do not force it or overwrite your work. After successful application, move worker-hiring.patch outside the repository. The replacement-files folder is for source review, not a second installation step.

## 3. Validate

```powershell
npm run build
node --test tests/hiring.test.js tests/cart.test.js tests/guards.test.js
node --test tests/hiring.integration.test.js
```

The integration test starts a separate temporary MongoDB replica set and may download its binary. It does not read .env or use your Atlas database. If it cannot start on your computer, report the error; do not label the test as passed.

## 4. Add demo profiles

Keep MONGODB_URI and DEMO_PASSWORD configured in your existing .env. Use the development database, not a production database.

```powershell
node --env-file=.env server/seed-hiring.js
```

Creates six fictional approved worker profiles, twelve completed sample bookings and eleven labelled reviews. One completed booking is intentionally unreviewed so you can immediately test the review form. Existing records/passwords are not overwritten. You do not need to rerun the marketplace seed or recreate the administrator.

| Login | Profile |
|---|---|
| hiringbuyer@herconnect.demo | Customer with sample completed bookings |
| worker1@herconnect.demo | Farida Akter — Dhanmondi; Cleaning/Cooking |
| worker2@herconnect.demo | Shaila Begum — Mirpur; Cooking/Cleaning |
| worker3@herconnect.demo | Nasima Khatun — Uttara; Gardening/Cleaning |
| worker4@herconnect.demo | Rehana Islam — Mohammadpur; Childcare/Cooking |
| worker5@herconnect.demo | Salma Rahman — Banani; non-medical Elderly Care/Cleaning |
| worker6@herconnect.demo | Momena Sultana — Bashundhara; Cleaning/Other |

Use DEMO_PASSWORD as it was set when these accounts were first created. Your existing admin account moderates both modules through separate screens. Changing .env later does not reset existing demo passwords.

## 5. Run

```powershell
npm run dev
```

Open http://localhost:5173. The dashboard Worker hiring card is active and a sidebar link is available. If needed refresh the browser with Ctrl+Shift+R.

Pages:

- /hiring — public directory.
- /hiring/mine — create/edit your worker application.
- /hiring/bookings — bookings you requested.
- /hiring/bookings?view=worker — requests for your services.
- /hiring/complaints — your filed concerns and moderator responses.
- /admin/hiring — independent worker approval, complaints and decision history.

## 6. Manual walkthrough

### Directory and application

1. Browse the directory as a guest. Filter by skill, service area, rate and availability; test empty results and clearing filters.
2. Sign up with a fresh account. Open Offer services, enter a biography, service area, skills, hourly rate, weekdays and daily hours.
3. Submit. Status should be Pending and the profile should be absent from public search.
4. Log in as admin; open Worker moderation. Approve the profile with a reason.
5. Confirm the profile is public. A shop approval alone must not approve the worker profile.
6. As the worker, pause requests and verify new requests are unavailable. Resume without losing approval. Editing the main profile resubmits it for approval.

### Booking and privacy

1. Use a buyer account to request Cleaning with Farida Akter (worker1).
2. Select a future date and a 10:00–12:00 Bangladesh time window. Seeded workers are available 08:00–20:00 every day. Requests must last 1–8 hours on one date, using half-hour increments.
3. Record the reference. Expected quote for worker1: 2 × BDT 250 = BDT 500. Hiring has no marketplace delivery charge.
4. Use a normal browser and an Incognito window for separate roles. Ordinary tabs share a session.
5. As worker1 open incoming bookings. Before acceptance, customer address, phone and notes should be hidden.
6. Accept. Private service details should now appear. The buyer should see Accepted after refreshing or returning to the window.
7. Attempt a booking using an unrelated account's detail URL; access must fail.

### Schedule conflict and cancellation

1. While a slot is still Pending, request the same time from a second customer.
2. Accept the first request; accepting the overlapping request must fail.
3. A booking starting exactly when another ends should be allowed if inside the schedule.
4. Cancel the first accepted booking with a reason. The previously blocked request should now be acceptable.
5. Changing the worker's rate later must not rewrite the old booking's quoted total.
6. Try booking yourself, a past time, a non-working day and an invalid duration; each must fail.

### Completion and review

- A customer may mark an accepted job Completed only after its scheduled end. Workers cannot mark their own job complete.
- For an immediate review demo, log in as hiringbuyer@herconnect.demo. Find the unreviewed completed booking with Momena Sultana; open it and submit a review.
- A second review for the same booking must fail. Pending or merely accepted bookings cannot be reviewed.
- To check the live completion transition without waiting during a presentation, run the integration test: it advances time only in its isolated test fixture. Do not edit your real database to bypass business rules.

### Complaints and moderation

1. From a booking that has been accepted, either participant can submit one private complaint.
2. Check it appears in that user's My complaints page.
3. Log in as admin; review the complaint and record a note/outcome.
4. Confirm the submitter sees the update. No automatic suspension should occur.
5. Suspend a test worker explicitly in moderation; their profile must leave public search and new acceptance must fail. Existing accepted bookings remain manageable.

## 7. Commit after verification

Review actual changes:

```powershell
git status
git diff
```

Stage only this release:

```powershell
git add client/src/App.jsx client/src/hiring-pages.jsx client/src/hiring.css server/app.js server/index.js server/hiring.js server/hiring-models.js server/hiring-rules.js server/seed-hiring.js tests/hiring.test.js tests/hiring.integration.test.js README.md docs/HIRING.md docs/HIRING-SETUP.md docs/REQUIREMENTS.md docs/ARCHITECTURE.md docs/API.md
git diff --cached --stat
git commit -m "feat: add domestic worker hiring and booking moderation"
git push -u origin feature/worker-hiring
```

Create a GitHub pull request into main. Describe the implemented workflow, actual test outcomes and remaining limitations. Do not claim tests passed if they could not run. Review/merge following faculty requirements. After merging, with no unfinished changes:

```powershell
git switch main
git pull --ff-only origin main
```

## Verification boundaries

The authoring build and seven database-independent tests passed. Browser flows passed using simulated API responses. The local MongoDB test process exited with code 100 before integration tests could run, so database-backed concurrency, seed and workflow behaviour still need verification on your computer. No Atlas credentials were used or embedded in this update.

Marketplace issues remain deferred at your request. Transport and Safety Reporting are not implemented. Hiring approval is profile review, not identity verification; this prototype does not collect payment or guarantee service delivery.
