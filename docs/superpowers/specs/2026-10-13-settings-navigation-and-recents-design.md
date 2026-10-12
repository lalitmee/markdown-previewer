# Settings Navigation and Recent-Item Limit

## Goal

Make Settings a stable, directly addressable page and let users choose how many entries the Recents panel retains. Preserve the current visual style and existing settings behavior.

## Current behavior

- `App.jsx` switches views using local state. Settings is a special view that remembers and restores the prior view.
- The Settings action is removed from `TopBar` while Settings is open, and the Settings card has its own Back button.
- `src/lib/history.js` stores recent file/folder handles in IndexedDB and hard-caps the list at 20. The app displays the resulting list in its Recents drawer.

## Design

### Navigation

- Give Settings the URL `/settings`; opening Settings updates the URL, and loading or refreshing `/settings` opens Settings directly.
- Keep the header and its Settings navigation control present while Settings is open. The control should not disappear or cause the header layout to shift.
- Remove the in-card Back button. Users return to the main app through the header navigation.
- Browser Back/Forward should remain coherent with Settings navigation. Keep the existing picker/library/preview state model; do not introduce a routing dependency for this single route.
- Keep Vercel deep links working through its existing Vite SPA behavior; verify `/settings` in a production-like preview.

### Configurable Recents limit

- Add a History/Recents setting in Settings to select the maximum number of retained entries.
- Keep 20 as the default, preserving existing behavior. Offer a small set of practical choices (5, 10, 20, 50) rather than an unbounded numeric field.
- Persist the selected limit in local storage, consistent with the app's other preferences.
- When the limit is lowered, immediately trim older entries from IndexedDB and update the visible list. Future additions must obey the selected limit. Raising the limit does not restore entries already removed.
- Continue best-effort handling of browser storage failures and retain existing per-entry removal behavior. Do not add a separate clear-all feature.

## Scope and implementation constraints

- Reuse the existing Settings page, top bar, history module, and preference persistence patterns.
- No new dependency, account, server-side storage, or migration of existing local data.
- Avoid unrelated changes to appearance, excluded paths, file reading, and editing.

## Acceptance criteria

1. Settings control remains available in the header on both app and Settings views without a layout jump.
2. `/settings` opens Settings on direct navigation and refresh; navigating away and browser Back/Forward produce coherent locations and views.
3. The Settings card no longer contains its own Back control.
4. The selected Recents limit survives reload; the default is 20 when no saved preference exists.
5. Lowering the limit trims persisted and displayed recent entries; subsequent additions respect the limit.
6. Existing history ordering, duplicate handling, and individual removal continue to work.
7. Tests and production build pass, and the production-like `/settings` deep link serves the app.
