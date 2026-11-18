import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ProcessingStatus({
  activity,
  container,
  inline = false,
}) {
  const [visibleFor, setVisibleFor] = useState(null);
  const activityId = activity?.id;

  useEffect(() => {
    if (activityId == null) return;
    const timer = setTimeout(() => setVisibleFor(activityId), 300);
    return () => clearTimeout(timer);
  }, [activityId]);

  if (
    (inline && !container) ||
    !activity ||
    (!activity.immediate && visibleFor !== activity.id)
  )
    return null;

  const status = (
    <div
      className={`processing-status${container ? ' processing-status-inline' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="processing-indicator" aria-hidden="true" />
      <span className="processing-message" title={activity.message}>
        {inline && activity.message === 'Loading Markdown'
          ? 'Indexing'
          : activity.message}
      </span>
      {activity.current != null && activity.total != null && (
        <span className="processing-progress">
          {activity.current}/{activity.total}
        </span>
      )}
    </div>
  );
  return container ? createPortal(status, container) : status;
}
