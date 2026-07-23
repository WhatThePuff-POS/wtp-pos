# What The Puff — POS Standard Operating Procedure

**Applies to:** Bedok 216, Haig Road, Punggol Coast
**System:** POS at `index.html` · Owner Dashboard at `dashboard.html`
**Audience:** Any staff member operating the till, with no prior training assumed.

---

## 1. Access & PINs

| PIN | Value | Unlocks |
|---|---|---|
| **Open PIN** | `1234` | Logging into the till at the start of a shift |
| **Admin PIN** | `9999` | Viewing running sales totals, switching outlet, and the owner Dashboard |

> Stock In, Wastage, and Reconcile do **not** need the Admin PIN — any staff logged into the till can use them. This is intentional, so logging stock doesn't slow down service.
>
> **Z-Report (closing the till) also does not require the Admin PIN** — closing the day is a normal end-of-shift action for any staff member, gated only by a confirmation screen, not a password.

Keep both PINs private to staff. If you suspect a PIN has leaked, tell the owner — PINs are hardcoded in the app and can only be changed by editing the code.

---

## 2. Opening the Stall (Start of Shift)

1. Open the POS on the device (bookmark it — it's a normal webpage, no app install needed).
2. Enter the **Open PIN (`1234`)**.
3. Select the correct **outlet** from the dropdown before the last digit of the PIN — double-check it says the right outlet (Bedok 216 / Haig Road / Punggol Coast). Getting this wrong means today's sales and stock all get logged to the wrong outlet.
4. You're in. The top bar shows: outlet name, a 🔒 Sales indicator, a sync dot, and the clock.
5. If new stock arrives this morning (fresh puffs, dough balls, boxes, etc.), log it now — see [Section 6](#6-logging-stock-arrivals-stock-in). There's no separate "check stock" step needed beforehand — see the note below on how stock is tracked.
6. If a previous session crashed or the browser was closed mid-day, the app automatically restores your cart and today's transactions when you log back in — you'll see a toast confirming what was restored. You don't need to do anything.

---

## 3. Taking an Order

1. Tap a puff flavor tile to add **1** to the cart. Tap again to add more — a small badge shows the quantity on the tile.
2. In the **Current Order** panel on the right, use **−** / **+** to adjust quantity, or let it hit 0 to remove the item.
3. **Clear** (top of the order panel) empties the whole cart — use this to start over, not for removing a single item.
4. Need to sell something that isn't one of the 6 flavors (e.g. a one-off item, a discount override, a mystery item)? Tap **Others** at the end of the SKU grid → enter an amount and an optional label → **Add to Order**.
5. **Senior Citizen discount:** tap the **👴 Senior 10%** pill above the total to apply 10% off the subtotal. Tap the ✕ that appears next to it to remove the discount. This applies to the whole order, not per item.
6. When the order is correct, tap **Make Payment**.

---

## 4. Taking Payment

The payment screen shows **Amount Due**. Pick a method:

### Cash
1. Tap **Cash**. Preset buttons appear (exact amount, next whole dollar, and common note values above what's owed) — tap the one the customer handed over, or type a custom amount.
2. **Change to give** is calculated and shown automatically.
3. The cash drawer trigger fires automatically the moment you pick a cash amount (once a printer/drawer is physically connected — for now this is a no-op).
4. Tap **Confirm & End Transaction**.

### PayNow
1. Tap **PayNow** → **Confirm & End Transaction**. No amount entry needed (assumes exact payment via QR).

### CDC / Voucher
1. Tap **CDC** or **Voucher** → type the amount being applied.
2. If it doesn't cover the full amount due, the button changes to **Apply [METHOD] → Select remaining** — tap it, then pick a second method (e.g. cash) for the rest. This is a **split payment**.
3. If a CDC amount is *entered greater than what's owed* (e.g. customer wants to overpay to use up remaining CDC credit), the excess is automatically logged as **Sundry** and shown on the button before you confirm.

### Split payments in general
You can combine any methods (e.g. $5 CDC + $2 cash) — the screen tracks what's applied and what's still remaining until the full amount is covered, then ends the transaction automatically.

---

## 5. After Payment

- An **Order Complete** confirmation flashes with the transaction ID and total — tap anywhere to dismiss, or tap **🖨️ Print Receipt** to print immediately.
- Forgot to print, or customer wants a copy? Tap **🖨 Reprint** (top of the order panel) any time — it reprints the **last** transaction only.
- Puff stock is deducted automatically the moment payment is confirmed. You don't log anything for a normal sale — inventory tracking is invisible during selling.

---

## 6. Logging Stock Arrivals (Stock In)

Whenever a delivery arrives — puffs, boxes, packaging, dough balls, filling, or anything else being tracked:

1. Tap **📦 Stock** (top bar) → **Stock In** tab.
2. Tap the item that arrived from the list (shows current qty and unit next to each item).
3. Enter the **quantity received** and an optional note (e.g. "Morning delivery", supplier name).
4. Tap **Add Stock**.
5. A confirmation toast appears, and the entry shows under "Logged this session" so you can double-check what you just keyed in.

Do this **as soon as stock arrives** — don't batch it up for end of day, since sales throughout the day auto-deduct against whatever's currently on record, and a delayed stock-in makes the running "on hand" number wrong all day.

---

## 7. Logging Wastage

Whenever something is dropped, burnt, spoiled, or otherwise can't be sold:

1. Tap **📦 Stock** → **Wastage** tab.
2. Tap the affected item.
3. Enter the **quantity lost** and pick a **Reason**: Dropped / Burnt / Expired / Other.
4. Add **Details** if useful — this is especially important when the reason is "Other," since that alone tells the owner nothing.
5. Tap **Log Wastage**.

Log wastage **immediately when it happens**, not from memory at end of day — it's the only way the numbers stay honest.

---

## 8. How Stock Is Tracked (Read This Once)

There's deliberately **no "current stock" screen to check mid-shift**. The system still auto-deducts stock in the background on every sale, but you're never expected to look at that number or trust it during service — it's just there so **Reconcile** has an "Expected" figure to compare your physical count against.

In practice, that means:
- You'll see a rough **on-hand hint** next to each item when picking one in Stock In or Wastage — that's just there to help you find the right item, not something to audit.
- The number that actually matters is whatever you **physically count** at Reconcile — that becomes the day's real "end of day stock," and it's what shows on the owner's dashboard.
- If a flavor looks like it's running low, look at the shelf, not the app.

---

## 9. Checking Sales Anytime

- **Quick glance:** tap **🔒 Sales** in the top bar → enter the Admin PIN once → it turns into a running "today's transaction count · net revenue" figure for the rest of the shift.
- **Full snapshot:** tap **X-Report** any time — shows revenue, discounts, sales by flavor, payment method breakdown, and hourly sales for today so far. This does **not** reset or close anything, and can be printed. Use it to check how the day's going, or hand a printed copy to the owner mid-shift if asked.

---

## 10. Closing the Stall (End of Day)

Do these **in this order**:

### Step 1 — Physically count remaining stock
Walk the stall and count what's actually left of every tracked item (puffs by flavor, boxes, packaging, dough balls, filling, anything else in the catalog).

### Step 2 — Reconcile
1. Tap **📦 Stock** → **Reconcile** tab.
2. Each item shows the system's **Expected** quantity next to a blank **Actual Count** box.
3. Type in what you actually counted for each item. **Leave a box blank if it matches — you don't need to re-type the expected number.**
4. Tap **Submit Reconciliation**.
5. You'll see a toast telling you whether everything tallied or how many items had a variance. Large or repeated variances are worth mentioning to the owner — they usually mean either uncounted wastage, a missed stock-in log, or an error somewhere in today's entries.
6. Whatever you just counted becomes this outlet's **official "end of day stock"** — it's what the owner sees on the Dashboard, and what tomorrow's Expected figures are calculated from. There's no other stock number that matters more than this one.

*Reconciliation is intentionally separate from the Z-Report below — it's not required to close the till, but it should be a daily habit.*

### Step 3 — Z-Report
1. Tap **Z-Report** (top bar, red button).
2. A confirmation screen shows today's transaction count and net revenue — review it, then tap **Yes, close terminal**.
3. The full Z-Report appears (same layout as X-Report) — tap **🖨️ Print Z-Report** to print it for the till's paper trail, then **Close**.
4. The terminal locks with a "Terminal Closed" screen. **This cannot be undone** — a new Z-Report cannot be re-run for the same session.

### Step 4 — Next day
The terminal stays locked until someone logs back in with the Open PIN, which starts a fresh session (empty cart, transaction counter reset). Do this the next time the stall opens, not before.

---

## 11. Managing the Item Catalog

Only needed occasionally — when a new item type needs tracking (e.g. a new packaging type), or an existing item needs renaming/archiving:

1. Tap **📦 Stock** → **Items** tab.
2. The 6 puff flavors are locked (**PUFF** badge) — their name can't be changed here since they're tied to what's actually sold.
3. Any other item (**ITEM** badge) can have its name, unit, or "qty consumed per puff sold" edited directly — just tap the field and change it, it saves automatically.
   - "Qty consumed per puff sold" is optional and applies uniformly to any flavor — e.g. set Boxes to `1` if every puff sold uses one box, and it'll auto-deduct without anyone logging it. Leave at `0` for items you'd rather track manually via Stock In / Wastage only.
4. To add something new: type a name and unit (e.g. "Napkins" / "pcs") at the bottom → **＋ Add Item**. It immediately becomes available in every other tab.
5. **Archive** hides an item from Stock In/Wastage/Reconcile without deleting its history — use this instead of trying to remove something no longer tracked. Archived items can be restored via **Show archived**.

---

## 12. Troubleshooting

| Symptom | What it means | What to do |
|---|---|---|
| Sync dot isn't green | Not currently connected to the cloud | Sales and stock still save locally and sync automatically once back online — a toast will confirm when syncing happens. Don't worry unless it's been offline a long time. |
| "Offline — saved locally" toast | A sale couldn't reach the cloud right away | It's queued and will sync on reconnect. No action needed. |
| A "✅ Added" toast but the item never shows up elsewhere | The write actually failed silently | Check you have signal/wifi. If it keeps happening while clearly online, tell the owner — this can mean a permissions issue on the backend. |
| Logged into the wrong outlet | Selected wrong outlet at login, or it was switched via Change Outlet | Tap the outlet name (top-left, with the ✏️) → enter Admin PIN → pick the correct outlet. Do this **before** ringing up any sales, since everything logs against whatever outlet is currently selected. |
| App reloaded/crashed mid-shift | Browser hiccup, not a data loss event | Log back in with the Open PIN — today's cart and transactions restore automatically from local storage/cloud. |
| PIN buttons unresponsive (iPad, in Telegram's in-app browser) | Known limitation of that specific webview | Open the POS link in Safari directly instead of inside Telegram. |
| Need to correct a stock-in or wastage typo | Entries are permanent once submitted (by design, for audit integrity) | Log a second corrective entry (e.g. a wastage entry to cancel out an over-logged stock-in) rather than trying to edit or delete the original — deletion isn't possible from the till. |

---

## Quick Reference Card

```
OPEN STALL     → PIN 1234 → select outlet → log any deliveries that arrived
SELL           → tap flavor(s) → adjust qty → [Senior 10% if applicable] → Make Payment
PAYMENT        → Cash (pick preset/custom) | PayNow (confirm) | CDC/Voucher (enter amount, may split)
STOCK ARRIVES  → 📦 Stock → Stock In → pick item → qty + note → Add Stock
SOMETHING LOST → 📦 Stock → Wastage → pick item → qty + reason (+details) → Log Wastage
CHECK SALES    → 🔒 Sales (top bar) or X-Report (full breakdown, doesn't close anything)
CLOSE STALL    → count stock physically → 📦 Stock → Reconcile → submit  (this IS the end-of-day stock)
               → Z-Report → confirm → print → Close  (irreversible — do this LAST)
```
