# Test plan and acceptance walkthrough

Tests must use a temporary MongoDB replica set. Never point automated tests at Atlas. `npm test` starts an isolated mongodb-memory-server replica set; first run downloads a MongoDB binary. It does not read .env.

## Automated acceptance cases
Registration/login/session, forged role fields, password reset/revocation, owner access, hidden unapproved products, admin approval, multi-seller rejection, server-calculated totals, simultaneous last-stock checkout, duplicate checkout request, repeated cancellation, order transitions, delivered-only reviews, wishlist persistence and seller inventory ownership. Results will be recorded after execution, without claiming unrun checks passed.

## Manual walkthrough
1. Run setup, configure .env, seed, create admin, and start both servers.
2. Open localhost:5173 at desktop and phone widths. Browse products and open detail/reviews.
3. Sign up with a new account. Dashboard shows four modules with only Marketplace available.
4. Save products; refresh. Add an item, change quantity, open cart and complete COD checkout.
5. Log in as the product's seeded seller; confirm, ship and deliver the order. Buyer can then review it.
6. Create a seller application using the new account. Add a product photograph and draft listing.
7. Log in as admin; approve application with a reason. Verify public listing appears.
8. Test archiving, stock adjustment and buyer cancellation before shipping. A second cancellation must not restore stock again.
9. Request password reset. In local development, copy link from the API terminal; with SMTP configured, use the email. Set a new password and confirm old sessions no longer work.
10. Use keyboard navigation, check field errors, empty search, unknown URL, missing product and unavailable server behaviour.

## Boundaries
A local replica-set test verifies application/database logic, not access to the user's Atlas cluster. Email delivery requires an actual SMTP account. Real courier delivery and payment collection are outside this release.

## Release 1 verification results

| Check | Result |
|---|---|
| Production frontend build | Passed |
| Database-independent API guards | 4 tests passed: authentication gates, origin protection, input validation, safe errors/headers |
| Browser checks, 1440px desktop and 390px mobile | Passed with intercepted fixture API responses |
| Browser errors and broken product images | None observed during the checked flows |
| MongoDB integration suite | Blocked before execution: local MongoDB process returned `open: Operation not permitted`, exit code 100 |
| User's Atlas connection | Unverified; not accessed or modified |
| Real SMTP delivery | Unverified; needs SMTP configuration |

Browser checks covered catalog/search, account forms, dashboard, product details and demo reviews, wishlist, bag, checkout, cancellation, seller application and inventory, product form, moderator dashboard, mobile navigation, and switching between buyer/seller/admin accounts without retaining another account's cached data. Product editor and checkout screenshots were visually inspected.

These browser checks validate frontend navigation, rendering and interactions against controlled responses. They do not establish real MongoDB persistence, transaction correctness, image upload round trips, password-reset email delivery or Atlas connectivity. Run `npm test` and the manual walkthrough on your computer before treating those workflows as verified.
