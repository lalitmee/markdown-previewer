export default function Picker({ onPickFile, onPickFolder, notices }) {
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
        </div>
        {notices && <div className="notices">{notices}</div>}
      </div>
    </main>
  );
}