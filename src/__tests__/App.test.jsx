import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const historyMock = vi.hoisted(() => {
  const store = { items: [], list: null, trim: null, add: vi.fn(), remove: vi.fn(), clear: vi.fn() };
  store.list = vi.fn(async () => store.items);
  store.trim = vi.fn(async (limit) => {
    store.items = store.items.slice(0, limit);
    return store.items;
  });
  return store;
});
vi.mock('../lib/history', () => ({ createHistory: () => historyMock }));
vi.mock('../lib/fs-access', () => ({
  requestPermission: async () => true,
  readFileText: async () => '# recent file',
  listMdFiles: async () => [],
  isFsaSupported: () => true,
  pickSingleFile: async () => null,
  pickFolder: async () => null,
  saveFileText: async () => {},
  inlineImages: async (html) => html,
}));

let host;
let root;

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  historyMock.items = [];
  vi.clearAllMocks();
  historyMock.list.mockImplementation(async () => historyMock.items);
  historyMock.trim.mockImplementation(async (limit) => {
    historyMock.items = historyMock.items.slice(0, limit);
    return historyMock.items;
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('App recent-item limit', () => {
  it('loads the saved limit, trims existing entries, and applies a changed limit', async () => {
    localStorage.setItem('mdpv-history-limit', '10');
    historyMock.items = Array.from({ length: 7 }, (_, i) => ({ name: `item-${i}`, kind: 'file' }));

    await act(async () => root.render(createElement(App)));
    expect(host.querySelectorAll('.history-item')).toHaveLength(7);

    await act(async () => host.querySelector('[aria-label="Settings"]').click());
    const limitGroup = host.querySelector('[aria-label="Recent items limit"]');
    expect(limitGroup.querySelector('[aria-pressed="true"]').textContent).toBe('10');
    await act(async () => limitGroup.querySelector('button[aria-label="Keep 5 recent items"]').click());

    expect(localStorage.getItem('mdpv-history-limit')).toBe('5');
    expect(host.querySelector('[aria-label="Recent files and folders"] .history-list').children).toHaveLength(5);
    expect(historyMock.trim).toHaveBeenLastCalledWith(5);
    expect(historyMock.items).toHaveLength(5);
  });

  it('falls back to 20 when the saved limit is invalid', async () => {
    localStorage.setItem('mdpv-history-limit', 'not-a-limit');
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('[aria-label="Settings"]').click());
    expect(host.querySelector('[aria-label="Recent items limit"] [aria-pressed="true"]').textContent).toBe('20');
  });

  it('discards stale results when limit changes resolve out of order', async () => {
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('[aria-label="Settings"]').click());
    const group = host.querySelector('[aria-label="Recent items limit"]');
    const pending = [];
    historyMock.trim.mockImplementation((limit) => new Promise((resolve) => pending.push({ limit, resolve })));

    await act(async () => group.querySelector('[aria-label="Keep 5 recent items"]').click());
    await act(async () => group.querySelector('[aria-label="Keep 50 recent items"]').click());
    await act(async () => pending[1].resolve([{ name: 'newest', kind: 'file' }, { name: 'middle', kind: 'file' }]));
    await act(async () => pending[0].resolve([{ name: 'newest', kind: 'file' }]));

    expect(group.querySelector('[aria-pressed="true"]').textContent).toBe('50');
    expect(host.querySelectorAll('.history-item')).toHaveLength(2);
  });

  it('leaves the settings URL when a recent item opens from direct Settings entry', async () => {
    window.history.replaceState({}, '', '/settings');
    historyMock.items = [{ name: 'recent.md', kind: 'file', handle: { name: 'recent.md', kind: 'file' } }];
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('[aria-label="Recent files and folders"]').click());
    await act(async () => host.querySelector('.history-open').click());

    expect(window.location.pathname).toBe('/');
    expect(host.querySelector('.preview-page')).not.toBeNull();
  });

  it('uses the latest valid view when Forward re-enters Settings', async () => {
    historyMock.items = [{ name: 'recent.md', kind: 'file', handle: { name: 'recent.md', kind: 'file' } }];
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('[aria-label="Recent files and folders"]').click());
    await act(async () => host.querySelector('.history-open').click());
    await act(async () => host.querySelector('[aria-label="Settings"]').click());

    await act(async () => {
      const popstate = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
      window.history.back();
      await popstate;
    });
    await act(async () => host.querySelector('[aria-label="Back"]').click());
    await act(async () => {
      const popstate = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
      window.history.forward();
      await popstate;
    });
    await act(async () => {
      const popstate = new Promise((resolve) => window.addEventListener('popstate', resolve, { once: true }));
      host.querySelector('[aria-label="Back to app"]').click();
      await popstate;
    });

    expect(window.location.pathname).toBe('/');
    expect(host.querySelector('.picker')).not.toBeNull();
    expect(host.querySelector('[aria-label="Preview"]')).toBeNull();
  });
});
