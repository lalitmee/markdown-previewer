// Session-only per-table column controls for the markdown preview.
//
// The preview HTML is rebuilt on every edit, so widths/hidden flags live in
// component state keyed by table index + column index, and the DOM decoration
// (handles, colgroup, right-edge rail) is re-applied to the fresh DOM.
//
// State shape: { [tableIndex]: { widths: { [col]: px }, hidden: { [col]: true } } }

export function setColumnWidth(state, tableIndex, colIndex, width) {
  const table = state[tableIndex] || {};
  return {
    ...state,
    [tableIndex]: {
      ...table,
      widths: { ...(table.widths || {}), [colIndex]: Math.max(24, Math.round(width)) },
    },
  };
}

// Merges pixel widths for several columns at once. Used to freeze every visible
// column at its current rendered width when a drag starts, so resizing one
// column cannot reflow the others.
export function setColumnWidths(state, tableIndex, widthsByCol) {
  const table = state[tableIndex] || {};
  return {
    ...state,
    [tableIndex]: {
      ...table,
      widths: { ...(table.widths || {}), ...widthsByCol },
    },
  };
}

export function toggleColumnHidden(state, tableIndex, colIndex) {
  const table = state[tableIndex] || {};
  const hidden = { ...(table.hidden || {}) };
  if (hidden[colIndex]) delete hidden[colIndex];
  else hidden[colIndex] = true;
  return { ...state, [tableIndex]: { ...table, hidden } };
}

// Builds the wrap/scroll/colgroup, resize handles and hide buttons on a freshly
// rendered body. Idempotent: already-decorated tables are skipped.
export function decorateTables(bodyEl) {
  if (!bodyEl) return;
  Array.from(bodyEl.querySelectorAll('table')).forEach((table, t) => {
    if (table.classList.contains('mp-table')) return;
    table.classList.add('mp-table');
    table.dataset.t = t;

    const colgroup = document.createElement('colgroup');
    const headers = Array.from(table.querySelectorAll('thead th'));
    headers.forEach(() => colgroup.appendChild(document.createElement('col')));
    table.insertBefore(colgroup, table.firstChild);

    headers.forEach((th, c) => {
      th.dataset.label = th.textContent.trim();
      th.classList.add('mp-th');

      const handle = document.createElement('span');
      handle.className = 'mp-resize';
      handle.dataset.t = t;
      handle.dataset.c = c;
      handle.title = 'Drag to resize column';
      th.appendChild(handle);

      const hide = document.createElement('button');
      hide.type = 'button';
      hide.className = 'mp-hide';
      hide.dataset.t = t;
      hide.dataset.c = c;
      hide.title = 'Hide column';
      hide.setAttribute('aria-label', `Hide column ${th.dataset.label || c + 1}`);
      const ico = document.createElement('span');
      ico.className = 'material-symbols-outlined';
      ico.setAttribute('aria-hidden', 'true');
      // Eye-with-slash reads as "hide"; chevrons read as move/reorder.
      ico.textContent = 'visibility_off';
      hide.appendChild(ico);
      th.appendChild(hide);
    });

    // wrap > (scroll > table) + rail keeps the rail pinned to the right edge,
    // outside the horizontal scroll area.
    const wrap = document.createElement('div');
    wrap.className = 'mp-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    const scroll = document.createElement('div');
    scroll.className = 'mp-table-scroll';
    scroll.appendChild(table);
    wrap.appendChild(scroll);
    const rail = document.createElement('div');
    rail.className = 'mp-col-rail';
    rail.dataset.t = t;
    wrap.appendChild(rail);
  });
}

// Applies widths, collapsed cells and rail chips. Cheap and non-structural, so
// it can run on every state change (including mid-drag) without disturbing the
// live drag handles.
//
// ponytail: cell index is treated as column index; GFM tables have no colspan.
export function applyTableState(bodyEl, state) {
  if (!bodyEl) return;
  Array.from(bodyEl.querySelectorAll('table.mp-table')).forEach((table, t) => {
    const st = state[t] || {};
    const widths = st.widths || {};
    const hidden = st.hidden || {};

    const cols = Array.from(table.querySelectorAll('colgroup col'));
    cols.forEach((col, c) => {
      col.style.display = hidden[c] ? 'none' : '';
      col.style.width = widths[c] != null ? widths[c] + 'px' : '';
    });

    table.querySelectorAll('tr').forEach((row) => {
      Array.from(row.children).forEach((cell, c) => {
        cell.classList.toggle('mp-col-hidden', !!hidden[c]);
      });
    });

    // Once every visible column has a pixel width, pin the table to their sum
    // (an explicit width, not width:100%) so resizing one column grows the
    // table instead of squeezing its neighbours; the wrap scrolls horizontally.
    // Until then keep the base width:100% so untouched tables still fill.
    const visible = cols.map((_, c) => c).filter((c) => !hidden[c]);
    const pinned = visible.length > 0 && visible.every((c) => widths[c] != null);
    table.style.width = pinned
      ? visible.reduce((sum, c) => sum + widths[c], 0) + 'px'
      : '';

    const rail = table.closest('.mp-table-wrap')?.querySelector('.mp-col-rail');
    if (!rail) return;
    rail.innerHTML = '';
    const headers = table.querySelectorAll('thead th');
    Object.keys(hidden).map(Number).sort((a, b) => a - b).forEach((c) => {
      const label = headers[c] ? headers[c].dataset.label : '';
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mp-chip';
      chip.dataset.t = t;
      chip.dataset.c = c;
      chip.title = 'Show column';
      chip.setAttribute('aria-label', `Show column ${label || c + 1}`);
      chip.textContent = label || String(c + 1);
      rail.appendChild(chip);
    });
  });
}
