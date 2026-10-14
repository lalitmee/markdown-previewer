import { useState } from 'react';

export default function Picker({
  onPickFile,
  onPickFolder,
  onPaste,
  onDropEntry,
  onDropError,
}) {
  const [dragging, setDragging] = useState(false);

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    const items = Array.from(event.dataTransfer?.items || []).filter(
      (item) => item.kind === 'file',
    );
    const files = Array.from(event.dataTransfer?.files || []);
    if (items.length > 1 || files.length > 1) {
      onDropError('Drop one Markdown file or folder at a time.');
      return;
    }
    const item = items[0];
    const handlePromise = item?.getAsFileSystemHandle?.();
    const fallbackFile = item?.getAsFile?.() || files[0] || null;
    onDropEntry(handlePromise, fallbackFile);
  }

  return (
    <main className="picker">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setDragging(false);
        }}
        onDrop={onDrop}
      >
        <div className="dz-icon material-symbols-outlined">folder_open</div>
        <h1>View &amp; edit your markdown</h1>
        <p className="dz-sub">
          Paste Markdown, drop a Markdown file or folder, or choose one below.
          Everything runs locally — nothing is uploaded.
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
