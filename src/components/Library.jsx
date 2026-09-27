import { findSnippet, highlightSnippet } from '../lib/search';

function sizeOf(handle) {
  return formatSize(handle && handle.size);
}

export function formatSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '?';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function Library({ files, cache, indexed, query, viewMode, onOpen }) {
  const q = (query || '').trim().toLowerCase();
  const shown = q ? files.filter((f) => {
    const t = cache.get(f.path) || '';
    return f.name.toLowerCase().includes(q) || t.toLowerCase().includes(q);
  }) : files;

  const body = (f, snip) => (
    <button key={f.path} className={viewMode === 'list' ? 'list-row' : 'card'} onClick={() => onOpen(f)}>
      <span className="fname">{f.name}</span>
      <span className="meta">{sizeOf(f.handle)}</span>
      {snip && <span className="snippet" dangerouslySetInnerHTML={{ __html: snip }} />}
    </button>
  );

  return (
    <main className="library">
      <p className="result-count">
        {indexed != null && indexed < files.length
          ? `Indexing… ${indexed}/${files.length}`
          : `${files.length} files`}
        {q ? ` · ${shown.length} matches` : ''}
      </p>
      <div className={viewMode === 'list' ? 'list-view' : 'file-grid'}>
        {shown.map((f) => {
          const t = cache.get(f.path) || '';
          const snip = q ? highlightSnippet(findSnippet(t, q), q) : '';
          return body(f, snip);
        })}
      </div>
      {!shown.length && <p className="empty-state">No markdown files found.</p>}
    </main>
  );
}