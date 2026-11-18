import { useEffect, useMemo, useRef, useState } from 'react';
import CustomSelect from './CustomSelect';
import { createExcerptCache } from '../lib/excerpt';
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
        const isUnique = folders.every(
          (other, otherIndex) =>
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

export default function Library({
  files,
  folderName,
  cache,
  query,
  scope,
  viewMode,
  onOpen,
  sortOrder,
  onSortOrder,
  onViewMode,
  activity,
  onStatusMount,
}) {
  // Folder loads replace the source Map; release excerpts from the old folder.
  const excerptCache = useMemo(
    () => ({ source: cache, get: createExcerptCache() }),
    [cache],
  );
  const layoutRef = useRef(null);
  useEffect(() => {
    function closeOutside(event) {
      if (layoutRef.current && !layoutRef.current.contains(event.target))
        layoutRef.current.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    // Close on actual focus entering another control, not on transient blur
    // while a label forwards a pointer click to its radio or checkbox.
    document.addEventListener('focusin', closeOutside);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('focusin', closeOutside);
    };
  }, []);
  const [layout, setLayout] = useState(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem('mdpv-library-layout') || '{}',
      );
      return {
        columns: ['auto', '2', '3', '4', '5', '6'].includes(stored.columns)
          ? stored.columns
          : 'auto',
        density: stored.density === 'compact' ? 'compact' : 'comfortable',
        excerpts: stored.excerpts !== false,
      };
    } catch (_) {
      return { columns: 'auto', density: 'comfortable', excerpts: true };
    }
  });
  function updateLayout(key, value) {
    const next = { ...layout, [key]: value };
    setLayout(next);
    try {
      localStorage.setItem('mdpv-library-layout', JSON.stringify(next));
    } catch (_) {
      /* optional persistence */
    }
  }
  const folderPaths = duplicateFolderPaths(files);
  const q = (query || '').trim().toLowerCase();
  const byName = scope !== 'content';
  const filtered = q
    ? files.filter((f) =>
        (byName ? f.name : cache.get(f.path) || '').toLowerCase().includes(q),
      )
    : files;
  const shown = [...filtered].sort((a, b) => {
    if (!sortOrder) return 0;
    const name = a.name.localeCompare(b.name) || a.path.localeCompare(b.path);
    if (sortOrder === 'name-desc') return -name;
    if (sortOrder === 'newest' || sortOrder === 'oldest') {
      if (a.lastModified == null) return b.lastModified == null ? name : 1;
      if (b.lastModified == null) return -1;
      return (
        (sortOrder === 'newest'
          ? b.lastModified - a.lastModified
          : a.lastModified - b.lastModified) || name
      );
    }
    return name;
  });

  const body = (f, name, snip) => (
    <button
      key={f.path}
      className={viewMode === 'list' ? 'list-row' : 'card'}
      onClick={() => onOpen(f)}
      title={f.path}
      aria-label={`Open ${f.path}`}
    >
      <span className="file-label">
        <span className="fname" dangerouslySetInnerHTML={{ __html: name }} />
        <span className="folder-path">
          {folderPaths.get(f.path) ||
            (f.path.includes('/')
              ? f.path.slice(0, f.path.lastIndexOf('/') + 1)
              : './')}
        </span>
      </span>
      {snip && (
        <span className="snippet" dangerouslySetInnerHTML={{ __html: snip }} />
      )}
      {(viewMode === 'list' || f.lastModified != null || f.size != null) && (
        <span className="file-meta">
          {f.lastModified != null ? (
            <time
              dateTime={new Date(f.lastModified).toISOString()}
              title="Last modified"
            >
              {new Date(f.lastModified).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </time>
          ) : viewMode === 'list' ? (
            <span
              className="file-date"
              aria-label="Modification date unavailable"
            >
              —
            </span>
          ) : null}
          {viewMode !== 'list' && f.lastModified != null && f.size != null && (
            <span aria-hidden="true">·</span>
          )}
          {f.size != null ? (
            <span className="file-size">
              {f.size < 1024
                ? `${f.size} B`
                : `${(f.size / 1024).toFixed(1)} KB`}
            </span>
          ) : viewMode === 'list' ? (
            <span className="file-size" aria-label="File size unavailable">
              —
            </span>
          ) : null}
        </span>
      )}
      <span className="file-tooltip" aria-hidden="true">
        {f.path}
      </span>
    </button>
  );

  return (
    <main className={`library density-${layout.density}`}>
      <div className="library-toolbar">
        <div className="library-metadata">
          <p className="result-count">
            {folderName && (
              <span className="crumb">
                <span
                  className="material-symbols-outlined crumb-ico"
                  aria-hidden="true"
                >
                  folder
                </span>
                {folderName}
              </span>
            )}
            {folderName && ' · '}
            {`${files.length} files`}
            {q ? ` · ${shown.length} matches` : ''}
          </p>
          <div className="library-status-slot" ref={onStatusMount} />
        </div>
        <div className="library-controls">
          <CustomSelect
            label="Sort files"
            icon="sort"
            value={sortOrder || 'name-asc'}
            onChange={onSortOrder || (() => {})}
            options={[
              { value: 'name-asc', label: 'Name: A–Z' },
              { value: 'name-desc', label: 'Name: Z–A' },
              { value: 'newest', label: 'Modified: newest' },
              { value: 'oldest', label: 'Modified: oldest' },
            ]}
          />
          <details
            ref={layoutRef}
            className="layout-menu"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary').focus();
              }
            }}
          >
            <summary className="library-control">
              <span className="material-symbols-outlined" aria-hidden="true">
                tune
              </span>
              Layout
            </summary>
            <div className="layout-panel">
              <span className="layout-heading">Customize your library</span>
              {[
                {
                  key: 'columns',
                  label: 'Columns',
                  options: ['auto', '2', '3', '4', '5', '6'].map((value) => ({
                    value,
                    label: value === 'auto' ? 'Auto' : value,
                  })),
                },
                {
                  key: 'density',
                  label: 'Density',
                  options: [
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ],
                },
              ].map(({ key, label, options }) => (
                <fieldset className="layout-setting" key={key}>
                  <legend>{label}</legend>
                  <div className="layout-segments">
                    {options.map(({ value, label: optionLabel }) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={`library-${key}`}
                          value={value}
                          checked={layout[key] === value}
                          onChange={() => updateLayout(key, value)}
                        />
                        <span>{optionLabel}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <label className="excerpt-toggle">
                <input
                  type="checkbox"
                  checked={layout.excerpts}
                  onChange={(event) =>
                    updateLayout('excerpts', event.target.checked)
                  }
                />
                Document excerpts
              </label>
            </div>
          </details>
          <div className="view-toggle" role="group" aria-label="File list view">
            {['grid', 'list'].map((value) => (
              <button
                key={value}
                className={viewMode === value ? 'active' : ''}
                aria-label={value === 'grid' ? 'Grid view' : 'List view'}
                aria-pressed={viewMode === value}
                onClick={() => onViewMode?.(value)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {value === 'grid' ? 'grid_view' : 'view_list'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-busy={Boolean(activity)}
        data-columns={layout.columns}
        style={{
          '--library-columns':
            layout.columns === 'auto' ? undefined : layout.columns,
        }}
        className={viewMode === 'list' ? 'list-view' : 'file-grid'}
      >
        {viewMode === 'list' && (
          <div className="list-heading" aria-hidden="true">
            <span>Document</span>
            <span>Modified</span>
            <span>Size</span>
          </div>
        )}
        {shown.map((f) => {
          const t = cache.get(f.path) || '';
          const snip =
            q && !byName
              ? highlightSnippet(findSnippet(t, q), q)
              : viewMode !== 'list' &&
                  !q &&
                  layout.excerpts &&
                  layout.density !== 'compact'
                ? excerptCache.get(f.path, t)
                : '';
          const name =
            q && f.name.toLowerCase().includes(q)
              ? highlightSnippet(f.name, q)
              : escapeHtml(f.name);
          return body(f, name, snip);
        })}
      </div>
      {!shown.length && <p className="empty-state">No markdown files found.</p>}
    </main>
  );
}
