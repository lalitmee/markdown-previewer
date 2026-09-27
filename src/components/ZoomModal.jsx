import { useEffect } from 'react';

export default function ZoomModal({ svgHtml, onClose }) {
  useEffect(() => {
    if (!svgHtml) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [svgHtml, onClose]);

  if (!svgHtml) return null;
  return (
    <div className="zoom-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="zoom-svg" dangerouslySetInnerHTML={{ __html: svgHtml }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}