export default function TopBar({ theme, onToggleTheme, doc, onHome, library }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {!doc && (
          <button className="brand" onClick={onHome} title="MD Prev — go home" aria-label="Go home">
            <img className="brand-icon" src="/logo.svg" alt="" aria-hidden="true" />
            <span>MD Prev</span>
          </button>
        )}
        {doc && (
          <button className="btn secondary icon-btn" onClick={doc.onBack} title="Back" aria-label="Back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {doc && <span className="file-title">{doc.title}</span>}
      </div>

      {library && (
        <div className="topbar-search">
          <span className="material-symbols-outlined search-ico">search</span>
          <input
            value={library.query}
            onChange={(e) => library.onQuery(e.target.value)}
            placeholder="Search files and content…"
            aria-label="Search files and content"
          />
        </div>
      )}

      <div className="topbar-right">
        {library && (
          <div className="view-toggle" role="group" aria-label="File list view">
            <button
              className={library.viewMode === 'grid' ? 'active' : ''}
              onClick={() => library.onViewMode('grid')}
              title="Grid view"
              aria-label="Grid view"
            ><span className="material-symbols-outlined">grid_view</span></button>
            <button
              className={library.viewMode === 'list' ? 'active' : ''}
              onClick={() => library.onViewMode('list')}
              title="List view"
              aria-label="List view"
            ><span className="material-symbols-outlined">view_list</span></button>
          </div>
        )}
        {doc && doc.mode === 'edit' && (
          <label className="font-picker" title="Editor font">
            <span className="material-symbols-outlined">text_fields</span>
            <select value={doc.font} onChange={(e) => doc.onFont(e.target.value)} aria-label="Editor font">
              {doc.fontOptions.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>
          </label>
        )}
        {doc && doc.mode === 'preview' && (
          <button
            className="btn secondary icon-btn"
            onClick={doc.onWidth}
            title={'Content width: ' + doc.widthLabel}
            aria-label={'Content width: ' + doc.widthLabel}
          >
            <span className="material-symbols-outlined">{doc.widthIcon}</span>
          </button>
        )}
        {doc && (
          <button
            className="btn secondary icon-btn"
            onClick={() => doc.onMode(doc.mode === 'edit' ? 'preview' : 'edit')}
            title={doc.mode === 'edit' ? 'Preview' : 'Edit'}
            aria-label={doc.mode === 'edit' ? 'Preview' : 'Edit'}
          >
            <span className="material-symbols-outlined">{doc.mode === 'edit' ? 'visibility' : 'edit'}</span>
          </button>
        )}
        {doc && doc.canSave && doc.mode === 'edit' && (
          <button className="btn primary icon-btn" onClick={doc.onSave} title="Save" aria-label="Save">
            <span className="material-symbols-outlined">save</span>
          </button>
        )}
        <button
          className="btn icon-btn"
          onClick={onToggleTheme}
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
      </div>
    </header>
  );
}
