import { describe, it, expect, vi } from 'vitest';
import {
  applyTableState,
  decorateTables,
  getColumnValues,
  resetTableView,
  setColumnFilter,
  setColumnWidth,
  setColumnWidths,
  toggleColumnHidden,
} from '../tableColumns';

const TABLE =
  '<div class="md-body"><table><thead><tr><th>Name</th><th>Qty</th><th>Notes</th></tr></thead>' +
  '<tbody><tr><td>a</td><td>1</td><td>x</td></tr></tbody></table></div>';

function body() {
  const el = document.createElement('div');
  el.innerHTML = TABLE;
  return el.querySelector('.md-body');
}

describe('table column controls', () => {
  it('adds a resize handle, hide button, colgroup and rail per table', () => {
    const b = body();
    decorateTables(b);
    expect(b.querySelectorAll('.mp-resize').length).toBe(3);
    expect(b.querySelectorAll('.mp-hide').length).toBe(3);
    // Guard against an ambiguous icon: must read as "hide".
    expect(
      b.querySelector('.mp-hide .material-symbols-outlined').textContent,
    ).toBe('visibility_off');
    expect(b.querySelectorAll('colgroup col').length).toBe(3);
    expect(b.querySelector('.mp-table-wrap')).not.toBeNull();
    expect(b.querySelector('.mp-col-rail')).not.toBeNull();
  });

  it('collapses a hidden column and offers a rail chip to restore it', () => {
    const b = body();
    decorateTables(b);
    const state = toggleColumnHidden({}, 0, 1);
    applyTableState(b, state);

    expect(
      b.querySelectorAll('thead th')[1].classList.contains('mp-col-hidden'),
    ).toBe(true);
    expect(
      b.querySelectorAll('tbody td')[1].classList.contains('mp-col-hidden'),
    ).toBe(true);
    const chip = b.querySelector('.mp-col-rail .mp-chip');
    expect(chip).not.toBeNull();
    expect(chip.textContent).toBe('Qty');

    applyTableState(b, toggleColumnHidden(state, 0, 1));
    expect(
      b.querySelectorAll('thead th')[1].classList.contains('mp-col-hidden'),
    ).toBe(false);
    expect(b.querySelector('.mp-col-rail .mp-chip')).toBeNull();
  });

  it('keeps hidden chips in column order without rebuilding existing chips', () => {
    const b = body();
    decorateTables(b);
    let state = toggleColumnHidden({}, 0, 2);
    state = toggleColumnHidden(state, 0, 0);
    applyTableState(b, state);
    const chips = () => Array.from(b.querySelectorAll('.mp-col-rail .mp-chip'));
    expect(chips().map((chip) => chip.textContent)).toEqual(['Name', 'Notes']);
    const nameChip = chips()[0];
    const notesChip = chips()[1];

    state = toggleColumnHidden(state, 0, 1);
    applyTableState(b, state);
    expect(chips().map((chip) => chip.textContent)).toEqual([
      'Name',
      'Qty',
      'Notes',
    ]);
    expect(chips()[0]).toBe(nameChip);
    expect(chips()[2]).toBe(notesChip);

    state = toggleColumnHidden(state, 0, 1);
    applyTableState(b, state);
    expect(chips().map((chip) => chip.textContent)).toEqual(['Name', 'Notes']);
    expect(chips()[0]).toBe(nameChip);
    expect(chips()[1]).toBe(notesChip);
  });

  it('keeps a chip when hiding is reversed before its exit finishes', () => {
    const previousMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: false }));
    vi.useFakeTimers();
    try {
      const b = body();
      decorateTables(b);
      applyTableState(b, {});
      let state = toggleColumnHidden({}, 0, 1);
      applyTableState(b, state);
      const chip = b.querySelector('.mp-chip');

      state = toggleColumnHidden(state, 0, 1);
      applyTableState(b, state);
      expect(chip.closest('.mp-chip-slot').dataset.leaving).toBe('true');
      expect(chip.disabled).toBe(true);

      state = toggleColumnHidden(state, 0, 1);
      applyTableState(b, state);
      vi.advanceTimersByTime(200);
      expect(b.querySelector('.mp-chip')).toBe(chip);
      expect(chip.disabled).toBe(false);
    } finally {
      vi.useRealTimers();
      window.matchMedia = previousMatchMedia;
    }
  });

  it('applies a dragged width to the matching column only', () => {
    const b = body();
    decorateTables(b);
    applyTableState(b, setColumnWidth({}, 0, 2, 220));
    const cols = b.querySelectorAll('colgroup col');
    expect(cols[2].style.width).toBe('220px');
    expect(cols[0].style.width).toBe('');
  });

  it('pins the table to the sum of frozen widths so neighbours keep their size', () => {
    const b = body();
    decorateTables(b);
    // Drag start freezes every visible column, then one column is widened.
    let state = setColumnWidths({}, 0, { 0: 200, 1: 200, 2: 200 });
    state = setColumnWidth(state, 0, 2, 260);
    applyTableState(b, state);

    const cols = b.querySelectorAll('colgroup col');
    expect(cols[0].style.width).toBe('200px');
    expect(cols[1].style.width).toBe('200px');
    expect(cols[2].style.width).toBe('260px');
    expect(b.querySelector('table').style.width).toBe('660px');
  });

  it('leaves the table unpinned until every visible column has a width', () => {
    const b = body();
    decorateTables(b);
    applyTableState(b, setColumnWidth({}, 0, 2, 220));
    expect(b.querySelector('table').style.width).toBe('');
  });

  it('excludes hidden columns from the pinned table width', () => {
    const b = body();
    decorateTables(b);
    let state = setColumnWidths({}, 0, { 0: 200, 1: 200, 2: 200 });
    state = toggleColumnHidden(state, 0, 1);
    applyTableState(b, state);
    expect(b.querySelector('table').style.width).toBe('400px');
    // The hidden track (col element) is dropped so it cannot hold the table open.
    expect(b.querySelectorAll('colgroup col')[1].style.display).toBe('none');
  });

  it('puts only the expand control in the document table', () => {
    const b = body();
    decorateTables(b, { interactive: false });
    expect(b.querySelector('.mp-expand')).not.toBeNull();
    expect(b.querySelector('.mp-filter')).toBeNull();
    expect(b.querySelector('.mp-hide')).toBeNull();
    expect(b.querySelector('.mp-resize')).toBeNull();
  });

  it('combines column filters and includes blank values', () => {
    const b = body();
    const table = b.querySelector('table');
    table.querySelector('tbody').innerHTML =
      '<tr><td>A</td><td>1</td><td>x</td></tr>' +
      '<tr><td>B</td><td>1</td><td></td></tr>' +
      '<tr><td>A</td><td>2</td><td></td></tr>';
    decorateTables(b, { interactive: false });
    expect(getColumnValues(table, 2)).toEqual(['', 'x']);

    let state = setColumnFilter({}, 0, 0, ['A'], ['A', 'B']);
    state = setColumnFilter(state, 0, 1, ['2'], ['1', '2']);
    applyTableState(b, state);
    expect(
      Array.from(table.querySelectorAll('tbody tr'), (row) =>
        row.classList.contains('mp-row-filtered'),
      ),
    ).toEqual([true, true, false]);
    expect(b.querySelector('.mp-table-summary').textContent).toBe(
      '1 of 3 rows',
    );

    state = setColumnFilter(state, 0, 0, ['A', 'B'], ['A', 'B']);
    state = setColumnFilter(state, 0, 1, ['1', '2'], ['1', '2']);
    applyTableState(b, state);
    expect(table.querySelector('.mp-row-filtered')).toBeNull();

    state = setColumnFilter(state, 0, 0, [], ['A', 'B']);
    applyTableState(b, state);
    expect(b.querySelector('.mp-table-empty').hidden).toBe(false);
  });

  it('resets one table without changing another table view', () => {
    const b = body();
    decorateTables(b);
    let state = setColumnWidths({}, 0, { 0: 180, 1: 210, 2: 240 });
    state = toggleColumnHidden(state, 0, 1);
    state = setColumnFilter(state, 0, 0, [], ['a']);
    state = setColumnWidth(state, 1, 0, 300);

    const reset = resetTableView(state, 0);
    expect(reset[0]).toBeUndefined();
    expect(reset[1]).toEqual(state[1]);
    applyTableState(b, reset);
    expect(b.querySelector('.mp-row-filtered')).toBeNull();
    expect(b.querySelector('.mp-col-hidden')).toBeNull();
    expect(b.querySelector('.mp-col-rail .mp-chip')).toBeNull();
    expect(b.querySelector('colgroup col').style.width).toBe('');
    expect(b.querySelector('table').style.width).toBe('');
  });
});
