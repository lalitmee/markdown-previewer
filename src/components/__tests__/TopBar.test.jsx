import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import TopBar from '../TopBar';

function renderTopBar(library = {}) {
  const markup = renderToStaticMarkup(createElement(TopBar, {
    theme: 'light',
    onToggleTheme: () => {},
    doc: null,
    onHome: () => {},
    library: { query: '', scope: 'name', onQuery: () => {}, ...library },
  }));
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container;
}

describe('TopBar search', () => {
  it('hides the clear button until the query has text', () => {
    expect(renderTopBar().querySelector('.search-clear')).toBeNull();
    expect(renderTopBar({ query: 'a' }).querySelector('.search-clear')).not.toBeNull();
  });

  it('labels the input for the active scope', () => {
    expect(renderTopBar({ query: 'a' }).querySelector('input').getAttribute('aria-label'))
      .toBe('Search file names');
    expect(renderTopBar({ scope: 'content' }).querySelector('input').getAttribute('aria-label'))
      .toBe('Search file content');
  });
});

describe('TopBar settings', () => {
  it('does not render a settings button without onSettings', () => {
    expect(renderTopBar().querySelector('.settings-btn')).toBeNull();
  });

  it('renders a labeled settings button when onSettings is provided', () => {
    const markup = renderToStaticMarkup(createElement(TopBar, {
      theme: 'light',
      onToggleTheme: () => {},
      doc: null,
      onHome: () => {},
      onSettings: () => {},
    }));
    const container = document.createElement('div');
    container.innerHTML = markup;
    const btn = container.querySelector('.settings-btn');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Settings');
  });

  it('shows back, logo, and Settings in order while settings is active', () => {
    const markup = renderToStaticMarkup(createElement(TopBar, {
      doc: null,
      onHome: () => {},
      onSettings: () => {},
      settingsActive: true,
    }));
    const container = document.createElement('div');
    container.innerHTML = markup;
    expect(container.querySelector('.settings-btn')).toBeNull();
    const left = container.querySelector('.topbar-left');
    expect(Array.from(left.children, (el) => el.matches('.settings-back, .brand, .topbar-title'))).toEqual([true, true, true]);
    expect(left.querySelector('.settings-back').getAttribute('aria-label')).toBe('Back to app');
    expect(left.querySelector('.brand span')).toBeNull();
    expect(left.querySelector('.topbar-title').textContent).toBe('Settings');
  });
});
