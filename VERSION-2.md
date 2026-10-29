# WTP Version 2: shared register sessions

## Version 1 rollback point

The `version-1` branch preserves the complete previous app at commit
`500f543ab81943ce2f27bb83a5c5c9952ce7f1fa` (outlet-report and toolbar fixes).
Version 2 is prepared on `version-2-register-sessions`. Cash counting and cash
reconciliation are deliberately excluded.

## What changes

- Each outlet has a single shared active session, with its own business date.
- X reports read that session's totals. Midnight never silently closes a session.
- Z atomically closes the shared session and preserves its totals. The next session
  starts at zero. Repeated closing cannot create another closing record.
- A tablet claims the register online with admin PIN approval. Another tablet may
  view its X report without changing its own selling outlet.
- Handover requires the current tablet to sync and release. No force-takeover of an
  offline or lost tablet is implemented, because its unsynced sales cannot be known.
- Sales commit to IndexedDB before the UI confirms completion. UUID document IDs,
  an ordered outbox and atomic server writes make retries idempotent. Local sale
  archives remain available after upload. Sync runs on startup, reconnect, return
  to the page, retry-button use, and every 30 seconds while the page is open.
- One selling browser tab is permitted per browser profile using Web Locks.
- Reports distinguish cached status; status shows pending sales, business date,
  tablet identity and most recent Z closure. Z and handover require successful sync.
- Existing dashboard voiding now updates an open Version 2 session's totals in the
  same transaction as the void. Voiding a closed Version 2 session is blocked;
  post-close adjustment workflows are not part of this release.
- Existing inventory functions remain separate. The durable sales guarantee does
  not extend to existing inventory adjustment queues. No cash reconciliation added.

## First-use cutover (do this between trading sessions)

1. On every old selling tablet, finish the current order and verify its sales in
   the dashboard. Download a recovery export if there are pending or uncertain sales.
2. Complete the existing day's Version 1 reporting. Do not erase browser storage.
3. Update all selling tablets to Version 2. Close old tabs/installed-app windows;
   the new service worker waits for old tabs to close to avoid replacing code mid-sale.
4. Sign into the intended outlet on its primary tablet. Use Open / resume register
   and enter the admin PIN. Confirm that Version 1 sales have been finished and synced.
5. Other tablets can view the shared report. Use Release tablet on the owner before
   moving its register to a replacement tablet.

Version 1 transactions remain in the dashboard. They are intentionally not imported
into a new Version 2 session: old local caches cannot establish reliable closure
boundaries. A nonempty legacy `wtp_txns` queue blocks local activation until reconciled;
it is preserved and included in the recovery export. Old in-memory pending writes
are not discoverable remotely, so every old selling tablet must be checked at cutover.

## Firebase access and rollout gate

Version 2 uses `registers`, `registerSessions`, `registerDevices`, and the existing
`transactions` collection. It needs document reads/listeners and atomic writes to
these collections. No new compound query indexes are used by the register code.

The current project's deployed Firebase rules and live permissions have NOT been
verified from this workspace. Do not deploy until an actual test outlet can open,
save, view from a second tablet, hand over, and close successfully. Do not weaken
Firestore rules to make a denied request pass. This project currently uses local
PIN gates rather than Firebase-authenticated roles; these are operational controls,
not a server-enforced security boundary. A future authentication/rules deployment
is required to enforce ownership against modified clients. Old Version 1 clients
also do not honor Version 2 ownership, so a mixed-version rollout is unsupported.

## Verification

`npm install` then `npm test` (Node 24). The deterministic cloud adapter checks
ownership, concurrent claims, retry after server commit, local save failure,
offline/restart recovery, stale-owner rejection, repeated Z, and overnight sessions.
A JSDOM/IndexedDB test executes the POS UI startup, payment, X, Z and next-session
flow. These do not substitute for live Firestore rules tests or real-tablet layout,
printing and browser-storage checks.

## Rollback

1. Stop new sales, sync all Version 2 queues, export recovery data from each device,
   and close the active Version 2 sessions. Do not delete IndexedDB or localStorage.
2. Restore the app files from `version-1` through a new commit on master. Bump the
   service-worker cache to a fresh rollback name; do not reuse an old cache name.
3. Reopen all tablets after the deployment. Preserve Version 2 Firestore session
   records and local archives. Uploaded Version 2 sales remain in the existing
   transactions collection and dashboard.
4. Version 1 has its original X/Z session limitations; it does not understand shared
   closures. Rollback restores code, not old database contents. Never roll back by
   deleting real transactions.
