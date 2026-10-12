# Settings Navigation and Recent-Item Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Settings addressable at `/settings`, keep its header navigation stable, and let users configure the retained Recents count.

**Architecture:** Keep the existing view-state architecture and use the browser History API for the Settings URL; no router dependency. Persist the selected cap with the existing local-storage preference pattern, and pass it to the existing IndexedDB history module for listing, trimming, and adding entries.

**Tech Stack:** React 18, Vite 6, browser History API, localStorage, IndexedDB, Vitest, jsdom, fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-10-13-settings-navigation-and-recents-design.md`

## Global Constraints

- Keep 20 as the default, preserving existing behavior.
- Offer choices 5, 10, 20, and 50.
- No new dependency, account, server-side storage, or migration of existing local data.
- Avoid unrelated changes to appearance, excluded paths, file reading, and editing.

## Review Focus

- Invalid or stale saved limit: use the default of 20 rather than passing an invalid cap into history operations.
- History API `popstate` and direct `/settings` load: keep URL and rendered view synchronized, including refresh.
- Lowering the limit: remove oldest IndexedDB records and update React state; raising it must not recreate discarded records.
- Re-adding an existing item: retain existing deduplication and most-recent ordering while enforcing the cap.
- Storage unavailable/rejected: retain the current best-effort persistence behavior without breaking app navigation or rendering.

---

### Task 1: Configurable IndexedDB history cap

**Files:**
- Modify: `src/lib/history.js`
- Test: `src/lib/__tests__/history.test.js`

**Interfaces:**
- Consumes: existing `createHistory()` API and `HISTORY_LIMIT` constant.
- Produces: `createHistory()` methods `list(limit = HISTORY_LIMIT)`, `add(handle, location, limit = HISTORY_LIMIT)`, and `trim(limit = HISTORY_LIMIT)`. `trim` deletes entries after the newest `limit` and returns the retained sorted rows.

- [ ] **Step 1: Write failing tests** for `trim` keeping the newest N items, `add` respecting a supplied limit while preserving duplicate refresh/order semantics, and the default limit remaining 20.
- [ ] **Step 2: Run** `npm test -- src/lib/__tests__/history.test.js`; confirm the new API/expectations fail.
- [ ] **Step 3: Implement** optional `limit` parameters in `list`/`add` and `trim` in `src/lib/history.js`. Clamp via integer validation to a nonnegative finite count; preserve existing default behavior. Trim oldest items from IndexedDB.
- [ ] **Step 4: Run** `npm test -- src/lib/__tests__/history.test.js`; expect all history tests to pass.
- [ ] **Step 5: Commit** as `feat: support configurable recent history limit`.

### Task 2: Settings URL and stable header navigation

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/TopBar.jsx`
- Modify: `src/components/SettingsPage.jsx`
- Test: `src/components/__tests__/TopBar.test.jsx`
- Test: `src/components/__tests__/SettingsPage.test.jsx`
- Test: add focused App navigation coverage using the existing test setup if one exists; otherwise verify manually in the Vite preview.

**Interfaces:**
- Consumes: existing `view` state, `openSettings`/`closeSettings`, `TopBar` callback props.
- Produces: Settings route synchronization with `window.location.pathname`; Settings action remains rendered on Settings view, and activation returns to `/` and the prior app view. Back/Forward and initial `/settings` load synchronize the view.

- [ ] **Step 1: Add/adjust tests** proving the Settings control remains rendered when active, and SettingsPage no longer renders an in-card Back control.
- [ ] **Step 2: Run** `npm test -- src/components/__tests__/TopBar.test.jsx src/components/__tests__/SettingsPage.test.jsx`; confirm the new assertions fail.
- [ ] **Step 3: Implement** minimal History API integration in `App.jsx`: initialize Settings from `/settings`, push `/settings` when opening, return to `/` when the header control is activated on Settings, and listen to `popstate` to synchronize the view. Preserve return-to-view behavior for in-app navigation.
- [ ] **Step 4: Update** `TopBar`/`SettingsPage` wiring so the header action is always present and serves as the exit action while Settings is active; remove the card Back button and its prop.
- [ ] **Step 5: Run** the focused component tests and full `npm test`; verify the navigation tests pass.
- [ ] **Step 6: Commit** as `feat: add addressable settings navigation`.

### Task 3: User-configurable Recents limit

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/SettingsPage.jsx`
- Test: `src/components/__tests__/SettingsPage.test.jsx`
- Test: `src/lib/__tests__/history.test.js`

**Interfaces:**
- Consumes: Task 1 `history.list(limit)`, `history.add(handle, location, limit)`, and `history.trim(limit)`.
- Produces: Settings control with accessible label “Recent items limit”, options 5, 10, 20, 50; selection persisted under `mdpv-history-limit`, default 20.

- [ ] **Step 1: Add failing SettingsPage test** for the accessible select, all four options, and selected value callback.
- [ ] **Step 2: Run** `npm test -- src/components/__tests__/SettingsPage.test.jsx`; confirm failure.
- [ ] **Step 3: Add failing app/history integration coverage** proving a saved limit loads, lowering calls trim and updates the visible recents, and subsequent adds use that limit. Cover an invalid stored value falling back to 20.
- [ ] **Step 4: Run** the relevant tests and confirm they fail for missing behavior.
- [ ] **Step 5: Implement** the setting in `SettingsPage.jsx`; in `App.jsx`, load and validate the stored value, persist changes, call `history.trim` and update `historyList`, and pass the selected limit to every history `list`/`add` path.
- [ ] **Step 6: Run** `npm test`; expect the full test suite to pass.
- [ ] **Step 7: Commit** as `feat: make recent item limit configurable`.

### Task 4: Production-like verification

**Files:**
- No planned source changes unless verification reveals a defect.

- [ ] **Step 1: Run** `npm test` and `npm run build`; both must pass.
- [ ] **Step 2: Run** `npm run preview -- --host 127.0.0.1` and verify `/settings` loads directly and after refresh; verify the header stays stable and the History limit control updates the Recents list.
- [ ] **Step 3: Verify** browser Back/Forward between `/` and `/settings`; confirm the URL and view remain synchronized.
