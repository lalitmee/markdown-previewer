# Markdown Export and Table Search

## Goal

Let readers export the current Markdown document as a polished standalone HTML file or a directly downloaded PDF, download individual images and diagrams from the preview, and search all content in an expanded table.

## Current behavior

- `Preview` receives the current Markdown text, renders it through `renderMarkdown`, and inlines local image assets with `inlineImages`.
- Mermaid diagrams are rendered as SVG within `.mdiagram` elements. Clicking a diagram opens the existing zoom behavior.
- The document toolbar has no export menu.
- `TableModal` decorates expanded tables with column filters, hidden columns, and resizing. Its existing “Search values” field searches values within one column's filter menu; there is no whole-table search.
- The app is local-first. Local images are resolved through directory handles; remote assets may not be readable due to browser CORS restrictions.

## Design

### Export menu and source of truth

- Add an Export menu to the document toolbar with **HTML** and **PDF** actions.
- Both exports use the current Markdown text, including unsaved edits, and the existing Markdown rendering pipeline. Do not export stale DOM state or app UI.
- Keep source Markdown download separate from rendered-document export; it is outside this change.
- Use a shared export preparation path where practical so title, rendered content, and asset handling are consistent, without introducing a general export framework.

### Standalone HTML

- Download one `.html` file containing the rendered document and embedded document styles.
- Preserve semantic headings and anchors, GFM tables, code, links, and static Mermaid SVGs. Exclude editor controls, table-modal controls, and other app-only interactions.
- Embed local images when available. Preserve remote image URLs when browser CORS prevents embedding; those images will still require network access when the exported file is opened.
- Use the document title for the exported page and filename, with a safe fallback when unavailable.

### PDF

- Generate and download the PDF in-app; do not route through browser print.
- Convert the existing rendered HTML to pdfmake document definitions with `html-to-pdfmake`, then generate the PDF with `pdfmake`. Bundle the dependencies with the app so the export path does not require fetching a library chunk at runtime while offline.
- Use one initial visual style, **Clean**: readable typography, document title, compact table of contents when there are multiple headings, and page numbering. The title is the first H1, otherwise the source filename, otherwise “Untitled document.”
- Preserve headings, tables, code, links, images, and Mermaid SVG where supported. PDF layout need not be pixel-identical to the preview; test pagination and complex content. Remote images that cannot be fetched due to CORS remain an HTML concern and may not appear in the PDF.
- Measure the production bundle impact of PDF dependencies during implementation; do not add a runtime service or server-side conversion path.

### Preview asset downloads

- Add a download button for each Markdown image and Mermaid diagram in the preview. These controls are app-only and must not appear in either export.
- Download Markdown images in their original format and prefer their original filename. Download Mermaid diagrams as their rendered SVG using stable names `diagram-1.svg`, `diagram-2.svg`, etc.
- Reveal controls on hover or keyboard focus; keep them visible on hoverless/touch devices. Give each control an accessible name.
- Prevent a diagram download click from also triggering the existing diagram zoom behavior.
- If a remote image cannot be downloaded because of CORS or source access restrictions, show a clear error (“Can’t download this image from its source”). Do not open a new tab or proxy the asset.

### Expanded-table search

- Add a global, case-insensitive substring search field to the expanded-table modal. Search across every cell, including hidden columns.
- Combine this query with existing column filters; the visible row count reflects both.
- Clear the query when the modal closes. The existing Reset table action also clears the query together with current table customizations.

## Scope and constraints

- No DOCX, EPUB, image export of full documents, browser-print PDF flow, remote proxy, or new server component.
- Preserve existing sanitization and Markdown rendering behavior. Keep export controls out of generated output.
- Remote image access remains subject to browser CORS. Report download failures clearly rather than weakening browser security.
- Keep the initial PDF styling to the approved Clean style; additional themes are out of scope.

## Acceptance criteria

1. The toolbar exports the current unsaved Markdown as a standalone HTML file and a directly downloaded PDF.
2. Standalone HTML includes embedded styles, local embedded images when available, preserved remote image URLs when embedding is blocked, and static Mermaid SVG; it contains no app controls.
3. PDF uses the Clean style, correct title fallback, a contents section only when there are multiple headings, and page numbers; headings, tables, code, links, images, and Mermaid SVG render acceptably across tested pagination cases.
4. Each preview Markdown image and Mermaid diagram has an accessible download control; image format/name and SVG naming follow the design, and a diagram download does not invoke zoom.
5. A blocked remote-image download shows the specified error without opening a new tab.
6. Expanded-table search is case-insensitive, matches cells in hidden columns, composes with column filters, updates the visible count, and is cleared by reset and modal close.
7. Focused tests cover HTML export title/contents/assets/control exclusion; PDF conversion of headings/tables/code/Mermaid SVG/page numbering; image and diagram downloads including CORS failure; and table-search matching, filter composition, reset, and close behavior.
8. Browser smoke testing verifies actual file downloads and PDF pagination. Existing tests and the production build pass.
