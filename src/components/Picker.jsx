import { useState } from 'react';
import HistorySection from './HistorySection';

export default function Picker({ onPickFile, onPickFolder, history, onOpenHistory, onRemoveHistory }) {
  const [showRecents, setShowRecents] = useState(false);

  return (
    <main className="picker">
      <div className="dropzone">
        <div className="dz-icon material-symbols-outlined">folder_open</div>
        <h1>View &amp; edit your markdown</h1>
        <p className="dz-sub">
          Choose a folder to browse and search all files, or open a single file.
          Everything runs locally — nothing is uploaded.
        </p>
        <div className="dz-actions">
          <button className="btn primary" onClick={onPickFolder}>
            <span className="material-symbols-outlined btn-ico">folder</span> Choose folder
          </button>
          <button className="btn secondary" onClick={onPickFile}>
            <span className="material-symbols-outlined btn-ico">note_add</span> Open single file
          </button>
          {history && history.length > 0 && (
            <button className="btn secondary" onClick={() => setShowRecents(true)}>
              <span className="material-symbols-outlined btn-ico">history</span> Recent
            </button>
          )}
        </div>
      </div>

      {showRecents && (
        <div className="drawer-backdrop" onClick={() => setShowRecents(false)} aria-hidden="true" />
      )}
      <aside className={`recents-drawer ${showRecents ? 'open' : ''}`} aria-label="Recent files and folders">
        <div className="drawer-header">
          <h2 className="drawer-title">Recent</h2>
          <button
            className="drawer-close"
            onClick={() => setShowRecents(false)}
            aria-label="Close recent list"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="drawer-content">
          <HistorySection
            history={history}
            onOpen={(h) => {
              setShowRecents(false);
              if (onOpenHistory) onOpenHistory(h);
            }}
            onRemove={onRemoveHistory}
          />
        </div>
      </aside>
    </main>
  );
}