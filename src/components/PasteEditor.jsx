export default function PasteEditor({ draft, onDraftChange, onPreview }) {
  return (
    <main className="picker">
      <div className="dropzone dropzone-paste">
        <div className="dz-icon material-symbols-outlined">markdown</div>
        <h1>Paste Markdown</h1>
        <p className="dz-sub">
          Edit your Markdown below, then open the preview in your browser.
        </p>
        <form
          className="paste-form"
          onSubmit={(event) => {
            event.preventDefault();
            onPreview();
          }}
        >
          <label htmlFor="pasted-markdown">Markdown content</label>
          <textarea
            id="pasted-markdown"
            autoFocus
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="# Your heading\n\nPaste your Markdown here…"
            spellCheck={false}
          />
          <div className="paste-footer">
            <span>Available until you reload or close this tab.</span>
            <button className="btn primary" disabled={!draft.trim()}>
              <span className="material-symbols-outlined btn-ico">
                visibility
              </span>{' '}
              Preview
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
