export default function HistorySection({ history, onOpen, onRemove }) {
  if (!history.length) return null;
  return (
    <section className="history">
      <h2 className="history-title">Recent</h2>
      <div className="history-list">
        {history.map((h) => (
          <div key={h.name + '-' + h.kind} className="history-item">
            <button className="history-open" onClick={() => onOpen(h)}>
              <span className="material-symbols-outlined h-ico">{h.kind === 'directory' ? 'folder' : 'description'}</span>
              <span className="h-name">{h.name}</span>
              {h.location ? <span className="h-loc" title={h.location}>{h.location}</span> : <span className="h-kind">{h.kind}</span>}
            </button>
            <button
              className="history-remove"
              onClick={() => onRemove(h)}
              title={'Remove ' + h.name + ' from recent'}
              aria-label={'Remove ' + h.name + ' from recent'}
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
