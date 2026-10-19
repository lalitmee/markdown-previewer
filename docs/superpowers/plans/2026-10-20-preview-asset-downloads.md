# Preview Asset Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users download each Markdown image in its original format and each rendered Mermaid diagram as SVG from the preview.

**Architecture:** Preserve an image's original Markdown source before `inlineImages` replaces local paths with data URLs. Add download buttons to preview-only DOM decoration and handle them through Preview's existing delegated click handler, keeping exported content untouched.

**Tech Stack:** React 18, browser `Blob`/`URL`/anchor download APIs, existing `fs-access.js` image inliner, Vitest/JSDOM.

**Spec:** `docs/superpowers/specs/2026-10-20-markdown-export-and-table-search-design.md`

## Global Constraints

- Add a download button for each Markdown image and Mermaid diagram in the preview. These controls are app-only and must not appear in either export.
- Download Markdown images in their original format and prefer their original filename.
- Download Mermaid diagrams as their rendered SVG using stable names `diagram-1.svg`, `diagram-2.svg`, etc.
- Reveal controls on hover or keyboard focus; keep them visible on hoverless/touch devices. Give each control an accessible name.
- Prevent a diagram download click from also triggering the existing diagram zoom behavior.
- If a remote image cannot be downloaded because of CORS or source access restrictions, show a clear error (“Can’t download this image from its source”). Do not open a new tab or proxy the asset.

## Review Focus

- Local paths become data URLs during preview rendering — retain original path/name so the downloaded filename stays useful.
- Remote image fetch is blocked by CORS — show the exact failure notice and do not navigate/open a tab.
- Diagram download bubbles into `.mdiagram` zoom — assert download completes without opening ZoomModal.
- Many images/diagrams — assert diagram numbering is stable and image names do not collide unnecessarily.
- Keyboard and touch users cannot hover — assert buttons are focusable and visible without hover on hoverless devices.

---

### Task 1: Preserve image source metadata

**Files:**

- Modify: `src/lib/fs-access.js`
- Modify: `src/lib/__tests__/fs-access.test.js`

**Interfaces:**

- Produces: each rendered Markdown `<img>` retains its original source in `data-original-src` before any local source is inlined.
- Consumes: existing `inlineImages(html, folderHandle, activePath)` behavior.

- [ ] **Step 1: Write failing tests** verifying relative local paths, remote URLs, data URLs, and query strings retain their original `src` in metadata while current inline behavior remains unchanged.
- [ ] **Step 2: Run** `npm test -- src/lib/__tests__/fs-access.test.js`; confirm metadata is not present.
- [ ] **Step 3: Implement** the metadata attribute in `inlineImages` without changing whether an image is inlined.
- [ ] **Step 4: Run** the focused tests; expect PASS.
- [ ] **Step 5: Commit** `feat: preserve markdown image source metadata`.

### Task 2: Preview download controls

**Files:**

- Modify: `src/components/Preview.jsx`
- Modify: `src/components/__tests__/PreviewAnchors.test.jsx` or create `src/components/__tests__/PreviewAssets.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: `data-original-src` from Task 1 and existing `.mdiagram svg` DOM.
- Produces: preview-only accessible controls; Mermaid names `diagram-1.svg`, `diagram-2.svg`, etc.; image names derived from the original path, falling back to `image-N` plus a MIME-derived extension.

- [ ] **Step 1: Write failing tests** for one Markdown-image button, multiple numbered Mermaid buttons, image original filename, generated SVG download, download error notice, and click non-propagation to zoom.
- [ ] **Step 2: Run** `npm test -- src/components/__tests__/PreviewAssets.test.jsx`; confirm the buttons are absent.
- [ ] **Step 3: Implement** preview-only button decoration after rendered HTML is committed, delegated click handling, Blob URL download and cleanup, and existing notice handling for fetch failures. Use the data URL for inlined local assets; fetch remote URLs only through the browser and report CORS/source failures.
- [ ] **Step 4: Add** focus-visible/hover styling, with controls always visible under `(hover: none)`; ensure `button` semantics and descriptive `aria-label`s.
- [ ] **Step 5: Run** the focused test and `npm run build`; expect PASS.
- [ ] **Step 6: Commit** `feat: download preview images and diagrams`.

### Task 3: Verify preview-only behavior

- [ ] **Step 1: Run** `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`; expect all to pass.
- [ ] **Step 2: Browser smoke test** keyboard focus, touch/hoverless visibility, local and remote image download, SVG opening from a downloaded file, and no zoom on download click.
- [ ] **Step 3: Commit** any test-only corrections separately.
