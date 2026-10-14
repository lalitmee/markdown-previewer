import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const historyMock = vi.hoisted(() => {
  const store = {
    items: [],
    list: null,
    trim: null,
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  };
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
  window.matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  historyMock.items = [];
  vi.clearAllMocks();
  historyMock.add.mockReset();
  historyMock.add.mockImplementation(async () => {});
  historyMock.list.mockImplementation(async () => historyMock.items);
  historyMock.trim.mockImplementation(async (limit) => {
    historyMock.items = historyMock.items.slice(0, limit);
    return historyMock.items;
  });
  document.documentElement.removeAttribute('data-navigation');
  document.startViewTransition = undefined;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('pasted Markdown', () => {
  it('renders pasted text without a file and restores the draft on back', async () => {
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('.dz-actions button').click());

    const input = host.querySelector('#pasted-markdown');
    expect(input).not.toBeNull();
    expect(host.querySelector('.paste-footer button').disabled).toBe(true);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      ).set.call(input, '# Pasted heading');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('.paste-footer button').click());

    expect(host.querySelector('.file-title').textContent).toBe(
      'Pasted Markdown',
    );
    expect(host.querySelector('.md-body h1').textContent).toBe(
      'Pasted heading',
    );
    expect(host.querySelector('[aria-label="Save"]')).toBeNull();
    expect(historyMock.add).not.toHaveBeenCalled();

    await act(async () => host.querySelector('[aria-label="Back"]').click());
    expect(host.querySelector('#pasted-markdown').value).toBe(
      '# Pasted heading',
    );
  });
});

describe('App recent-item limit', () => {
  it('loads the saved limit, trims existing entries, and applies a changed limit', async () => {
    localStorage.setItem('mdpv-history-limit', '10');
    historyMock.items = Array.from({ length: 7 }, (_, i) => ({
      name: `item-${i}`,
      kind: 'file',
    }));

    await act(async () => root.render(createElement(App)));
    expect(host.querySelectorAll('.history-item')).toHaveLength(7);

    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );
    const limitGroup = host.querySelector('[aria-label="Recent items limit"]');
    expect(limitGroup.querySelector('[aria-pressed="true"]').textContent).toBe(
      '10',
    );
    await act(async () =>
      limitGroup
        .querySelector('button[aria-label="Keep 5 recent items"]')
        .click(),
    );

    expect(localStorage.getItem('mdpv-history-limit')).toBe('5');
    expect(
      host.querySelector(
        '[aria-label="Recent files and folders"] .history-list',
      ).children,
    ).toHaveLength(5);
    expect(historyMock.trim).toHaveBeenLastCalledWith(5);
    expect(historyMock.items).toHaveLength(5);
  });

  it('falls back to 20 when the saved limit is invalid', async () => {
    localStorage.setItem('mdpv-history-limit', 'not-a-limit');
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );
    expect(
      host.querySelector(
        '[aria-label="Recent items limit"] [aria-pressed="true"]',
      ).textContent,
    ).toBe('20');
  });

  it('defaults to the system theme while preserving saved preferences', async () => {
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );
    expect(
      host
        .querySelector('[aria-label="System theme"]')
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(document.documentElement.dataset.theme).toBe('light');

    await act(async () => root.unmount());
    root = createRoot(host);
    window.history.replaceState({}, '', '/');
    localStorage.setItem('mdpv-theme', 'dark');
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );
    expect(
      host
        .querySelector('[aria-label="Dark theme"]')
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('uses a whole-page view transition for in-app Settings navigation', async () => {
    let finish;
    const finished = new Promise((resolve) => {
      finish = resolve;
    });
    document.startViewTransition = vi.fn((update) => {
      update();
      return { finished };
    });
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );

    expect(document.startViewTransition).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.navigation).toBe('forward');
    expect(host.querySelector('main.settings')).not.toBeNull();
    await act(async () => finish());
    expect(document.documentElement.dataset.navigation).toBeUndefined();
  });

  it('does not animate a direct Settings load', async () => {
    window.history.replaceState({}, '', '/settings');
    document.startViewTransition = vi.fn();
    await act(async () => root.render(createElement(App)));

    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it('reverses the whole-page transition when leaving Settings', async () => {
    window.history.replaceState({}, '', '/settings');
    let finish;
    document.startViewTransition = vi.fn((update) => {
      update();
      return {
        finished: new Promise((resolve) => {
          finish = resolve;
        }),
      };
    });
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Back to app"]').click(),
    );

    expect(document.startViewTransition).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.navigation).toBe('back');
    expect(host.querySelector('.picker')).not.toBeNull();
    await act(async () => finish());
  });

  it('skips view transitions when reduced motion is preferred', async () => {
    window.matchMedia = (query) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    document.startViewTransition = vi.fn((update) => {
      update();
      return { finished: Promise.resolve() };
    });
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );

    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(host.querySelector('main.settings')).not.toBeNull();
  });

  it('discards stale results when limit changes resolve out of order', async () => {
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );
    const group = host.querySelector('[aria-label="Recent items limit"]');
    const pending = [];
    historyMock.trim.mockImplementation(
      (limit) => new Promise((resolve) => pending.push({ limit, resolve })),
    );

    await act(async () =>
      group.querySelector('[aria-label="Keep 5 recent items"]').click(),
    );
    await act(async () =>
      group.querySelector('[aria-label="Keep 50 recent items"]').click(),
    );
    await act(async () =>
      pending[1].resolve([
        { name: 'newest', kind: 'file' },
        { name: 'middle', kind: 'file' },
      ]),
    );
    await act(async () =>
      pending[0].resolve([{ name: 'newest', kind: 'file' }]),
    );

    expect(group.querySelector('[aria-pressed="true"]').textContent).toBe('50');
    expect(host.querySelectorAll('.history-item')).toHaveLength(2);
  });

  it('does not publish a pending history add using the previous limit', async () => {
    localStorage.setItem('mdpv-history-limit', '10');
    historyMock.items = Array.from({ length: 10 }, (_, i) => ({
      name: `item-${i}`,
      kind: 'file',
      handle: { name: `item-${i}`, kind: 'file' },
    }));
    let finishAdd;
    historyMock.add.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishAdd = () => {
            historyMock.items = Array.from({ length: 10 }, (_, i) => ({
              name: `item-${i}`,
              kind: 'file',
            }));
            resolve();
          };
        }),
    );

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    await act(async () => host.querySelector('.history-open').click());
    expect(historyMock.add).toHaveBeenCalledWith(
      historyMock.items[0].handle,
      undefined,
      10,
    );

    await act(async () =>
      host.querySelector('[aria-label="Keep 5 recent items"]').click(),
    );
    await act(async () => finishAdd());

    expect(host.querySelectorAll('.history-item')).toHaveLength(5);
  });

  it('leaves the settings URL when a recent item opens from direct Settings entry', async () => {
    window.history.replaceState({}, '', '/settings');
    historyMock.items = [
      {
        name: 'recent.md',
        kind: 'file',
        handle: { name: 'recent.md', kind: 'file' },
      },
    ];
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    await act(async () => host.querySelector('.history-open').click());

    expect(window.location.pathname).toBe('/');
    expect(host.querySelector('.preview-page')).not.toBeNull();
  });

  it('uses the latest valid view when Forward re-enters Settings', async () => {
    historyMock.items = [
      {
        name: 'recent.md',
        kind: 'file',
        handle: { name: 'recent.md', kind: 'file' },
      },
    ];
    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    await act(async () => host.querySelector('.history-open').click());
    await act(async () =>
      host.querySelector('[aria-label="Settings"]').click(),
    );

    await act(async () => {
      const popstate = new Promise((resolve) =>
        window.addEventListener('popstate', resolve, { once: true }),
      );
      window.history.back();
      await popstate;
    });
    await act(async () => host.querySelector('[aria-label="Back"]').click());
    await act(async () => {
      const popstate = new Promise((resolve) =>
        window.addEventListener('popstate', resolve, { once: true }),
      );
      window.history.forward();
      await popstate;
    });
    await act(async () => {
      const popstate = new Promise((resolve) =>
        window.addEventListener('popstate', resolve, { once: true }),
      );
      host.querySelector('[aria-label="Back to app"]').click();
      await popstate;
    });

    expect(window.location.pathname).toBe('/');
    expect(host.querySelector('.picker')).not.toBeNull();
    expect(host.querySelector('[aria-label="Preview"]')).toBeNull();
  });
});
