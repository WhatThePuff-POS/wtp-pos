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
Hosted on GitHub Pages at:
https://YOUR-USERNAME.github.io/wtp-pos/
