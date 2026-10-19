import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBar from '../TopBar';

function renderTopBar(library = {}, doc = null) {
  const markup = renderToStaticMarkup(
    createElement(TopBar, {
      theme: 'light',
      onToggleTheme: () => {},
      doc,
      onHome: () => {},
      library: { query: '', scope: 'name', onQuery: () => {}, ...library },
    }),
  );
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container;
}

describe('TopBar search', () => {
  it('hides the clear button until the query has text', () => {
    expect(renderTopBar().querySelector('.search-clear')).toBeNull();
    expect(
      renderTopBar({ query: 'a' }).querySelector('.search-clear'),
    ).not.toBeNull();
  });

  it('labels the input for the active scope', () => {
    expect(
      renderTopBar({ query: 'a' })
        .querySelector('input')
        .getAttribute('aria-label'),
    ).toBe('Search file names');
    expect(
      renderTopBar({ scope: 'content' })
        .querySelector('input')
        .getAttribute('aria-label'),
    ).toBe('Search file content');
  });
});

describe('TopBar settings', () => {
  it('does not render a settings button without onSettings', () => {
    expect(renderTopBar().querySelector('.settings-btn')).toBeNull();
  });

  it('renders a labeled settings button when onSettings is provided', () => {
    const markup = renderToStaticMarkup(
      createElement(TopBar, {
        theme: 'light',
        onToggleTheme: () => {},
        doc: null,
        onHome: () => {},
        onSettings: () => {},
      }),
    );
    const container = document.createElement('div');
    container.innerHTML = markup;
    const btn = container.querySelector('.settings-btn');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Settings');
  });

  it('shows back, logo, and Settings in order while settings is active', () => {
    const markup = renderToStaticMarkup(
      createElement(TopBar, {
        doc: null,
        onHome: () => {},
        onSettings: () => {},
        settingsActive: true,
      }),
    );
    const container = document.createElement('div');
    container.innerHTML = markup;
    expect(container.querySelector('.settings-btn')).toBeNull();
    const left = container.querySelector('.topbar-left');
    expect(
      Array.from(left.children, (el) =>
        el.matches('.settings-back, .brand, .topbar-title'),
      ),
    ).toEqual([true, true, true]);
    expect(
      left.querySelector('.settings-back').getAttribute('aria-label'),
    ).toBe('Back to app');
    expect(left.querySelector('.brand span')).toBeNull();
    expect(left.querySelector('.topbar-title').textContent).toBe('Settings');
  });
});

describe('TopBar exports', () => {
  it('shows an accessible export menu for an open document', () => {
    const container = renderTopBar({}, { title: 'notes.md' });
    const menu = container.querySelector('.export-menu');

    expect(menu.querySelector('summary').getAttribute('aria-label')).toBe(
      'Export',
    );
    expect(
      menu.querySelector('summary .material-symbols-outlined').textContent,
    ).toBe('file_export');
    expect(menu.querySelector('[aria-label="Export HTML"]')).not.toBeNull();
    expect(menu.querySelector('[aria-label="Export PDF"]').disabled).toBe(true);
    expect(
      menu.querySelector(
        '[aria-label="Export HTML"] .material-symbols-outlined',
      ).textContent,
    ).toBe('code');
    expect(
      menu.querySelector('[aria-label="Export HTML"]').textContent,
    ).toContain('HTML');
    expect(
      menu.querySelector('[aria-label="Export PDF"] .material-symbols-outlined')
        .textContent,
    ).toBe('picture_as_pdf');
    expect(
      menu.querySelector('[aria-label="Export PDF"]').textContent,
    ).toContain('PDF');
  });

  it('enables PDF export when an export handler is provided', () => {
    const container = renderTopBar(
      {},
      {
        title: 'notes.md',
        onExportPdf: () => {},
      },
    );

    expect(container.querySelector('[aria-label="Export PDF"]').disabled).toBe(
      false,
    );
  });

  it('closes the export menu when clicking outside', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () =>
      root.render(createElement(TopBar, { doc: { title: 'notes.md' } })),
    );
    const menu = host.querySelector('.export-menu');
    await act(async () => menu.querySelector('summary').click());
    expect(menu.open).toBe(true);

    await act(async () =>
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })),
    );
    expect(menu.open).toBe(false);
    await act(async () => root.unmount());
    host.remove();
  });

  it('closes the export menu when focus leaves it', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    const outside = document.createElement('button');
    document.body.append(host, outside);
    const root = createRoot(host);
    await act(async () =>
      root.render(createElement(TopBar, { doc: { title: 'notes.md' } })),
    );
    const menu = host.querySelector('.export-menu');
    await act(async () => menu.querySelector('summary').click());
    menu.querySelector('summary').focus();

    await act(async () => outside.focus());
    expect(menu.open).toBe(false);
    await act(async () => root.unmount());
    host.remove();
    outside.remove();
  });
});
