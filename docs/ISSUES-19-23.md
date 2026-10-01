# HerConnect+ — Issues 19–23

This update is based on the project after Issues 15–18. It changes the frontend only. No database migration, reseed, new npm dependency or environment variable is required.

## Delivered behaviour

- **Issue 19:** guests see exactly five main navigation links: My dashboard, Marketplace, Services & talent, Safety & support, Safe transport. Module links keep using the existing login guard. The guest sign-in control stays at the bottom of the sidebar while navigation scrolls independently. On mobile, open the menu to see this sidebar. Auth pages retain their separate layout.
- **Issue 20:** an always-available `SOS · Call 999` link opens `tel:999`. It is present on the dashboard, modules, profile, sign-in/sign-up, password-reset, not-found, initial loading and API-error screens. It does not depend on authentication, location permissions, AI or a backend request. After activation, a dismissible message explains how to call manually if the device cannot open a dialler. The existing `/sos` page retains trusted contacts and location-sharing tools.
- **Issue 21:** clearer product wording across the dashboard, authentication, marketplace, services, safety, transport, seller tools, profile, help and shared loading/error states. This is editorial work, not an AI-detector guarantee. Fictional-data labels, permission explanations and emergency-service limitations are retained.
- **Issue 22:** coordinated plum/rose/lavender colours, softer card depth, refined borders, a framed sign-in form, consistent module styling, visible keyboard focus and responsive layouts. Existing reduced-motion settings remain respected.
- **Issue 23:** an explicit My profile navigation item appears for every signed-in member and moderator. Existing profile fields and save/password functionality are reused. The moderator profile no longer suggests member-only shop/driver applications.

## Emergency behaviour and limits

999 is Bangladesh's national emergency number for police, fire and ambulance. Source: https://www.itu.int/net4/wsis/archive/stocktaking/Project/Details?projectId=1514906121 (checked for this update).

A website can request that the device open a telephone handler. It cannot promise a completed call, automatic police dispatch or a supported dialler on desktop. The user may need to confirm the call. HerConnect+ does not send location to emergency services. Do not place test calls to 999 during classroom demonstrations.

## Changed files

- `client/src/App.jsx` — navigation, shared emergency link, loading/error text.
- `client/src/hub.css` — sidebar layout, shared styling, emergency control.
- `client/src/auth-pages.jsx` — profile clarity, moderator copy, authentication/help text.
- `client/src/dashboard.jsx` — dashboard copy and profile shortcut label.
- `client/src/market-pages.jsx` — marketplace, bag, order and wishlist copy.
- `client/src/hiring-pages.jsx` — professional service and booking wording.
- `client/src/safety-pages.jsx` — reporting and support wording.
- `client/src/transport-pages.jsx` — driver and transport wording.
- `client/src/seller-pages.jsx` — shop/product/moderation wording.
- `client/src/shared.jsx` — readable loading and service-error messages.
- `client/src/sos.jsx` — emergency page heading and 999 service description.

## Verification performed

- Production Vite build passed.
- `node --test tests/guards.test.js tests/hub.test.js`: 7 passed, 0 failed.
- Automated Chromium browser checks with a mocked API: five guest links; all four module clicks redirect to sign-in without private API requests; pinned sign-in position; member and moderator profile access; profile save/refetch/reload; logout protection; the SOS link and fallback message; auth/404/API-error screens; no browser JavaScript errors.
- Responsive checks: 1440×900, 1440×540, 390×844, 320×568 and 740×360. Member profile also checked at 390×844. No horizontal page overflow in the checked views.
- The telephone link was inspected and its click tested with default navigation blocked. No emergency call was made.
- The patch was applied to a clean copy of the Issues 15–18 source and its output compared to the delivered replacement files.

Limits: browser API responses were simulated, not connected to your Atlas database. The full MongoDB integration suite was not rerun for this frontend-only update. Existing dependency versions were retained. Run the full project tests on your PC and manually check the updated interface.

## Manual acceptance checklist

1. Sign out and open `/dashboard`: five navigation links, visible Sign in to your space.
2. Click each module while signed out: sign-in page opens. The dashboard remains public.
3. Check a short desktop window and mobile menu: sign-in stays at the bottom without scrolling the entire sidebar.
4. Inspect the SOS link: `href="tel:999"`. Do not call 999 just to test. On a phone, the operating system controls the dialler/confirmation.
5. Check SOS on login, signup, forgot/reset password and normal pages.
6. Sign in as a normal member: My profile is visible, editable fields save and survive refresh, logout remains available.
7. Sign in as a moderator: My profile is visible and moderation links remain available.
8. Check all four modules and the product/shop forms for wording and layout.
9. Use keyboard Tab: focused links/buttons remain visible. Close the emergency information with its labelled close button if opened.

## Existing Selenium tests

Older browser tests may deliberately expect the previous one-link guest sidebar or old headings. Update those expectations to the five links listed above and the new My profile title. SOS tests should inspect `tel:999` without allowing a real call. Backend tests remain unchanged. Do not change unrelated test expectations just to hide a failure.
