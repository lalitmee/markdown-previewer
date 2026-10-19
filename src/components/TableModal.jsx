import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  applyTableState,
  decorateTables,
  getColumnValues,
  resetTableView,
  setColumnFilter,
  setColumnWidth,
  setColumnWidths,
  toggleColumnHidden,
} from '../lib/tableColumns';
import { positionFilterMenu } from '../lib/filterMenuPosition';

export default function TableModal({
  tableHtml,
  tableIndex,
  tableState,
  setTableState,
  opener,
  onClose,
}) {
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const closeRef = useRef(null);
  const countRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const dragCleanupRef = useRef(null);
  const heightLockedRef = useRef(false);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);
  const [menu, setMenu] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuOpen = menu !== null;
  const currentView = tableState[tableIndex] || {};
  const hasCustomizations = ['filters', 'hidden', 'widths'].some(
    (key) => Object.keys(currentView[key] || {}).length > 0,
  );

  function requestClose() {
    if (closingRef.current) return;
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === false
    ) {
      closingRef.current = true;
      setIsClosing(true);
      closeTimerRef.current = window.setTimeout(onClose, 180);
      return;
    }
    onClose();
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      dragCleanupRef.current?.();
      window.clearTimeout(closeTimerRef.current);
      if (opener?.isConnected) opener.focus();
    };
  }, [opener]);

  useLayoutEffect(() => {
    decorateTables(bodyRef.current, { tableIndex });
    applyTableState(bodyRef.current, tableState);
    const rows = bodyRef.current?.querySelectorAll('tbody tr') || [];
    const query = searchQuery.toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const matches = !query || row.textContent.toLowerCase().includes(query);
      if (!matches) row.classList.add('mp-row-filtered');
      if (!row.classList.contains('mp-row-filtered')) shown++;
    });
    const hiddenCount = Object.keys(currentView.hidden || {}).length;
    if (countRef.current)
      countRef.current.textContent = `${shown} of ${rows.length} rows${
        hiddenCount
          ? ` · ${hiddenCount} column${hiddenCount === 1 ? '' : 's'} hidden`
          : ''
      }`;
    if (!heightLockedRef.current && dialogRef.current) {
      const dialog = dialogRef.current;
      const availableHeight =
        window.innerHeight - (window.innerWidth <= 600 ? 16 : 32);
      const naturalHeight = dialog.offsetHeight;
      dialog.style.height = `${Math.min(availableHeight, Math.max(360, naturalHeight))}px`;
      dialog.classList.add('table-dialog-locked');
      heightLockedRef.current = true;
    }
  }, [tableHtml, tableIndex, tableState, searchQuery, currentView.hidden]);

  useEffect(() => {
    if (menuOpen) searchRef.current?.focus();
  }, [menuOpen, menu?.colIndex]);

  useLayoutEffect(() => {
    if (!menu || menu.left !== null) return;
    const anchor = menu.anchor;
    if (!anchor.isConnected || !menuRef.current || !dialogRef.current) return;
    const position = positionFilterMenu(
      anchor.getBoundingClientRect(),
      dialogRef.current.getBoundingClientRect(),
      menuRef.current.getBoundingClientRect(),
    );
    setMenu((current) =>
      current?.anchor === anchor ? { ...current, ...position } : current,
    );
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const closeOnOutsideClick = (event) => {
      if (
        !menuRef.current?.contains(event.target) &&
        !event.target.closest('.mp-filter')
      ) {
        setMenu(null);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [menu]);

  useEffect(() => {
    if (!menuOpen) return;
    const reposition = () =>
      setMenu((current) =>
        current
          ? { ...current, left: null, top: null, maxHeight: undefined }
          : current,
      );
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [menuOpen]);

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (menu) {
        menu.anchor.focus();
        setMenu(null);
      } else requestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onPointerDown(event) {
    const handle = event.target.closest('.mp-resize');
    if (!handle) return;
    event.preventDefault();
    dragCleanupRef.current?.();
    const colIndex = Number(handle.dataset.c);
    const startX = event.clientX;
    const table = handle.closest('table');
    const freeze = {};
    table.querySelectorAll('thead th').forEach((th, index) => {
      if (th.classList.contains('mp-col-hidden')) return;
      const width = Math.round(th.getBoundingClientRect().width);
      if (width > 0) freeze[index] = width;
    });
    const startWidth =
      freeze[colIndex] ?? handle.parentElement.getBoundingClientRect().width;
    setTableState((state) => setColumnWidths(state, tableIndex, freeze));
    const scroller = handle.closest('.mp-table-scroll');
    const visibleHeaders = Array.from(
      table.querySelectorAll('thead th'),
    ).filter((th) => !th.classList.contains('mp-col-hidden'));
    const isLast = visibleHeaders.at(-1) === handle.closest('th');
    const onMove = (moveEvent) => {
      setTableState((state) =>
        setColumnWidth(
          state,
          tableIndex,
          colIndex,
          startWidth + moveEvent.clientX - startX,
        ),
      );
      requestAnimationFrame(() => {
        if (!scroller?.isConnected) return;
        if (isLast) {
          scroller.scrollLeft = scroller.scrollWidth;
          return;
        }
        const bounds = scroller.getBoundingClientRect();
        if (moveEvent.clientX > bounds.right - 28) scroller.scrollLeft += 6;
        else if (moveEvent.clientX < bounds.left + 28) scroller.scrollLeft -= 6;
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = stop;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  function onTableClick(event) {
    const toggle = event.target.closest('.mp-hide, .mp-chip');
    if (toggle) {
      setTableState((state) =>
        toggleColumnHidden(state, tableIndex, Number(toggle.dataset.c)),
      );
      return;
    }
    const filter = event.target.closest('.mp-filter');
    if (!filter) return;
    const colIndex = Number(filter.dataset.c);
    const options = getColumnValues(filter.closest('table'), colIndex);
    const existing = tableState[tableIndex]?.filters?.[colIndex];
    setMenu({
      colIndex,
      label: filter.closest('th').dataset.label || `Column ${colIndex + 1}`,
      options,
      selected: new Set(existing ?? options),
      query: '',
      left: null,
      top: null,
      width: Math.min(300, dialogRef.current.clientWidth - 32),
      anchor: filter,
    });
  }

  function updateSelected(value) {
    setMenu((current) => {
      const selected = new Set(current.selected);
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      return { ...current, selected };
    });
  }

  function applyFilter() {
    setTableState((state) =>
      setColumnFilter(
        state,
        tableIndex,
        menu.colIndex,
        [...menu.selected],
        menu.options,
      ),
    );
    menu.anchor.focus();
    setMenu(null);
  }

  function clearFilter() {
    setTableState((state) =>
      setColumnFilter(
        state,
        tableIndex,
        menu.colIndex,
        menu.options,
        menu.options,
      ),
    );
    menu.anchor.focus();
    setMenu(null);
  }

  function resetTable() {
    dragCleanupRef.current?.();
    setMenu(null);
    setSearchQuery('');
    setTableState((state) => resetTableView(state, tableIndex));
    const scroller = bodyRef.current?.querySelector('.mp-table-scroll');
    if (scroller) {
      scroller.scrollTop = 0;
      scroller.scrollLeft = 0;
    }
  }

  const visibleOptions = menu?.options.filter((value) =>
    value.toLocaleLowerCase().includes(menu.query.toLocaleLowerCase()),
  );

  return (
    <div
      className={`table-overlay${isClosing ? ' is-closing' : ''}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
      onKeyDown={onKeyDown}
    >
      <section
        className="table-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-dialog-title"
      >
        <header className="table-dialog-header">
          <div>
            <h2 id="table-dialog-title">Table {tableIndex + 1}</h2>
            <p>Filter rows, resize columns, or hide columns.</p>
          </div>
          <div className="table-dialog-actions">
            <span
              className="table-dialog-count"
              ref={countRef}
              aria-live="polite"
            />
            <div className="mp-filter-search table-dialog-search">
              <span className="material-symbols-outlined" aria-hidden="true">
                search
              </span>
              <input
                type="search"
                placeholder="Search table"
                aria-label="Search all table cells"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            {hasCustomizations && (
              <button
                className="table-dialog-reset"
                type="button"
                onClick={resetTable}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  restart_alt
                </span>
                Reset table
              </button>
            )}
            <button
              className="table-dialog-close"
              type="button"
              ref={closeRef}
              onClick={requestClose}
              aria-label="Close expanded table"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </header>
        <div
          className="md-body table-dialog-body"
          ref={bodyRef}
          dangerouslySetInnerHTML={{ __html: tableHtml }}
          onClick={onTableClick}
          onPointerDown={onPointerDown}
          onScrollCapture={() => setMenu(null)}
        />
        {menu && (
          <div
            className="mp-filter-menu"
            ref={menuRef}
            style={{
              left: menu.left ?? 0,
              top: menu.top ?? 0,
              width: menu.width,
              maxHeight: menu.maxHeight,
              visibility: menu.left === null ? 'hidden' : 'visible',
            }}
            role="group"
            aria-label={`Filter ${menu.label}`}
          >
            <div className="mp-filter-menu-heading">
              <div className="mp-filter-menu-title">{menu.label}</div>
              <span className="mp-filter-menu-count">
                {menu.selected.size} of {menu.options.length} selected
              </span>
            </div>
            <div className="mp-filter-search">
              <span className="material-symbols-outlined" aria-hidden="true">
                search
              </span>
              <input
                ref={searchRef}
                type="search"
                placeholder="Search values"
                aria-label={`Search values in ${menu.label}`}
                value={menu.query}
                onChange={(event) =>
                  setMenu((current) => ({
                    ...current,
                    query: event.target.value,
                    left: null,
                    top: null,
                  }))
                }
              />
            </div>
            <div className="mp-filter-menu-actions">
              <button
                type="button"
                onClick={() =>
                  setMenu((current) => ({
                    ...current,
                    selected:
                      current.selected.size === current.options.length
                        ? new Set()
                        : new Set(current.options),
                  }))
                }
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {menu.selected.size === menu.options.length
                    ? 'check_box_outline_blank'
                    : 'check_box'}
                </span>
                {menu.selected.size === menu.options.length
                  ? 'Select none'
                  : 'Select all'}
              </button>
            </div>
            <div className="mp-filter-values">
              {visibleOptions?.length ? (
                visibleOptions.map((value) => (
                  <label
                    key={value}
                    className={menu.selected.has(value) ? 'is-selected' : ''}
                  >
                    <input
                      type="checkbox"
                      checked={menu.selected.has(value)}
                      onChange={() => updateSelected(value)}
                    />
                    <span>{value || '(Blanks)'}</span>
                  </label>
                ))
              ) : (
                <p>No values found</p>
              )}
            </div>
            <div className="mp-filter-menu-footer">
              <button type="button" onClick={clearFilter}>
                Clear filter
              </button>
              <button type="button" onClick={applyFilter}>
                Apply
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
