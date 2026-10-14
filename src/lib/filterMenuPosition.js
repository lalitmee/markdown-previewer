const INSET = 16;
const GAP = 6;

export function positionFilterMenu(anchor, container, menu) {
  const width = Math.min(menu.width, container.width - INSET * 2);
  const leftAligned = anchor.left - container.left;
  const rightAligned = anchor.right - container.left - width;
  const left = Math.max(
    INSET,
    Math.min(
      leftAligned + width <= container.width - INSET
        ? leftAligned
        : rightAligned,
      container.width - width - INSET,
    ),
  );

  const below = container.bottom - INSET - anchor.bottom - GAP;
  const above = anchor.top - container.top - INSET - GAP;
  const opensBelow = menu.height <= below || below >= above;
  const maxHeight = Math.max(0, opensBelow ? below : above);
  const height = Math.min(menu.height, maxHeight);
  const top = opensBelow
    ? anchor.bottom - container.top + GAP
    : anchor.top - container.top - GAP - height;

  return { left, top, width, maxHeight };
}
