# HerConnect+ requirements and release scope

Status: approved implementation baseline for Release 1, 12 September 2026. This document replaces contradictory rules in the Complete Feature Plan. Implementation status and verification evidence belong in README.md and TESTING.md, not in requirement claims.

## Purpose and audience
HerConnect+ brings women-focused economic and safety services together for users in Bangladesh. Release 1 implements shared accounts, the dashboard and the marketplace. Safety Reporting, Safe Transport and Domestic Worker Hiring appear as clearly labelled future modules only. This is an educational prototype, not an emergency service or a live merchant marketplace.

## Release decisions
- Responsive React website, Node/Express API and MongoDB. No native mobile application.
- One ordinary account may buy and apply to sell. Admin accounts are separate moderators and cannot trade.
- Women entrepreneurs are the intended sellers. Buyers may support them regardless of gender. No intrusive automatic gender inference or identity-document collection in this prototype.
- Seller application includes shop name, location and story. Admin reviews and approves/rejects it with a reason. Approval means platform application review, not a criminal background check or proof of product quality.
- Payments are cash on delivery, with a clearly disclosed fixed BDT 60 delivery fee per checkout. No gateway, charge, real courier dispatch or automatic refund occurs.
- One checkout may contain several products, but all from the same seller. This keeps delivery, order ownership and cancellation understandable. The interface prevents mixing sellers and explains why.
- Sample shops, products, purchase histories and reviews are fictional demonstration records. Seeded reviews are labelled Demo review; genuine new reviews require a delivered purchase. Photographs illustrate sample listings and do not establish real seller affiliations.
- No cancellation-count bans. Buyers may cancel pending/confirmed orders. Sellers may cancel pending/confirmed orders with a reason. Shipped/delivered orders cannot be cancelled. There are no automatic account penalties.
- Archived products stay in order history. Ordered names, unit prices and images are saved at checkout.
- A suspended seller disappears from public browse, product details and new checkout. Existing orders remain manageable. Admin suspension is marketplace-specific and records a reason.

## Functional requirements and acceptance criteria
| ID | Requirement | Acceptance criterion |
|---|---|---|
| AUTH-01 | Register, log in and log out | Unique case-insensitive email; hashed password; generic login error; HTTP-only session cookie; logout invalidates the current session |
| AUTH-02 | Account recovery | A single-use expiring reset link is emailed when SMTP is configured; local development can print it server-side; reset invalidates existing sessions |
| AUTH-03 | Profile | User edits own name, Bangladeshi mobile number and shipping address; password changes require current password |
| NAV-01 | Dashboard | Four services visible; Marketplace active; other three explicitly not built; live own order/wishlist counts |
| CAT-01 | Discover products | Search, categories, sorting, pagination and maximum-price filter are server-backed; only active approved shops visible |
| CAT-02 | Product detail | Photo, description, material/care details, price in BDT, stock, seller, delivery information, ratings and labelled sample reviews |
| CART-01 | Cart | Add/remove/update quantities across multiple sellers; group by shop with separate checkout and BDT 60 delivery per shop order; preserve unpurchased items; survives refresh for that account on that device; server revalidates everything at checkout |
| SAVE-01 | Wishlist | Save/unsave to MongoDB for the signed-in account; visible after another login |
| ORDER-01 | Checkout | Address and phone validated; server calculates totals; database transaction creates order and decrements stock together |
| ORDER-02 | Duplicate protection | Repeating a checkout with the same request key returns the existing order rather than buying twice |
| ORDER-03 | Order management | Buyer sees own purchases; seller sees own sales and required delivery details; transitions are enforced by server |
| ORDER-04 | Cancellation | Status, stock restoration and history update in one transaction; repeat cancellation cannot restore twice |
| REVIEW-01 | Purchase reviews | Buyer can review each product once per delivered order; rating 1–5; no self-review; average derived from stored reviews |
| SELL-01 | Seller application | Ordinary user submits shop details; pending/rejected applicant can keep product drafts; only approved listings become public |
| SELL-02 | Inventory | Owner creates, edits and archives products; uploading JPEG/PNG/WebP supported; inventory changes cannot overwrite concurrent checkout stock |
| ADMIN-01 | Moderation | Admin approves/rejects/suspends shops with reason and history; admin can archive inappropriate products |
| UX-01 | Usable states | Loading, error, empty, success and unavailable-product states; responsive layouts; labels, visible focus, reduced-motion support |

## User flows
Registration → dashboard → marketplace → product → cart → checkout (COD) → order detail → seller confirms → ships → delivers → buyer review.
Registration → seller application → create draft products → admin approval → public shop → manage sales.
Forgot password → email/development mail log → reset password → log in again.

## State rules
Seller: none → pending → approved/rejected; rejected → pending on resubmission; approved → suspended; suspended → approved after admin review. Every admin decision requires a reason.
Order: pending → confirmed → shipped → delivered. Buyer or seller can change pending/confirmed → cancelled. Cancellation is terminal. Seller alone advances fulfilment. The prototype trusts the seller to mark delivery; delivery disputes and courier proof are future work.
Product: active or archived. Public eligibility also requires seller approval. Draft here means an active product under a pending shop, visible only to its owner/admin.

## Non-functional requirements
Passwords minimum 10 characters, maximum 72 UTF-8 bytes; bcrypt hashing. Cookie sessions backed by MongoDB, not browser localStorage tokens. Same-origin API/proxy, Origin checks for mutations, CSRF token for authenticated mutations, bounded request bodies, rate limits, server validation and safe response fields. Prices stored as integer paisa. Stock integer 0–100000. Uploaded files decoded/re-encoded as JPEG with sharp, size-limited, random filenames and no executable originals. Database errors and credentials never returned to clients. No public user-directory endpoint.
Local desktop and mobile-browser support; test at 390px and 1440px widths. No promise of offline checkout. Product images are bundled so sample browsing does not require a third-party image host after setup.

## Future module baseline, not Release 1 implementation
Transport: approved drivers, expiring driver claims, fresh location timestamps, passenger-owned tracking, server fare rule, cancellation/rejection cleanup, honest emergency-contact action. Road routing and SMS require separate work.
Hiring: approved worker profiles, start/end times and overlap prevention, accepted bookings, completion policy, purchase-linked reviews and human-reviewed complaints. No automatic ban after two accusations.
Reporting: named or public-anonymous reports, sensitive fields omitted, admin moderation before publication, reviewed-report clusters with documented radius/time thresholds, verified help resources. Report clusters are not claims that an area is objectively unsafe.
All future modules need their own detailed acceptance cases when scheduled; their APIs are intentionally not scaffolded now.

## Explicit exclusions
Native app, real payment processing, courier integration, automatic emergency response, live ride tracking, worker bookings, incident submission, cross-module search, chat, recommendation AI, automated identity checks and real operational guarantees. Basic admin, password recovery and product upload ARE included in Release 1.
