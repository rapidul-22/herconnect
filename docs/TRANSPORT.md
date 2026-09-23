# Release 4 — Safe Transport

## Final scope
Fourth module on top of Marketplace, Hiring and Safety Reporting. Driver applications/independent moderation, four vehicle types, map pickup/dropoff selection, server-side fare estimates, nearest available driver assignment, requested → accepted → ongoing → completed lifecycle, cancellation/timeout, location polling, participant panic alerts, private emergency contacts and completed-ride reviews. This is a university prototype, not a licensed commercial dispatch service or a safety guarantee.

## Rules
- Existing member accounts can request rides or apply to drive. Admin accounts only moderate. Driver licence/vehicle details are manually reviewed by admin, not externally validated. No gender inferred or automatically verified from names; approval does not establish identity/background checks.
- Profiles start pending and offline. Profile edits require reapproval and are blocked during an active ride. Licence number is private to driver/admin. Online drivers must send a location heartbeat within 90 seconds to remain eligible. Self-matching is excluded.
- Matching ranks every approved, online, unoccupied driver of the chosen vehicle type within 10 km of pickup using Haversine distance. Real requests exclude fictional demo drivers; explicit demo mode uses only fictional profiles. One active ride per person, across both passenger and driver roles.
- MongoDB transactions claim participant slots, claim the driver and create the ride together. Unique per-user slots prevent concurrent double assignments or an active driver booking another ride as passenger. Client-provided fare/driver/status are ignored. Duplicate request keys return the original ride without creating another.
- Requested rides expire after 2 minutes if unaccepted. A 15-second server sweep and transport reads/writes clean expired requests; stored expiry survives restart. Timed-out/rejecting drivers go offline. There is no automatic retry with a different driver; passenger explicitly requests again.
- Only assigned driver accepts, starts or completes a ride. Either participant may cancel an active ride with a reason. Rejecting a request records a cancelled ride. Ending a ride releases both slots atomically. On completion or passenger cancellation, an approved driver with a fresh location returns to the pool; otherwise goes offline. Suspended drivers cannot accept new rides but can end an existing one.
- Prototype fare = base + per-km × straight-line pickup-to-dropoff distance, rounded to whole BDT and stored as integer paisa. Car: BDT 80 + 30/km; CNG: 50 + 22/km; Motorbike: 30 + 15/km; Rickshaw: 20 + 12/km. These are classroom constants, not market/regulatory rates. Distance must be 0.1–100 km. No road routing, traffic ETA, payment gateway or fare collection. UI clearly shows straight-line estimates and cash-only demonstration.
- Location: driver opts into browser tracking on the driver or ride page; geolocation is sampled every 15 seconds while the page is open. Passenger polls every 5 seconds. Driver location is visible only to participants of accepted/ongoing rides; exact current locations are never public. Timestamp and stale label prevent a frozen dot being presented as live. Closing the page stops updates; no background-tracking guarantee. Manual location updates are available for labelled demo driver accounts only. Coordinates supplied by a browser are not tamper-proof GPS verification.
- Panic: either participant can create their own alert while ride active. It stores location/time and is visible to both participants and admins. Triggerer/admin can resolve it with a note, even after the ride ends. Completing a ride does not silently resolve alerts. No SMS, automatic call or police dispatch. The triggering user's saved emergency contact is shown only to that user; explicit call links require a user click. If geolocation fails, user may record the alert at the known pickup point with an explicit source label.
- Review: only passenger of completed ride; one review per ride, rating 1–5. Public driver summaries/reviews show no passenger identity, licence number, exact location or private contact. Ratings aggregate immediately.

## Collections
DriverProfile (unique user): display name, bio, vehicle type/number, licence number, approval history/status, online intent, current location, activeRide, demo marker.
TransportSeat (unique user): active ride lock shared by passenger and driver roles.
TransportRide (unique passenger+requestKey): participant references, vehicle/name snapshots, pickup/dropoff, estimated distance/fare, status, expiry, location heartbeat and timeline.
TransportAlert (unique ride+triggeredBy): location/source, active/resolved status, resolution note and actor/time.
DriverReview (unique ride): profile, passenger, rating/comment, demo marker.
TransportContact (unique user): emergency contact name/phone; demo ownership marker for safe additive seeding.

## API (/api/transport)
Public GET /drivers and /drivers/:id: approved summaries and ratings/reviews; no live location/licence/contact. Demo filter separates examples.
Authenticated GET/PUT /contact: own emergency contact.
GET/PUT /driver: own profile/application. PATCH /driver/online: online toggle and starting location. PATCH /driver/location: heartbeat while online or on a ride.
POST /estimate: validated pickup/dropoff and vehicle fare estimate (no driver reservation).
POST /rides: automatic nearest match. GET /rides?view=passenger|driver&page=N: own paginated history.
GET /rides/:id: participant-only ride details, timestamped driver location, alerts and own saved contact.
PATCH /rides/:id/status: driver accept/ongoing/completed/rejected; either participant cancelled.
POST /rides/:id/panic: participant alert. PATCH /alerts/:id/resolve: triggerer/admin.
POST /rides/:id/review: completed passenger review.
GET /admin/drivers; PATCH /admin/drivers/:id: independent approval decisions.
GET /admin/alerts: private alert queue; no public list of rides or alerts.

## Delivery boundary
No new packages or .env settings. Reuse Leaflet, Haversine, existing cookies/CSRF, Zod, Mongoose, React Router and TanStack Query. Screens use the existing rose/lilac palette. Changes to the shared map only add optional labels, colours and a route line; Safety defaults stay unchanged. Main remains untouched: branch feature/safe-transport from feature/safety-reporting.
