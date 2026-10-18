import { useEffect, useState } from 'react';

export default function ProcessingStatus({ activity }) {
  const [visibleFor, setVisibleFor] = useState(null);
  const activityId = activity?.id;

  useEffect(() => {
    if (activityId == null) return;
    const timer = setTimeout(() => setVisibleFor(activityId), 300);
    return () => clearTimeout(timer);
  }, [activityId]);

  if (!activity || visibleFor !== activity.id) return null;

  return (
    <div className="processing-status" role="status" aria-live="polite">
      <span className="processing-indicator" aria-hidden="true" />
      <span>{activity.message}</span>
      {activity.current != null && activity.total != null && (
        <span className="processing-progress">
          {activity.current}/{activity.total}
        </span>
      )}
    </div>
  );
}
