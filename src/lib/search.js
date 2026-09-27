export const MD_EXT = ['.md', '.markdown', '.mdown', '.mkd'];
export const IMG_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'];

export function isMarkdownName(name) {
  const n = String(name).toLowerCase();
  return MD_EXT.some((e) => n.endsWith(e));
}

export function isImageName(name) {
  const n = String(name).toLowerCase();
  return IMG_EXT.some((e) => n.endsWith(e));
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function normPath(p) {
  return String(p).replace(/^\/+/, '');
}

export function dirOf(path) {
  const i = String(path).lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

export function resolveRel(baseDir, src) {
  const clean = String(src).split('#')[0].split('?')[0];
  if (!clean.trim() || /^(https?:|data:|blob:)/i.test(clean)) return null;
  const parts = (baseDir ? baseDir + '/' + clean : clean).split('/');
  const out = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/').toLowerCase();
}

export function findSnippet(text, q) {
  const t = String(text || '');
  const needle = String(q).trim().toLowerCase();
  if (!needle) return '';
  const i = t.toLowerCase().indexOf(needle);
  if (i < 0) return '';
  const lineStart = t.lastIndexOf('\n', i) + 1;
  let lineEnd = t.indexOf('\n', i);
  if (lineEnd < 0) lineEnd = t.length;
  let line = t.slice(lineStart, lineEnd).trim();
  if (line.length > 160) {
    line = '…' + line.slice(Math.max(0, i - lineStart - 60), i - lineStart + 100).trim() + '…';
  }
  return line;
}

export function highlightSnippet(snippet, q) {
  const esc = escapeHtml(snippet);
  const n = String(q).trim();
  if (!n) return esc;
  const rx = new RegExp('(' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return esc.replace(rx, '<mark>$1</mark>');
}