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

let host;
let root;

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  localStorage.clear();
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  historyMock.items = [];
  vi.clearAllMocks();
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
    const select = host.querySelector('[aria-label="Recent items limit"]');
    expect(select.value).toBe('10');

    await act(async () => {
      select.value = '5';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(localStorage.getItem('mdpv-history-limit')).toBe('5');
    expect(host.querySelector('[aria-label="Recent files and folders"] .history-list').children).toHaveLength(5);
    expect(historyMock.trim).toHaveBeenLastCalledWith(5);
    expect(historyMock.items).toHaveLength(5);
  });

  it('falls back to 20 when the saved limit is invalid', async () => {
    localStorage.setItem('mdpv-history-limit', 'not-a-limit');
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('[aria-label="Settings"]').click());
    expect(host.querySelector('[aria-label="Recent items limit"]').value).toBe('20');
  });
});
