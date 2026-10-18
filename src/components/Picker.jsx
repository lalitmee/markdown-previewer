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
        <img
          className="picker-logo"
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt=""
        />
        <h1>View &amp; edit your markdown</h1>
        <p className="dz-sub">
          Paste Markdown, drop a Markdown file or folder, or choose one below.
          Everything runs locally — nothing is uploaded.
        </p>
        <div className="dz-actions">
          <button className="btn primary" onClick={onPaste}>
            <span
              className="material-symbols-outlined picker-icon btn-ico"
              aria-hidden="true"
            >
              content_paste
            </span>
            Paste Markdown
          </button>
          <button className="btn secondary" onClick={onPickFolder}>
            <span
              className="material-symbols-outlined picker-icon btn-ico"
              aria-hidden="true"
            >
              folder
            </span>
            Choose folder
          </button>
          <button className="btn secondary" onClick={onPickFile}>
            <span
              className="material-symbols-outlined picker-icon btn-ico"
              aria-hidden="true"
            >
              description
            </span>
            Open single file
          </button>
        </div>
      </div>
    </main>
  );
}
