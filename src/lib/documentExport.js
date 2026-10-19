import { inlineImages } from './fs-access';
import { renderMarkdown } from './markdown';

const DOCUMENT_STYLES = `
  :root { color-scheme: light; }
  body { margin: 0; padding: 2rem; color: #24292f; font: 16px/1.6 system-ui, sans-serif; }
  .md-body { max-width: 860px; margin: 0 auto; overflow-wrap: anywhere; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.5em 0 .6em; }
  a { color: #0969da; }
  img, svg { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d0d7de; padding: .45rem .65rem; text-align: left; }
  th { background: #f6f8fa; }
  pre { overflow-x: auto; padding: 1rem; background: #f6f8fa; border-radius: 6px; }
  code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
  :not(pre) > code { background: #f6f8fa; padding: .12em .3em; border-radius: 3px; }
  blockquote { margin-left: 0; padding-left: 1rem; border-left: 3px solid #d0d7de; color: #57606a; }
  @media print { body { padding: 0; } pre, table, img, svg { break-inside: avoid; } }
`;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char];
  });
}

export async function buildStandaloneHtml({
  text,
  theme = 'light',
  folderHandle,
  activePath = '',
  title = '',
}) {
  const rendered = await renderMarkdown(text, theme);
  const inlined = await inlineImages(rendered, folderHandle, activePath);
  const content = document.createElement('div');
  content.innerHTML = inlined;
  const heading = content.querySelector('h1')?.textContent.trim();
  const pageTitle = heading || title || 'Untitled document';

  content
    .querySelectorAll('button, [data-export-ignore]')
    .forEach((node) => node.remove());
  content
    .querySelectorAll('[data-original-src]')
    .forEach((image) => image.removeAttribute('data-original-src'));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<style>${DOCUMENT_STYLES}</style>
</head>
<body>
<main class="md-body">${content.innerHTML}</main>
</body>
</html>`;
}
