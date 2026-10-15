import { useState } from 'react';

function PickerIcon({ kind, className = '' }) {
  const paths = {
    folder: <path d="M3 6h6l2 2h10v11H3z" />,
    paste: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M9 5V3h6v2M8 10h8M8 14h8" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l4 4v14H6zM14 3v4h4M12 11v7M8.5 14.5h7" />
      </>
    ),
  };
  return (
    <svg
      className={`picker-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[kind]}
    </svg>
  );
}

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
        <PickerIcon kind="folder" className="dz-icon" />
        <h1>View &amp; edit your markdown</h1>
        <p className="dz-sub">
          Paste Markdown, drop a Markdown file or folder, or choose one below.
          Everything runs locally — nothing is uploaded.
        </p>
        <div className="dz-actions">
          <button className="btn primary" onClick={onPaste}>
            <PickerIcon kind="paste" className="btn-ico" />
            Paste Markdown
          </button>
          <button className="btn secondary" onClick={onPickFolder}>
            <PickerIcon kind="folder" className="btn-ico" />
            Choose folder
          </button>
          <button className="btn secondary" onClick={onPickFile}>
            <PickerIcon kind="file" className="btn-ico" />
            Open single file
          </button>
        </div>
      </div>
    </main>
  );
}
