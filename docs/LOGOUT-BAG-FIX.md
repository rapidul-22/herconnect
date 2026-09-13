# Logout and multi-shop bag update

## Changes

- Log out is a labelled button in the top bar for every signed-in role, including at phone widths. The existing server logout and private-cache clearing still run.
- The sidebar scrolls when its content is taller than the screen.
- A buyer's bag can retain distinct products from several shops and multiple quantities of the same product.
- Each shop has its own checkout button and BDT 60 delivery fee. This is not a combined all-shops checkout.
- Checkout submits only the selected shop's products to the existing order API.
- Successful checkout subtracts only the quantities in the returned order. Other shops and extra units stay in the bag. Failed checkout leaves the bag intact.
- The buyer's device-local bag still survives refresh and is separated by account.

No backend, database schema, .env, dependency manifest or lockfile changes are included. Keep the Nodemailer and Sharp security upgrades already applied on your computer.

## Apply the patch on Windows

1. Stop npm run dev with Ctrl+C. Open the terminal in the existing HerConnect1 folder containing package.json.
2. Run git status. If you have independently edited any of the affected source files, back them up outside the project before proceeding.
3. Extract HerConnect-Logout-Bag-Fix.zip. Copy logout-multishop.patch into the HerConnect1 root temporarily.
4. Run git apply --check .\logout-multishop.patch. No output means the patch matches your files. If it reports an error, stop and share that error; do not force it or overwrite your files.
5. Run git apply .\logout-multishop.patch.
6. Move logout-multishop.patch out of the project after successful application; it is an installation file, not application source.
7. Run npm run build, then node --test tests/cart.test.js tests/guards.test.js.
8. Run npm run dev and perform the checks below. No reinstall, reseed, or admin recreation is needed.

The archive's replacement-files folder is for inspecting the updated source. Applying the patch is the preferred installation route. Do not also copy the replacement files after applying the patch.

## Manual checks with your real database

1. Sign in as a buyer. Confirm Log out is visible next to My bag on desktop and at a narrow phone width.
2. Add two different products from Shop A, one from Shop B, and add the first product again. Confirm there are three product lines and four total units.
3. Refresh. Confirm the same contents remain. Change quantities and remove/re-add a product.
4. Open My bag. Confirm separate shop groups and BDT 60 delivery per shop; the combined estimate includes two delivery fees.
5. Click Shop A's checkout. Confirm only Shop A's products and one delivery fee appear. Place the order.
6. Open My bag again. Confirm Shop B's product is still present. Order it separately and confirm My orders contains both shop orders.
7. For an unavailable-stock case, add a product, reduce its stock using a seller account in another browser session, then try checkout. Confirm the error appears and bag contents remain.
8. Log out. Confirm login appears and opening /dashboard requires signing in. Sign in as a different buyer and confirm the first buyer's bag is not visible. Sign back into the first account to see its retained bag.
9. Check Log out with seller and admin accounts too.

## Validation performed before delivery

- Production frontend build passed.
- The new multi-shop cart regression test and four existing API guard tests passed.
- Browser checks used simulated API responses: two-shop/three-product bag, repeated add, quantity changes, persistence on refresh, correct checkout selection, failed-order retention, successful-order cleanup, remaining-shop checkout, visible logout, and redirect after logout.
- No browser page errors or horizontal overflow were observed at the tested desktop and 320px/390px mobile widths. Desktop/mobile screenshots were visually reviewed.
- This does not verify a live Atlas transaction or SMTP. Run the manual checks above on your computer.

## Commit using a branch

You can apply and test first, but create the branch before committing to meet the faculty requirement. Creating a branch retains your uncommitted changes.

    git switch -c fix/logout-multishop-bag
    git diff
    git add client/src/App.jsx client/src/shared.jsx client/src/market-pages.jsx client/src/styles.css client/src/auth-pages.jsx client/src/cart.js tests/cart.test.js README.md docs/REQUIREMENTS.md docs/LOGOUT-BAG-FIX.md
    git diff --cached --stat
    git commit -m "fix: expose logout and support a multi-shop bag"
    git push -u origin fix/logout-multishop-bag

If the branch already exists and is already selected, skip its creation. Do not include unrelated local changes or .env in this commit. Review the staged diff before committing.

On GitHub create a pull request from fix/logout-multishop-bag into main, describe the two fixes and your actual test results, then review and merge according to your course rules. After merging, with no unfinished local changes:

    git switch main
    git pull --ff-only origin main

If you still choose not to create a branch now, leave the fixes uncommitted until ready. Committing directly to main does not meet the stated branch requirement.
