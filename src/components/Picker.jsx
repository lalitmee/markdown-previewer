export default function Picker({ onPickFile, onPickFolder, onPaste }) {
  return (
    <main className="picker">
      <div className="dropzone">
        <div className="dz-icon material-symbols-outlined">folder_open</div>
        <h1>View &amp; edit your markdown</h1>
        <p className="dz-sub">
          Paste Markdown, choose a folder, or open a single file. Everything
          runs locally — nothing is uploaded.
        </p>
        <div className="dz-actions">
          <button className="btn primary" onClick={onPaste}>
            <span className="material-symbols-outlined btn-ico">
              content_paste
            </span>{' '}
            Paste Markdown
          </button>
          <button className="btn secondary" onClick={onPickFolder}>
            <span className="material-symbols-outlined btn-ico">folder</span>{' '}
            Choose folder
          </button>
          <button className="btn secondary" onClick={onPickFile}>
            <span className="material-symbols-outlined btn-ico">note_add</span>{' '}
            Open single file
          </button>
        </div>
      </div>
    </main>
  );
}
