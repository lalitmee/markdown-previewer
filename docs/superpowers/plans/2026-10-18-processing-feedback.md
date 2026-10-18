# Processing Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show clear, accessible, phase-aware feedback when importing or rendering Markdown takes noticeable time.

**Architecture:** Keep operation ownership in `App` with one activity record and a monotonically increasing operation ID to reject stale results. A small `ProcessingStatus` component delays visible output by 300 ms and renders a polite live status; App passes status updates into Preview for async render/inlining. Folder scanning announces its phase before enumeration, then existing library indexing reports `current/total`.

**Tech Stack:** React 18, JSX, CSS, Vitest, React Testing Library-style DOM tests already used by the repo.

**Spec:** `docs/superpowers/specs/2026-10-18-processing-feedback-design.md`

## Global Constraints

- “Show visible feedback only after a short delay so fast operations do not flash a transient indicator.” Use a fixed 300 ms delay.
- “Keep current eager indexing and search behavior. Do not add parallel reads, lazy indexing, cancellation controls, or a general job framework in this change.”
- “Expose status updates with an appropriate polite live region and mark the busy content with `aria-busy`; motion must respect reduced-motion preferences.”
- “Do not disable navigation or make the app appear frozen while processing.”
- No new dependency, storage format, or change to file-selection semantics.

## Review Focus

- A folder scan that finds zero Markdown files still clears status and opens the empty library; pin this in Task 2.
- A read or scan failure clears activity and leaves a usable screen with an error notice; pin this in Task 2.
- A newer open or navigation supersedes an older unresolved read; pin this in Task 2.
- A quick operation completes before 300 ms and never flashes status; pin this in Task 1.
- A preview render canceled by text/theme/navigation changes cannot clear or overwrite a newer activity state; pin this in Task 3.

---

### Task 1: Shared accessible processing status

**Files:**

- Create: `src/components/ProcessingStatus.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Test: `src/components/__tests__/ProcessingStatus.test.jsx`

**Interfaces:**

- Produces `ProcessingStatus({ activity })`, where `activity` is `null` or `{ message: string, current?: number, total?: number }`.
- App owns `activity` and renders the status component for all app views. The app root gets `aria-busy={Boolean(activity)}`; the status element has `role="status"` and `aria-live="polite"`. No controls are disabled.

- [ ] **Step 1: Write failing component tests**

Add component tests proving that activity is not visible before 300 ms, appears at 300 ms with `role="status"` and `aria-live="polite"`, includes progress when both counts are present, and disappears when activity clears. Use Vitest fake timers and restore real timers after each test.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `yarn test src/components/__tests__/ProcessingStatus.test.jsx`
Expected: FAIL because the shared status component/state does not exist.

- [ ] **Step 3: Implement delayed `ProcessingStatus` and App ownership**

Render the status in the shared app shell, set `aria-busy` on the app root while activity is active, and show the status only after 300 ms. Display `message` and, when both counts are provided, `current/total`. Keep it visually consistent with existing CSS variables. Add a lightweight indicator animation and disable that animation under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Run the focused tests and verify pass**

Run: `yarn test src/components/__tests__/ProcessingStatus.test.jsx`
Expected: PASS, including fast completion without a flash.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProcessingStatus.jsx src/App.jsx src/styles.css src/components/__tests__/ProcessingStatus.test.jsx
git commit -m "feat: add shared processing status"
```

### Task 2: File, folder, drop, and history processing

**Files:**

- Modify: `src/App.jsx`
- Test: `src/__tests__/App.test.jsx`

**Interfaces:**

- App uses an operation counter ref. Starting a new import or leaving its destination increments the ID; async continuations update state only while their captured ID remains current.
- Activity shape from Task 1 uses optional `current` and `total` for indexing; the library already receives progress through its existing `indexed` and `files` props.

- [ ] **Step 1: Write failing tests for shared file/folder paths**

Make the existing `pickFolder`, `pickSingleFile`, `listMdFiles`, and `readFileText` test mocks configurable `vi.fn()` functions. Cover folder selection and directory history showing “Scanning folder” while `listMdFiles` is unresolved, then showing indexed progress; file selection, file history, and dropped file showing phase-appropriate status while their reads are unresolved. Assert `aria-busy="true"` while active. Include an empty folder case and a rejected scan/read case that leaves no busy status and shows an error notice.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `yarn test src/__tests__/App.test.jsx`
Expected: FAIL because the current flows publish no activity before awaiting work.

- [ ] **Step 3: Wire activity through import and history handlers**

Set activity before each awaited scan/read, update phase/progress as the operation proceeds, and clear activity in `finally` only if the operation ID is still current. Catch failures at the handler boundary and use the existing notice. Permission denial must also clear activity before preserving its existing navigation/message behavior. Ensure a zero-file scan transitions to the empty library and clears activity.

- [ ] **Step 4: Add and run stale-operation regression test**

Hold one file read unresolved, start a second open or navigate home, resolve the older read, and assert it cannot replace the newer view or clear its activity.

Run: `yarn test src/__tests__/App.test.jsx`
Expected: PASS for file, folder, drop, history, error, empty-folder, and stale-operation cases.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/__tests__/App.test.jsx
git commit -m "feat: report file and folder processing"
```

### Task 3: Pasted Markdown and preview rendering

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/components/Preview.jsx`
- Test: `src/__tests__/App.test.jsx`

**Interfaces:**

- Preview receives `onProcessingChange(activityOrNull)` from App. Each render effect reports `{ message: 'Rendering preview' }` before its first await and clears it only when that effect instance is still current; effect cleanup never clears a newer operation's status.
- App routes Preview activity through the shared status component from Tasks 1–2. Navigation and new imports clear/replace activity at their own boundaries.

- [ ] **Step 1: Write failing preview activity tests**

Mock or defer `renderMarkdown`/`inlineImages` to prove pasted Markdown and file preview announce rendering when the work exceeds 300 ms, then clear status on completion. Verify an obsolete render finishing after a newer render does not clear the newer status.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `yarn test src/__tests__/App.test.jsx`
Expected: FAIL because Preview currently has no processing callback.

- [ ] **Step 3: Report Preview render lifecycle to App**

Call the callback before rendering/inlining and clear it after completion only when that render remains current. Preserve current cancellation behavior for setting rendered HTML; cleanup must not clear activity because a newer render or import may own it.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `yarn test src/__tests__/App.test.jsx`
Expected: PASS for pasted preview, regular preview, fast completion, and obsolete-render cases.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/Preview.jsx src/__tests__/App.test.jsx
git commit -m "feat: show markdown preview processing status"
```

### Task 4: Full verification

**Files:**

- No additional files; validate the combined change.

- [ ] **Step 1: Run all tests**

Run: `yarn test`
Expected: all tests pass.

- [ ] **Step 2: Run lint and formatting checks**

Run: `yarn lint && yarn format:check`
Expected: both checks pass.

- [ ] **Step 3: Build production assets**

Run: `yarn build`
Expected: Vite completes successfully.

- [ ] **Step 4: Review final diff**

Run: `git diff --check && git status --short`
Expected: no whitespace errors; only intended source/test changes remain.
