# Release 2 — Domestic Worker Hiring

## Scope and decisions
Shared account, independent worker application/approval, searchable directory and public detail, availability, hourly booking requests, accept/reject/cancel/complete, customer reviews and private booking complaints with admin review. Marketplace behaviour is unchanged. Transport and Safety Reporting remain future modules.

Application approval means manual profile review, not identity/background verification. No automatic complaint-count bans. Existing shop approval grants no worker approval. Admins cannot hire or offer services. One worker profile per ordinary account. Public cards use initials, not photographs of unrelated people presented as workers.

## Booking rules
- Time zone: Asia/Dhaka (UTC+06:00), explicitly shown in forms and details.
- Start/end are half-hour increments, on one Bangladesh calendar date, duration 1–8 hours, start in the future and within 90 days.
- Worker chooses available weekdays and a daily start/end window, plus an accepting-requests toggle. New requests and acceptance must fit current availability.
- Pending requests do not reserve a slot. Accepting a booking transactionally locks the worker profile document and checks overlapping accepted bookings. Overlap means existing.start < proposed.end AND existing.end > proposed.start; adjacent bookings are allowed.
- Only the worker may accept/reject. Either party may cancel pending/accepted with a reason. Only the customer may complete an accepted booking, after its end time. No automatic completion or payment collection.
- Server calculates total from stored hourly rate; duration and rate are copied into the booking. Later profile edits do not change agreed quotes.
- Worker profile edits resubmit it for review. The availability toggle alone does not reset approval. Suspended profiles cannot be edited or accept new bookings; existing bookings remain cancellable/completable.
- Address, phone and notes visible to the customer and, only while accepted/completed, the assigned worker. Public worker profiles omit account email/phone. Admin complaint screen shows complaint context, not home addresses.
- Checkout UUID + customer unique index prevents duplicate retries. Self-booking blocked.
- One customer review per completed booking; aggregate rating comes from stored reviews.
- Either party may file one complaint per booking once it has been accepted (including later cancellation). Admin records reviewed/resolved/dismissed and a reason. Complaints are private; no automatic penalties or public accusations.

## Models
WorkerProfile(user unique, displayName, skills, bio, experienceYears, hourlyRate in paisa, serviceArea, available, weekdays, dayStart/dayEnd minutes, status, reason, scheduleVersion, isDemo).
WorkerBooking(customer, worker, profile, workerName/service/rate snapshots, startAt/endAt UTC, total paisa, address/phone/notes, status, acceptedAt, history, requestKey unique per customer).
WorkerReview(booking unique, profile, customer, rating, comment, isDemo).
WorkerComplaint(booking+filedBy unique, against, reason, details, status, adminNote, reviewedBy).
WorkerDecision(admin, profile, status, reason): worker approval history separate from marketplace audits.

## API (prefix /api/hiring)
GET /workers: public approved directory; q, skill, available, maxRate, sort, page.
GET /workers/:id: public approved detail and latest 50 reviews.
GET /mine: {profile: own worker profile or null}.
PUT /mine: create/update/resubmit own profile; validated fields only.
PATCH /mine/availability: toggle accepting requests.
POST /bookings: signed-in member requests a booking.
GET /bookings?view=worker: own customer/worker bookings, latest 100.
GET /bookings/:id: participant-only detail with address visibility rules.
PATCH /bookings/:id: enforced state transition; reason required for cancellation/rejection.
POST /bookings/:id/review: customer of completed booking only.
POST /bookings/:id/complaint: booking participant only, once per party.
GET /complaints: own filed complaints, latest 100.
GET /admin/workers: admin queue, latest 200.
PATCH /admin/workers/:id: approve/reject/suspend/restore with reason and audit transaction.
GET /admin/decisions: latest 200 worker approval decisions.
GET /admin/complaints: latest 200 private complaints.
PATCH /admin/complaints/:id: admin review status and note.

## Validation plan
Authentication/CSRF and owner-only edits; public projection excludes private fields; independent approvals; invalid schedule rejected; overlapping concurrent accept attempts allow only one; adjacent slots allowed; cancellation frees accepted slot; frozen quote; no self-booking; request retry returns same booking; premature/unauthorized completion blocked; completed-only unique review; private complaint access and admin decisions.

## Limitations
No payments, identity checks, live tracking, notifications or recurring bookings. One recurring weekly availability window per worker; no holiday calendar. Travel time between jobs is not modelled. Time slots are secured at acceptance, not request. Users must refresh booking lists to observe the other party's changes (normal query refetch also occurs on window focus). Lists have documented caps; directory is paginated. Demo profiles and feedback are fictional and labelled.

## Verification recorded for this delivery
Production build: passed. Seven database-independent tests: passed (four API guards, one cart regression, two hiring validation/permission tests). Browser workflow checks: passed using simulated API responses; directory/search, first-time application, booking request/acceptance/completion, review, complaint and admin decisions. Desktop and 320px/390px widths checked for overflow; directory, profile and detail screenshots reviewed.

Database integration suite: included, but the local MongoDB process exited with code 100 during startup before the hiring test ran. No live Atlas transaction or seed was executed by the authoring environment. Run tests and demo workflows on your computer.
