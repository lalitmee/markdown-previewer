import { describe, it, expect } from 'vitest';
import {
  applyTableState,
  decorateTables,
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
    expect(b.querySelector('.mp-hide .material-symbols-outlined').textContent).toBe('visibility_off');
    expect(b.querySelectorAll('colgroup col').length).toBe(3);
    expect(b.querySelector('.mp-table-wrap')).not.toBeNull();
    expect(b.querySelector('.mp-col-rail')).not.toBeNull();
  });

  it('collapses a hidden column and offers a rail chip to restore it', () => {
    const b = body();
    decorateTables(b);
    const state = toggleColumnHidden({}, 0, 1);
    applyTableState(b, state);

    expect(b.querySelectorAll('thead th')[1].classList.contains('mp-col-hidden')).toBe(true);
    expect(b.querySelectorAll('tbody td')[1].classList.contains('mp-col-hidden')).toBe(true);
    const chip = b.querySelector('.mp-col-rail .mp-chip');
    expect(chip).not.toBeNull();
    expect(chip.textContent).toBe('Qty');

    applyTableState(b, toggleColumnHidden(state, 0, 1));
    expect(b.querySelectorAll('thead th')[1].classList.contains('mp-col-hidden')).toBe(false);
    expect(b.querySelector('.mp-col-rail .mp-chip')).toBeNull();
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
});
