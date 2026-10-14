import { useRef, useState } from 'react';

export default function Picker({
  onPickFile,
  onPickFolder,
  pastedDraft,
  onPastedDraftChange,
  onPreviewPastedMarkdown,
}) {
  const [showPaste, setShowPaste] = useState(Boolean(pastedDraft));
  const textareaRef = useRef(null);

  function openPaste() {
    setShowPaste(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <main className="picker">
      <div className={`dropzone ${showPaste ? 'dropzone-paste' : ''}`}>
        <div className="dz-icon material-symbols-outlined">
          {showPaste ? 'markdown' : 'folder_open'}
        </div>
        <h1>View &amp; edit your markdown</h1>
        <p className="dz-sub">
          {showPaste
            ? 'Paste Markdown below, then open the preview in your browser.'
            : 'Paste Markdown, choose a folder, or open a single file. Everything runs locally — nothing is uploaded.'}
        </p>
        {showPaste && (
          <form
            className="paste-form"
            onSubmit={(event) => {
              event.preventDefault();
              onPreviewPastedMarkdown();
            }}
          >
            <label htmlFor="pasted-markdown">Markdown content</label>
            <textarea
              id="pasted-markdown"
              ref={textareaRef}
              value={pastedDraft}
              onChange={(event) => onPastedDraftChange(event.target.value)}
              placeholder="# Your heading\n\nPaste your Markdown here…"
              spellCheck={false}
            />
            <div className="paste-footer">
              <span>Available until you reload or close this tab.</span>
              <button className="btn primary" disabled={!pastedDraft.trim()}>
                <span className="material-symbols-outlined btn-ico">
                  visibility
                </span>{' '}
                Preview Markdown
              </button>
            </div>
          </form>
        )}
        <div className="dz-actions">
          {!showPaste && (
            <button className="btn primary" onClick={openPaste}>
              <span className="material-symbols-outlined btn-ico">
                content_paste
              </span>{' '}
              Paste Markdown
            </button>
          )}
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
