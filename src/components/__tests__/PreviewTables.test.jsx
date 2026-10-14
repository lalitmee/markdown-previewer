import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Preview from '../Preview';

vi.mock('../../lib/fs-access', () => ({
  inlineImages: async (html) => html,
}));

const markdown =
  '| Name | Status |\n| --- | --- |\n| Alpha | Open |\n| Beta | Closed |';
let host;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function PreviewHarness({ entry }) {
  const [tableState, setTableState] = useState({});
  return createElement(Preview, {
    entry,
    text: markdown,
    setText: vi.fn(),
    tableState,
    setTableState,
    theme: 'light',
    folderHandle: null,
    mode: 'preview',
    editorFont: 'monospace',
    widthVar: '860px',
  });
}

function preview(entry) {
  return createElement(PreviewHarness, { entry, key: entry.path });
}

describe('expanded table', () => {
  it('toggles all filter values with one button', async () => {
    await act(async () => root.render(preview({ path: 'one.md', handle: {} })));
    await act(async () => host.querySelector('.mp-expand').click());
    await act(async () =>
      host.querySelector('[aria-label="Filter column Name"]').click(),
    );

    const toggle = host.querySelector('.mp-filter-menu-actions button');
    expect(
      host.querySelectorAll('.mp-filter-menu-actions button'),
    ).toHaveLength(1);
    expect(toggle.textContent).toContain('Select none');
    await act(async () => toggle.click());
    expect(toggle.textContent).toContain('Select all');
    expect(
      host.querySelectorAll('.mp-filter-values input:checked'),
    ).toHaveLength(0);
    await act(async () => toggle.click());
    expect(toggle.textContent).toContain('Select none');
    expect(
      host.querySelectorAll('.mp-filter-values input:checked'),
    ).toHaveLength(2);
  });

  it('plays the closing state before removing the dialog when motion is allowed', async () => {
    const previousMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: false }));
    vi.useFakeTimers();
    try {
      await act(async () =>
        root.render(preview({ path: 'one.md', handle: {} })),
      );
      await act(async () => host.querySelector('.mp-expand').click());
      await act(async () => host.querySelector('.table-dialog-close').click());
      expect(host.querySelector('.table-overlay.is-closing')).not.toBeNull();
      await act(async () => vi.advanceTimersByTime(180));
      expect(host.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      vi.useRealTimers();
      window.matchMedia = previousMatchMedia;
    }
  });

  it('resets filters and hidden columns while keeping the dialog open', async () => {
    await act(async () => root.render(preview({ path: 'one.md', handle: {} })));
    await act(async () => host.querySelector('.mp-expand').click());
    expect(host.querySelector('.table-dialog-reset')).toBeNull();
    await act(async () =>
      host.querySelector('[aria-label="Filter column Name"]').click(),
    );
    const beta = Array.from(
      host.querySelectorAll('.mp-filter-values label'),
    ).find((label) => label.textContent === 'Beta');
    await act(async () => beta.querySelector('input').click());
    await act(async () =>
      host.querySelector('.mp-filter-menu-footer button:last-child').click(),
    );
    expect(host.querySelector('.table-dialog-reset')).not.toBeNull();
    await act(async () =>
      host.querySelector('[aria-label="Hide column Status"]').click(),
    );

    await act(async () => host.querySelector('.table-dialog-reset').click());
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('.table-dialog-count').textContent).toBe(
      '2 of 2 rows',
    );
    expect(host.querySelector('.mp-row-filtered')).toBeNull();
    expect(host.querySelector('.mp-col-hidden')).toBeNull();
    expect(host.querySelector('.mp-table-summary').textContent).toBe('');
    expect(host.querySelector('.table-dialog-reset')).toBeNull();
  });

  it('filters in the dialog, reflects the result in the document, and clears on file change', async () => {
    await act(async () => root.render(preview({ path: 'one.md', handle: {} })));
    expect(host.querySelector('.preview-document .mp-filter')).toBeNull();

    await act(async () => host.querySelector('.mp-expand').click());
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () =>
      host.querySelector('[aria-label="Filter column Name"]').click(),
    );
    const beta = Array.from(
      host.querySelectorAll('.mp-filter-values label'),
    ).find((label) => label.textContent === 'Beta');
    await act(async () => beta.querySelector('input').click());
    await act(async () =>
      host.querySelector('.mp-filter-menu-footer button:last-child').click(),
    );

    const documentRows = host.querySelectorAll('.preview-document tbody tr');
    expect(documentRows[0].classList.contains('mp-row-filtered')).toBe(false);
    expect(documentRows[1].classList.contains('mp-row-filtered')).toBe(true);
    expect(host.querySelector('.table-dialog-count').textContent).toBe(
      '1 of 2 rows',
    );
    await act(async () => host.querySelector('.table-dialog-close').click());
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('.mp-table-summary').textContent).toBe(
      '1 of 2 rows',
    );

    await act(async () => host.querySelector('.mp-expand').click());
    expect(host.querySelector('.table-dialog-count').textContent).toBe(
      '1 of 2 rows',
    );
    await act(async () =>
      host.querySelector('[aria-label="Hide column Status"]').click(),
    );
    expect(
      host
        .querySelectorAll('.preview-document thead th')[1]
        .classList.contains('mp-col-hidden'),
    ).toBe(true);
    await act(async () => host.querySelector('.table-dialog-close').click());
    expect(host.querySelector('.mp-table-summary').textContent).toBe(
      '1 of 2 rows · 1 column hidden',
    );

    await act(async () => root.render(preview({ path: 'two.md', handle: {} })));
    expect(host.querySelector('.mp-row-filtered')).toBeNull();
    expect(host.querySelector('.mp-col-hidden')).toBeNull();
    expect(host.querySelector('.mp-table-summary').textContent).toBe('');
  });
});
