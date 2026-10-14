// Session-only per-table controls for the markdown preview.
//
// The preview HTML is rebuilt on every edit, so widths, hidden flags, and filters live in
// component state keyed by table index + column index, and the DOM decoration
// is re-applied to the fresh DOM.
//
// State shape: { [tableIndex]: { widths, hidden, filters: { [col]: string[] } } }

export function setColumnWidth(state, tableIndex, colIndex, width) {
  const table = state[tableIndex] || {};
  return {
    ...state,
    [tableIndex]: {
      ...table,
      widths: {
        ...(table.widths || {}),
        [colIndex]: Math.max(24, Math.round(width)),
      },
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

export function setColumnFilter(
  state,
  tableIndex,
  colIndex,
  selected,
  allValues,
) {
  const table = state[tableIndex] || {};
  const filters = { ...(table.filters || {}) };
  if (allValues.every((value) => selected.includes(value))) {
    delete filters[colIndex];
  } else {
    filters[colIndex] = [...selected];
  }
  return { ...state, [tableIndex]: { ...table, filters } };
}

export function resetTableView(state, tableIndex) {
  if (!Object.hasOwn(state, tableIndex)) return state;
  const next = { ...state };
  delete next[tableIndex];
  return next;
}

export function getColumnValues(table, colIndex) {
  return Array.from(
    new Set(
      Array.from(
        table.querySelectorAll('tbody tr'),
        (row) => row.children[colIndex]?.textContent.trim() ?? '',
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

// Builds the wrap/scroll/colgroup, resize handles and hide buttons on a freshly
// rendered body. Idempotent: already-decorated tables are skipped.
export function decorateTables(
  bodyEl,
  { interactive = true, tableIndex } = {},
) {
  if (!bodyEl) return;
  Array.from(bodyEl.querySelectorAll('table')).forEach((table, t) => {
    if (table.classList.contains('mp-table')) return;
    const index = tableIndex ?? t;
    table.classList.add('mp-table');
    table.dataset.t = index;

    const colgroup = document.createElement('colgroup');
    const headers = Array.from(table.querySelectorAll('thead th'));
    headers.forEach(() => colgroup.appendChild(document.createElement('col')));
    table.insertBefore(colgroup, table.firstChild);

    headers.forEach((th, c) => {
      th.dataset.label = th.textContent.trim();
      th.classList.add('mp-th');

      if (!interactive) return;

      const handle = document.createElement('span');
      handle.className = 'mp-resize';
      handle.dataset.t = index;
      handle.dataset.c = c;
      handle.title = 'Drag to resize column';
      th.appendChild(handle);

      const hide = document.createElement('button');
      hide.type = 'button';
      hide.className = 'mp-hide';
      hide.dataset.t = index;
      hide.dataset.c = c;
      hide.title = 'Hide column';
      hide.setAttribute(
        'aria-label',
        `Hide column ${th.dataset.label || c + 1}`,
      );
      const ico = document.createElement('span');
      ico.className = 'material-symbols-outlined';
      ico.setAttribute('aria-hidden', 'true');
      // Eye-with-slash reads as "hide"; chevrons read as move/reorder.
      ico.textContent = 'visibility_off';
      hide.appendChild(ico);
      th.appendChild(hide);

      const filter = document.createElement('button');
      filter.type = 'button';
      filter.className = 'mp-filter';
      filter.dataset.t = index;
      filter.dataset.c = c;
      filter.title = 'Filter column';
      filter.setAttribute(
        'aria-label',
        `Filter column ${th.dataset.label || c + 1}`,
      );
      const filterIcon = document.createElement('span');
      filterIcon.className = 'material-symbols-outlined';
      filterIcon.setAttribute('aria-hidden', 'true');
      filterIcon.textContent = 'filter_alt';
      filter.appendChild(filterIcon);
      th.appendChild(filter);
    });

    // wrap > (scroll > table) + rail keeps the rail pinned to the right edge,
    // outside the horizontal scroll area.
    const wrap = document.createElement('div');
    wrap.className = 'mp-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    if (!interactive) {
      const toolbar = document.createElement('div');
      toolbar.className = 'mp-table-toolbar';
      const expand = document.createElement('button');
      expand.type = 'button';
      expand.className = 'mp-expand';
      expand.dataset.t = index;
      expand.setAttribute('aria-label', `Expand table ${index + 1}`);
      expand.innerHTML =
        '<span class="material-symbols-outlined" aria-hidden="true">open_in_full</span> Expand table';
      const summary = document.createElement('span');
      summary.className = 'mp-table-summary';
      toolbar.append(expand, summary);
      wrap.appendChild(toolbar);
    }
    const content = document.createElement('div');
    content.className = 'mp-table-content';
    const scroll = document.createElement('div');
    scroll.className = 'mp-table-scroll';
    scroll.appendChild(table);
    content.appendChild(scroll);
    if (interactive) {
      const rail = document.createElement('div');
      rail.className = 'mp-col-rail';
      rail.dataset.t = index;
      content.appendChild(rail);
    }
    wrap.appendChild(content);
    const empty = document.createElement('p');
    empty.className = 'mp-table-empty';
    empty.hidden = true;
    empty.textContent = 'No rows match these filters.';
    wrap.appendChild(empty);
  });
}

const RAIL_MOTION_MS = 190;
const railTimers = new WeakMap();

function clearRailTimer(slot) {
  const timer = railTimers.get(slot);
  if (timer) window.clearTimeout(timer);
  railTimers.delete(slot);
}

function settleRailSlot(slot) {
  clearRailTimer(slot);
  railTimers.set(
    slot,
    window.setTimeout(() => {
      if (!slot.isConnected || slot.dataset.leaving === 'true') return;
      slot.style.height = '';
      slot.style.marginBottom = '';
      slot.style.opacity = '';
      slot.style.transform = '';
      railTimers.delete(slot);
    }, RAIL_MOTION_MS),
  );
}

function updateRailWidth(rail) {
  const width = Math.max(
    0,
    ...Array.from(
      rail.querySelectorAll('.mp-chip'),
      (chip) => chip.offsetWidth,
    ),
  );
  rail.style.setProperty('--mp-rail-width', `${width}px`);
  rail.style.setProperty('--mp-rail-gap', width ? '6px' : '0px');
}

function syncHiddenColumnRail(rail, table, hidden) {
  const columns = Object.keys(hidden)
    .filter((column) => hidden[column])
    .map(Number)
    .sort((a, b) => a - b);
  const desired = new Set(columns);
  const animate =
    rail.dataset.ready === 'true' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === false;
  const headers = table.querySelectorAll('thead th');

  Array.from(rail.children).forEach((slot) => {
    const column = Number(slot.dataset.c);
    if (desired.has(column)) {
      if (slot.dataset.leaving === 'true') {
        clearRailTimer(slot);
        delete slot.dataset.leaving;
        slot.querySelector('.mp-chip').disabled = false;
        slot.style.height = `${slot.querySelector('.mp-chip').offsetHeight}px`;
        slot.style.marginBottom = '4px';
        slot.style.opacity = '1';
        slot.style.transform = 'translateY(0)';
        settleRailSlot(slot);
      }
      return;
    }
    if (!animate) {
      clearRailTimer(slot);
      slot.remove();
      return;
    }
    if (slot.dataset.leaving === 'true') return;
    clearRailTimer(slot);
    slot.dataset.leaving = 'true';
    if (slot.contains(document.activeElement)) {
      headers[column]?.querySelector('.mp-hide')?.focus();
    }
    slot.querySelector('.mp-chip').disabled = true;
    slot.style.height = `${slot.offsetHeight}px`;
    void slot.offsetHeight;
    slot.style.height = '0px';
    slot.style.marginBottom = '0px';
    slot.style.opacity = '0';
    slot.style.transform = 'translateY(-5px)';
    railTimers.set(
      slot,
      window.setTimeout(() => {
        if (slot.dataset.leaving !== 'true') return;
        slot.remove();
        railTimers.delete(slot);
        updateRailWidth(rail);
      }, RAIL_MOTION_MS),
    );
  });

  columns.forEach((column) => {
    if (
      Array.from(rail.children).some(
        (slot) => Number(slot.dataset.c) === column,
      )
    )
      return;
    const label = headers[column]?.dataset.label || String(column + 1);
    const slot = document.createElement('div');
    slot.className = 'mp-chip-slot';
    slot.dataset.c = column;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mp-chip';
    chip.dataset.t = table.dataset.t;
    chip.dataset.c = column;
    chip.title = 'Show column';
    chip.setAttribute('aria-label', `Show column ${label}`);
    chip.textContent = label;
    slot.appendChild(chip);
    const next = Array.from(rail.children).find(
      (sibling) => Number(sibling.dataset.c) > column,
    );
    rail.insertBefore(slot, next || null);
    if (!animate) return;
    const height = chip.offsetHeight;
    slot.style.height = '0px';
    slot.style.marginBottom = '0px';
    slot.style.opacity = '0';
    slot.style.transform = 'translateY(-5px)';
    void slot.offsetHeight;
    slot.style.height = `${height}px`;
    slot.style.marginBottom = '4px';
    slot.style.opacity = '1';
    slot.style.transform = 'translateY(0)';
    settleRailSlot(slot);
  });
  updateRailWidth(rail);
  rail.dataset.ready = 'true';
}

// Applies widths, collapsed cells and rail chips. Cheap and non-structural, so
// it can run on every state change (including mid-drag) without disturbing the
// live drag handles.
//
// ponytail: cell index is treated as column index; GFM tables have no colspan.
export function applyTableState(bodyEl, state) {
  if (!bodyEl) return;
  Array.from(bodyEl.querySelectorAll('table.mp-table')).forEach((table) => {
    const st = state[Number(table.dataset.t)] || {};
    const widths = st.widths || {};
    const hidden = st.hidden || {};
    const filters = st.filters || {};

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

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    let shown = 0;
    rows.forEach((row) => {
      const matches = Object.entries(filters).every(([col, values]) =>
        values.includes(row.children[Number(col)]?.textContent.trim() ?? ''),
      );
      row.classList.toggle('mp-row-filtered', !matches);
      if (matches) shown++;
    });

    table.querySelectorAll('.mp-filter').forEach((button) => {
      const active = Object.hasOwn(filters, button.dataset.c);
      button.classList.toggle('mp-filter-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const summary = table
      .closest('.mp-table-wrap')
      ?.querySelector('.mp-table-summary');
    if (summary) {
      const parts = [];
      if (Object.keys(filters).length)
        parts.push(`${shown} of ${rows.length} rows`);
      const hiddenCount = Object.keys(hidden).length;
      if (hiddenCount)
        parts.push(
          `${hiddenCount} column${hiddenCount === 1 ? '' : 's'} hidden`,
        );
      summary.textContent = parts.join(' · ');
    }
    const empty = table
      .closest('.mp-table-wrap')
      ?.querySelector('.mp-table-empty');
    if (empty) empty.hidden = !Object.keys(filters).length || shown > 0;

    // Once every visible column has a pixel width, pin the table to their sum
    // (an explicit width, not width:100%) so resizing one column grows the
    // table instead of squeezing its neighbours; the wrap scrolls horizontally.
    // Until then keep the base width:100% so untouched tables still fill.
    const visible = cols.map((_, c) => c).filter((c) => !hidden[c]);
    const pinned =
      visible.length > 0 && visible.every((c) => widths[c] != null);
    table.style.width = pinned
      ? visible.reduce((sum, c) => sum + widths[c], 0) + 'px'
      : '';

    const rail = table.closest('.mp-table-wrap')?.querySelector('.mp-col-rail');
    if (!rail) return;
    syncHiddenColumnRail(rail, table, hidden);
  });
}
