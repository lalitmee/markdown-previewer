# Research: Markdown Export Formats
Generated: 2026-10-19

## Executive Summary

For sharing rendered Markdown, the strongest initial choices are PDF and standalone HTML. PDF is convenient for fixed-layout distribution and printing; standalone HTML is a closer match to this browser renderer and can preserve links, SVG diagrams, and selectable text. DOCX is useful when recipients need to edit the document in Word, but it is a separate conversion target and should not be sold as a pixel-faithful export. EPUB is appropriate mainly for long-form, reflowable reading, not as a general document-sharing format. Keep Markdown source download separate from rendered export.

## Best Practices

- **PDF / print:** Prefer the browser's native print dialog for the lightest first implementation; it lets the user save as PDF without a PDF-generation dependency. Add print-specific CSS, hide application controls, and ensure SVG diagrams and local images are loaded before printing. Browser print output is user-agent controlled, so do not promise identical output across browsers. [official: MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) [official: MDN print CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing)
- **HTML:** Generate a standalone document with embedded styles and local assets (or package HTML plus assets). This is the closest fit for the current renderer. A single-file HTML can be convenient to share, though large embedded images increase file size. [official: Pandoc standalone / embed resources](https://pandoc.org/MANUAL.html#option--embed-resources)
- **DOCX:** Treat as an editable semantic conversion, not a screenshot of the preview. Conversion can lose formatting because source and target formats have different expressive capabilities; test tables, code, links, images, and SVG diagrams explicitly. [official: Pandoc conversion limitations](https://pandoc.org/MANUAL.html#general-options)
- **EPUB:** EPUB 3.3 is a standard single-file package for reflowable publications, with navigation and embedded HTML/CSS/SVG resources. It is a good later option for book-length content; the packaging, metadata, navigation, and reader compatibility requirements are unnecessary overhead for ordinary shared notes. [official: W3C EPUB 3.3](https://www.w3.org/TR/epub-33/)
- **Images (PNG/SVG):** Useful for a diagram or short visual excerpt, not a whole text document. Image exports lose selection/search/accessibility and SVG handling has varying destination support. Consider diagram-only export separately if users ask.

## Trends & Patterns

- Export tools commonly offer HTML, PDF, and DOCX as the broad-purpose set; EPUB appears where ebook/long-form reading is a deliberate use case. [GitHub examples: md2pdf-mermaid](https://github.com/rbutinar/md2pdf-mermaid) [GitHub examples: Pandoc](https://github.com/jgm/pandoc)
- Mermaid-to-PDF reliability is a recurring implementation pitfall: diagrams can be omitted or remain raw text unless rendering finishes and SVG/image output is supported by the chosen print/conversion path. [community: Stack Overflow question](https://stackoverflow.com/questions/78897186/converting-markdown-with-mermaid-diagrams-to-pdf-graphs-missing-in-pdf-output) [GitHub issue example](https://github.com/yzane/vscode-markdown-pdf/issues/342)
- PDF is not a single automatic “download” capability in the browser: `window.print()` opens a user-controlled print dialog; direct file generation requires an additional rendering/generation approach. [official: MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) [official: Pandoc PDF requirements](https://pandoc.org/MANUAL.html#creating-a-pdf)

## Real-World Examples

- [rbutinar/md2pdf-mermaid](https://github.com/rbutinar/md2pdf-mermaid) documents PDF output with Mermaid diagrams, page sizes/orientation, table of contents, page numbers, code highlighting, and emoji support. The README also documents engine-specific limitations, demonstrating why fidelity and compatibility need explicit testing.
- [Pandoc](https://github.com/jgm/pandoc) supports PDF, DOCX, EPUB, standalone HTML, and many other formats. Its manual explicitly warns that conversions can be lossy when formats differ in expressiveness; its broad format menu is a general converter's scope, not a recommendation to implement every format in this app.
- [Mermaid PDF export issue](https://github.com/yzane/vscode-markdown-pdf/issues/342) records a missing-diagram failure, a relevant regression case for this app's Mermaid support.

## Official Documentation

- [W3C EPUB 3.3](https://www.w3.org/TR/epub-33/) — EPUB is a ZIP-packaged publication with metadata, resource manifest, reading order, navigation, and reflowable layout by default.
- [MDN `Window.print()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/print) — widely available; invokes a user-controlled print dialog and blocks while the dialog is open.
- [Pandoc User's Guide](https://pandoc.org/MANUAL.html) — documents PDF/DOCX/EPUB/HTML targets, standalone HTML/resource embedding, PDF engine dependencies, and expected lossy conversions.

## Community Discussion

- [Stack Overflow: Mermaid graphs missing in PDF](https://stackoverflow.com/questions/78897186/converting-markdown-with-mermaid-diagrams-to-pdf-graphs-missing-in-pdf-output) — illustrates that conversion pipelines can fail to carry rendered diagrams through to PDF.
- [GitHub issue: Mermaid missing in PDF export](https://github.com/yzane/vscode-markdown-pdf/issues/342) — practical evidence that Mermaid needs explicit export regression coverage.

## Recommendations

1. Start with **Print / Save as PDF** using print CSS; do not add a PDF library unless direct one-click file generation is a requirement.
2. Add **Standalone HTML** for the closest faithful, portable rendered document; include styles, images, and inline Mermaid SVG, and preserve normal links and heading anchors.
3. Offer **Word (.docx)** only if editable output is an explicit need. Label it as an editable conversion and accept that exact preview styling may differ.
4. Defer **EPUB** until ebook/e-reader use appears; defer whole-document PNG and other formats unless users ask.
5. Keep **Download Markdown** as a source-file action, not as a rendered export format. In this app, edits may be unsaved, so export should use the current editor text.

## Repo-Specific Content Checklist

- Use the current unsaved editor text when in edit mode.
- Preserve title/filename, semantic headings, lists, GFM tables, fenced code blocks with syntax highlighting, and working external links.
- Include Mermaid as static SVG for HTML/PDF/DOCX paths; never require the recipient to run Mermaid JavaScript just to view the export.
- Preserve local relative images by embedding them for single-file exports or packaging them with the document; retain external image URLs as links or images where supported.
- Keep internal heading links functional; handle relative document links deliberately rather than leaving links to files that are not included.
- Exclude app chrome, editor controls, table resize/expand affordances, modals, and back-to-top controls.
- Use readable light print styling, page margins, sensible code wrapping, table sizing, and page-break behavior; avoid exporting the user's dark UI theme as the default paper appearance.
- Keep sanitization in the rendering path; never turn untrusted source HTML into unsanitized export markup.

## Sources

- https://www.w3.org/TR/epub-33/
- https://developer.mozilla.org/en-US/docs/Web/API/Window/print
- https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing
- https://pandoc.org/MANUAL.html
- https://github.com/jgm/pandoc
- https://github.com/rbutinar/md2pdf-mermaid
- https://stackoverflow.com/questions/78897186/converting-markdown-with-mermaid-diagrams-to-pdf-graphs-missing-in-pdf-output
- https://github.com/yzane/vscode-markdown-pdf/issues/342
