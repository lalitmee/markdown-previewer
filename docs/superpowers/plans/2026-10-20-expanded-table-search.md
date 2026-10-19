# Expanded Table Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add case-insensitive search across every cell in an expanded table and combine it with existing column filters.

**Architecture:** Keep the query local to the `TableModal` lifecycle, so closing the modal clears it and persisted table customizations remain unchanged. After the existing `applyTableState` pass, apply the modal query to every cell (including hidden columns), update the live row count, and clear the query on Reset table.

**Tech Stack:** React 18, existing `TableModal` DOM/table filtering, Vitest/JSDOM.

**Spec:** `docs/superpowers/specs/2026-10-20-markdown-export-and-table-search-design.md`

## Global Constraints

- Add a global, case-insensitive substring search field to the expanded-table modal. Search across every cell, including hidden columns.
- Combine this query with existing column filters; the visible row count reflects both.
- Clear the query when the modal closes. The existing Reset table action also clears the query together with current table customizations.

## Review Focus

- Empty query — preserve existing filtering and row counts.
- Query matches text in a hidden column — retain matching row because hidden columns still participate.
- Query conflicts with an existing column filter — show no rows and count `0 of N rows`.
- Reset with a nonempty query — clear query and all table customizations without closing the modal.
- Close then reopen — the query is empty while existing persisted table filters remain as designed.

---

### Task 1: Add modal-wide search

**Files:**

- Modify: `src/components/TableModal.jsx`
- Modify: `src/components/__tests__/PreviewTables.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Produces: local `searchQuery` state scoped to one `TableModal` mount; no global table-state schema change.
- Consumes: existing `applyTableState(bodyEl, tableState)`, `.mp-row-filtered`, and `.table-dialog-count` behavior.

- [ ] **Step 1: Write failing integration tests** for case-insensitive substring match across all cells, hidden-column matches, composition with a column filter, and visible count updates.
- [ ] **Step 2: Run** `npm test -- src/components/__tests__/PreviewTables.test.jsx`; confirm the global search control is absent.
- [ ] **Step 3: Implement** an accessible search field in the modal header/body. In the existing layout effect, first call `applyTableState`, then add the modal query condition to row visibility by reading all row-cell text regardless of hidden styling, and compute the live count from the final result.
- [ ] **Step 4: Run** the focused tests; expect PASS, including empty-query behavior preserving current filter results.
- [ ] **Step 5: Commit** `feat: search expanded table contents`.

### Task 2: Reset and close lifecycle

**Files:**

- Modify: `src/components/TableModal.jsx`
- Modify: `src/components/__tests__/PreviewTables.test.jsx`

- [ ] **Step 1: Write failing tests** that Reset table clears the query and existing table customizations while leaving the modal open, and closing/reopening starts with an empty query while preserving the persisted column filters.
- [ ] **Step 2: Run** `npm test -- src/components/__tests__/PreviewTables.test.jsx`; confirm the lifecycle assertions fail.
- [ ] **Step 3: Implement** query clearing in `resetTable`; rely on modal-local state disposal on close rather than adding query to persisted `tableState`.
- [ ] **Step 4: Run** the focused tests; expect PASS.
- [ ] **Step 5: Commit** `test: cover expanded table search lifecycle`.

### Task 3: Verify table search

- [ ] **Step 1: Run** `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`; expect all to pass.
- [ ] **Step 2: Browser smoke test** searching visible/hidden cells while column filters are active; verify live count and reset/close behavior.
- [ ] **Step 3: Commit** any test-only corrections separately.
