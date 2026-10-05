import { escapeHtml, findSnippet, highlightSnippet } from '../lib/search';

function duplicateFolderPaths(files) {
  const groups = new Map();
  for (const file of files) {
    const group = groups.get(file.name) || [];
    group.push(file);
    groups.set(file.name, group);
  }

  const paths = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const folders = group.map((file) => file.path.split('/').slice(0, -1));
    folders.forEach((parts, index) => {
      if (!parts.length) {
        paths.set(group[index].path, './');
        return;
      }

      for (let depth = 1; depth <= parts.length; depth++) {
        const suffix = parts.slice(-depth).join('/');
        const isUnique = folders.every((other, otherIndex) =>
          otherIndex === index || other.slice(-depth).join('/') !== suffix,
        );
        if (isUnique) {
          paths.set(group[index].path, suffix + '/');
          break;
        }
      }
    });
  }
  return paths;
}

export default function Library({ files, folderName, cache, indexed, query, scope, viewMode, onOpen }) {
  const folderPaths = duplicateFolderPaths(files);
  const q = (query || '').trim().toLowerCase();
  const byName = scope !== 'content';
  const shown = q ? files.filter((f) => (byName ? f.name : cache.get(f.path) || '').toLowerCase().includes(q)) : files;

  const body = (f, name, snip) => (
    <button
      key={f.path}
      className={viewMode === 'list' ? 'list-row' : 'card'}
      onClick={() => onOpen(f)}
      title={folderPaths.has(f.path) ? f.path : undefined}
    >
      <span className="file-label">
        <span className="fname" dangerouslySetInnerHTML={{ __html: name }} />
        {folderPaths.has(f.path) && <span className="folder-path">{folderPaths.get(f.path)}</span>}
      </span>
      {snip && <span className="snippet" dangerouslySetInnerHTML={{ __html: snip }} />}
    </button>
  );

  return (
    <main className="library">
      <p className="result-count">
        {folderName && (
          <span className="crumb">
            <span className="material-symbols-outlined crumb-ico" aria-hidden="true">folder</span>
            {folderName}
          </span>
        )}
        {folderName && ' · '}
        {indexed != null && indexed < files.length
          ? `Indexing… ${indexed}/${files.length}`
          : `${files.length} files`}
        {q ? ` · ${shown.length} matches` : ''}
      </p>
      <div className={viewMode === 'list' ? 'list-view' : 'file-grid'}>
        {shown.map((f) => {
          const t = cache.get(f.path) || '';
          const snip = q && !byName ? highlightSnippet(findSnippet(t, q), q) : '';
          const name = q && f.name.toLowerCase().includes(q)
            ? highlightSnippet(f.name, q)
            : escapeHtml(f.name);
          return body(f, name, snip);
        })}
      </div>
      {!shown.length && <p className="empty-state">No markdown files found.</p>}
    </main>
  );
}
