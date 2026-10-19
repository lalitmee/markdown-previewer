# Document Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export the current Markdown document as standalone HTML or a directly downloaded Clean-style PDF.

**Architecture:** Build export content from the current Markdown text through `renderMarkdown` and `inlineImages`, then generate standalone HTML or convert that HTML with `html-to-pdfmake` and `pdfmake`. Wire the actions through the existing `App` → `TopBar` document props so exports include unsaved edits.

**Tech Stack:** React 18, Vite, marked/DOMPurify/Mermaid via the existing renderer, `html-to-pdfmake`, `pdfmake`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-20-markdown-export-and-table-search-design.md`

## Global Constraints

- Both exports use the current Markdown text, including unsaved edits, and the existing Markdown rendering pipeline.
- Download one `.html` file containing the rendered document and embedded document styles.
- Embed local images when available. Preserve remote image URLs when browser CORS prevents embedding.
- Generate and download the PDF in-app; do not route through browser print.
- Bundle the dependencies with the app so the export path does not require fetching a library chunk at runtime while offline.
- Use one initial visual style, **Clean**; include a compact table of contents when there are multiple headings.
- The title is the first H1, otherwise the source filename, otherwise “Untitled document.”
- Preserve existing sanitization and Markdown rendering behavior. Keep export controls out of generated output.

## Review Focus

- Unsaved editor text differs from the last rendered preview — assert both formats contain the latest text.
- Relative local image paths with folder handles — assert HTML embeds the asset and the PDF converter receives it.
- Remote image fetch blocked by CORS — assert HTML retains the source URL and PDF generation degrades without aborting.
- Missing H1 and unsafe filename characters — assert the specified title fallback and a safe download filename.
- Zero/one/multiple headings and Mermaid SVG — assert TOC inclusion rule and SVG conversion without corrupting the document.

---

### Task 1: HTML export builder

**Files:**

- Create: `src/lib/documentExport.js`
- Create: `src/lib/__tests__/documentExport.test.js`
- Modify: `src/lib/fs-access.js` only if tests show the existing image inliner cannot support export without changing preview behavior.

**Interfaces:**

- Produces: `buildStandaloneHtml({ text, theme, folderHandle, activePath, title }) -> Promise<string>`.
- Consumes: `renderMarkdown(text, theme)` and `inlineImages(html, folderHandle, activePath)`.

- [ ] **Step 1: Write failing tests** for title fallback (first H1, filename, then “Untitled document”), embedded document CSS, heading IDs, GFM table/code/link/SVG preservation, local image inlining, remote URL retention, and absence of app controls.
- [ ] **Step 2: Run** `npm test -- src/lib/__tests__/documentExport.test.js`; confirm the new builder is missing/fails.
- [ ] **Step 3: Implement** `buildStandaloneHtml` with a small document-only style string; use the existing renderer/inliner and do not copy the application stylesheet wholesale.
- [ ] **Step 4: Run** `npm test -- src/lib/__tests__/documentExport.test.js`; expect PASS.
- [ ] **Step 5: Commit** `feat: build standalone markdown html export`.

### Task 2: Export menu and HTML download

**Files:**

- Modify: `src/App.jsx`
- Modify: `src/components/TopBar.jsx`
- Modify: `src/components/__tests__/TopBar.test.jsx`
- Modify: `src/__tests__/App.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: `buildStandaloneHtml` from Task 1.
- Produces: document props `onExportHtml` and `onExportPdf` for `TopBar`; PDF callback is wired in Task 3.

- [ ] **Step 1: Write failing tests** that render the document toolbar Export menu and assert the HTML action invokes the callback with the currently edited text and active file/folder context.
- [ ] **Step 2: Run** `npm test -- src/components/__tests__/TopBar.test.jsx src/__tests__/App.test.jsx`; confirm the export action is absent.
- [ ] **Step 3: Implement** the Export menu and App callback; create a Blob URL, trigger an anchor download, and revoke the URL after initiating the download. Route errors through the existing notice pattern.
- [ ] **Step 4: Run** the focused tests; expect PASS, including keyboard-accessible menu activation.
- [ ] **Step 5: Commit** `feat: add html export action`.

### Task 3: PDF conversion and download

**Files:**

- Modify: `package.json`
- Modify: `src/lib/documentExport.js`
- Modify: `src/lib/__tests__/documentExport.test.js`
- Modify: `src/App.jsx`
- Modify: `src/components/__tests__/TopBar.test.jsx`

**Interfaces:**

- Consumes: `buildStandaloneHtml` from Task 1 and `onExportPdf` wiring from Task 2.
- Produces: `downloadPdf({ html, title }) -> Promise<void>`; it triggers the browser download and rejects on conversion/generation failure.

- [ ] **Step 1: Add failing PDF conversion tests** for the Clean title, TOC absent for zero/one heading and present for multiple headings, page numbering, and input containing headings, tables, code, links, images, and Mermaid SVG.
- [ ] **Step 2: Run** `npm test -- src/lib/__tests__/documentExport.test.js`; confirm the PDF conversion API is missing.
- [ ] **Step 3: Add** `html-to-pdfmake` and `pdfmake`, then implement `downloadPdf` with a bundled import and a title/header/footer plus compact TOC only for multiple headings. Preserve semantic text and degrade gracefully when a remote image cannot be fetched.
- [ ] **Step 4: Wire** the PDF toolbar action to build current HTML and call `downloadPdf`; surface failure through the existing notice.
- [ ] **Step 5: Run** `npm test -- src/lib/__tests__/documentExport.test.js src/components/__tests__/TopBar.test.jsx src/__tests__/App.test.jsx` and `npm run build`; inspect the production bundle-size delta.
- [ ] **Step 6: Commit** `feat: add direct pdf export`.

### Task 4: Export verification

**Files:**

- Modify tests only where browser-level behavior needs coverage.

- [ ] **Step 1: Run** `npm test`, `npm run lint`, `npm run format:check`, and `npm run build`; expect all to pass.
- [ ] **Step 2: Browser smoke test** HTML and PDF downloads using unsaved editor text, local and remote images, Mermaid, long code, wide tables, and multiple pages; verify page numbers and TOC behavior.
- [ ] **Step 3: Commit** any test-only corrections separately.
