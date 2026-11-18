// Resolve folder-local links without allowing traversal above the selected root.
export function resolveDocumentLink(href, activePath) {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return null;
  const hashIndex = href.indexOf('#');
  const hash = hashIndex < 0 ? '' : href.slice(hashIndex + 1);
  const raw = href.split(/[?#]/, 1)[0];
  try {
    const path = decodeURIComponent(raw).replace(/\\/g, '/');
    const parts = path.startsWith('/')
      ? []
      : activePath.split('/').slice(0, -1);
    if (!path) return { path: activePath, hash: decodeURIComponent(hash) };
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        if (!parts.length)
          return { error: 'Link points outside the opened folder.' };
        parts.pop();
      } else parts.push(part);
    }
    return { path: parts.join('/'), hash: decodeURIComponent(hash) };
  } catch (_) {
    return { error: 'This document link has an invalid path.' };
  }
}
