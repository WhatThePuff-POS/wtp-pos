# What The Puff — POS System

## Project Overview
A browser-based POS system for a Singapore hawker stall with 3 outlets:
- Bedok 216, Haig Road, Punggol Coast

## Files
- `index.html` — Main POS (cashier interface)
- `dashboard.html` — Live sales dashboard (owner view)

## Firebase Config
Project: whatthepuff-be1ce
All transactions saved to Firestore collection: `transactions`
Fields: txnId, date, time, hour, outlet, items, subtotal, discount,
        total, payments, discountType, timestamp, voided, createdAt

## Passwords
Open PIN: 1234
Admin PIN: 9999

## SKUs
1. Original — $2.00
2. Sardine — $2.00
3. Cheesy — $2.50
4. Black Pepper — $2.50
5. Char Siew — $2.50
6. Otah — $2.50 (using Original photo as placeholder)

## Payment Methods
Cash, PayNow, CDC, Voucher (CDC/Voucher support split payments)

## Inventory Tracking
Accessible via the "📦 Stock" button in the POS topbar (no admin PIN required — staff-level access).

- **Catalog** (`inventoryItems` collection): editable list of trackable items. Seeded on first run with
  the 6 puffs (linked to their SKU, auto-deduct 1:1 per sale) plus Packaging, Boxes, Filling, Dough Balls
  (unit customizable per item — pcs/packet/bundle/etc). New items can be added anytime from the Items tab.
  Any custom item can optionally set "qty consumed per puff sold" (applies uniformly across all 6 flavors)
  to auto-deduct on every sale; default 0 means manual tracking only (stock-in/wastage/reconciliation).
- **Running count** (`inventoryStock` collection): one doc per outlet+item, updated via Firestore `increment()`
  so concurrent writes (sales, stock-in, wastage) don't clobber each other. Offline-safe — failed writes queue
  in localStorage (`wtp_stock_adj` / `wtp_stock_set`) and replay on reconnect, same pattern as offline transactions.
  **This number is intentionally not surfaced anywhere as a "current stock" screen** — there's no staff-facing
  tab for it. It exists solely to give Reconcile an "Expected" baseline to compare a physical count against.
  The only place it's shown is a rough qty hint next to each item in the Stock In / Wastage pickers.
- **Stock In tab**: log new deliveries arriving (qty + optional note) → `stockEntries` log + stock increment.
- **Wastage tab**: log spoiled/dropped/burnt items (qty + reason + optional details) → `wastageEntries` log + stock decrement.
- **Reconcile tab**: separate end-of-day screen (not tied to Z-Report) — staff counts actual stock per item,
  variance vs. expected is computed and logged to `reconciliations`, then stock is corrected to the counted value.
  This physical count *is* the authoritative "end of day stock" — deliberately trusted over the live running count.
- **Dashboard**: shows an "End of Day Stock" panel per outlet — the most recent reconciliation's actual counts,
  labeled with when it was taken (not a live number), plus a Wastage Log and Reconciliation History (with variance).

**Requires deployment:** `firestore.rules` was updated locally to allow these new collections but has not
been deployed to Firebase yet — the feature will silently no-op (permission-denied) until rules are pushed
via `firebase deploy --only firestore:rules` or the Firebase console.

## Known Outstanding Items
- Otah photo missing (using Original as placeholder)
- Printer integration pending (ESC/POS, model TBC)
- Cash drawer trigger wired but not connected (fires on cash payment)
- PIN buttons unreliable in Telegram iOS webview (known limitation)
- Dashboard live dot sometimes doesn't go green (Firebase index issue)

## Discounts
- Senior Citizen: 10% off subtotal
- Shows gross vs net revenue in X/Z reports and dashboard

## Reports
- X-Report: sales summary anytime, optional print
- Z-Report: end of day, requires admin PIN, resets terminal

## Deployment
Hosted on GitHub Pages:
- POS (cashier): https://limyuanming2-eng.github.io/wtp-pos/index.html
- Dashboard (owner): https://limyuanming2-eng.github.io/wtp-pos/dashboard.html
- Repo: https://github.com/limyuanming2-eng/wtp-pos
