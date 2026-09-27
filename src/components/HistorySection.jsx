export default function HistorySection({ history, onOpen }) {
  if (!history.length) return null;
  return (
    <section className="history">
      <h2 className="history-title">Recent</h2>
      <div className="history-list">
        {history.map((h) => (
          <button key={h.name + '-' + h.kind} className="history-item" onClick={() => onOpen(h)}>
            <span className="material-symbols-outlined h-ico">{h.kind === 'directory' ? 'folder' : 'description'}</span>
            <span className="h-name">{h.name}</span>
            <span className="h-kind">{h.kind}</span>
          </button>
        ))}
      </div>
    </section>
  );
}