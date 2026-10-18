import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import * as markdown from '../lib/markdown';

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
const fsMock = vi.hoisted(() => ({
  requestPermission: vi.fn(async () => true),
  readFileText: vi.fn(async () => '# recent file'),
  listMdFiles: vi.fn(async () => []),
  isFsaSupported: vi.fn(() => true),
  pickSingleFile: vi.fn(async () => null),
  pickFolder: vi.fn(async () => null),
  saveFileText: vi.fn(async () => {}),
  inlineImages: vi.fn(async (html) => html),
}));
vi.mock('../lib/history', () => ({ createHistory: () => historyMock }));
vi.mock('../lib/fs-access', () => fsMock);
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }) => (
    <textarea
      className="cm-content"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
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
  fsMock.requestPermission.mockReset().mockResolvedValue(true);
  fsMock.readFileText.mockReset().mockResolvedValue('# recent file');
  fsMock.listMdFiles.mockReset().mockResolvedValue([]);
  fsMock.isFsaSupported.mockReset().mockReturnValue(true);
  fsMock.pickSingleFile.mockReset().mockResolvedValue(null);
  fsMock.pickFolder.mockReset().mockResolvedValue(null);
  fsMock.saveFileText.mockReset().mockResolvedValue(undefined);
  fsMock.inlineImages.mockReset().mockImplementation(async (html) => html);
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
  vi.useRealTimers();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function showDelayedStatus() {
  await act(async () => vi.advanceTimersByTimeAsync(300));
}

describe('pasted Markdown', () => {
  it('keeps the top bar and processing status in one shell', async () => {
    await act(async () => root.render(createElement(App)));

    const shell = host.querySelector('.app-sticky-header');
    expect(shell.querySelector('header.topbar')).not.toBeNull();
    expect(shell.querySelector('.processing-status')).toBeNull();
    expect(shell.contains(host.querySelector('.app-content'))).toBe(false);
  });

  it('animates between the start screen and paste editor', async () => {
    const directions = [];
    document.startViewTransition = vi.fn((update) => {
      directions.push(document.documentElement.dataset.navigation);
      update();
      return { finished: Promise.resolve() };
    });

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('.dz-actions button').click());
    expect(host.querySelector('#pasted-markdown')).not.toBeNull();
    await act(async () => host.querySelector('[aria-label="Go home"]').click());

    expect(directions).toEqual(['paste-forward', 'paste-back']);
    expect(host.querySelector('#pasted-markdown')).toBeNull();
  });

  it('renders pasted text without a file and returns to its editor on back', async () => {
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('.dz-actions button').click());

    const input = host.querySelector('#pasted-markdown');
    expect(input).not.toBeNull();
    expect(host.querySelector('.paste-footer button').disabled).toBe(true);
    expect(host.querySelector('.paste-footer button').textContent).toContain(
      'Preview',
    );
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
    expect(host.querySelector('.dropzone h1').textContent).toBe(
      'Paste Markdown',
    );

    await act(async () => host.querySelector('[aria-label="Go home"]').click());
    expect(host.querySelector('#pasted-markdown')).toBeNull();
    expect(host.querySelector('.dropzone h1').textContent).toBe(
      'View & edit your markdown',
    );
    await act(async () => host.querySelector('.dz-actions button').click());
    expect(host.querySelector('#pasted-markdown').value).toBe(
      '# Pasted heading',
    );
  });
});

describe('drag and drop', () => {
  function drop(item) {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { items: [item], files: [] },
    });
    host.querySelector('.dropzone').dispatchEvent(event);
  }

  it('opens a dropped Markdown file and returns to home', async () => {
    await act(async () => root.render(createElement(App)));
    const file = { name: 'notes.md', text: async () => '# Dropped file' };
    const handle = { kind: 'file', name: file.name, getFile: async () => file };
    await act(async () =>
      drop({
        kind: 'file',
        getAsFileSystemHandle: () => Promise.resolve(handle),
        getAsFile: () => file,
      }),
    );

    expect(host.querySelector('.file-title').textContent).toBe('notes.md');
    expect(host.querySelector('.md-body h1').textContent).toBe('Dropped file');
    await act(async () => host.querySelector('[aria-label="Back"]').click());
    expect(host.querySelector('#pasted-markdown')).toBeNull();
    expect(host.querySelector('.dropzone h1').textContent).toBe(
      'View & edit your markdown',
    );
  });

  it('opens a dropped folder in the library', async () => {
    await act(async () => root.render(createElement(App)));
    const handle = { kind: 'directory', name: 'docs' };
    await act(async () =>
      drop({
        kind: 'file',
        getAsFileSystemHandle: () => Promise.resolve(handle),
        getAsFile: () => null,
      }),
    );
    expect(host.querySelector('.library')).not.toBeNull();
    expect(historyMock.add).toHaveBeenCalled();
  });
});

describe('file and folder processing feedback', () => {
  beforeEach(() => vi.useFakeTimers());

  function drop(item) {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { items: [item], files: [] },
    });
    host.querySelector('.dropzone').dispatchEvent(event);
  }

  it('shows feedback while the browser folder picker is still open', async () => {
    const picker = deferred();
    fsMock.pickFolder.mockReturnValue(picker.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('button.btn.secondary').click());

    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Select a folder and allow browser access',
    );

    await act(async () => picker.resolve(null));
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('reports folder scanning and indexed progress after selection', async () => {
    const scan = deferred();
    const firstRead = deferred();
    const secondRead = deferred();
    const files = [
      { name: 'one.md', path: 'one.md', handle: { name: 'one.md' } },
      { name: 'two.md', path: 'two.md', handle: { name: 'two.md' } },
    ];
    fsMock.pickFolder.mockResolvedValue({ name: 'docs' });
    fsMock.listMdFiles.mockReturnValue(scan.promise);
    fsMock.readFileText
      .mockReturnValueOnce(firstRead.promise)
      .mockReturnValueOnce(secondRead.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('button.btn.secondary').click());
    await showDelayedStatus();

    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Scanning folder: docs',
    );
    expect(
      host
        .querySelector('.app-sticky-header')
        .contains(host.querySelector('[role="status"]')),
    ).toBe(true);

    await act(async () => scan.resolve(files));
    expect(host.querySelector('.library')).not.toBeNull();
    expect(host.querySelector('.result-count').textContent).toContain(
      'Indexing… 0/2',
    );
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Loading Markdown',
    );
    expect(host.querySelector('[role="status"]').textContent).toContain('0/2');

    await act(async () => firstRead.resolve('# One'));
    expect(host.querySelector('.result-count').textContent).toContain(
      'Indexing… 1/2',
    );
    expect(host.querySelector('[role="status"]').textContent).toContain('1/2');

    await act(async () => secondRead.resolve('# Two'));
    expect(host.querySelector('.result-count').textContent).toContain(
      '2 files',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('continues eager indexing when opening a file during indexing', async () => {
    const firstIndexRead = deferred();
    const files = [
      { name: 'one.md', path: 'one.md', handle: { name: 'one.md' } },
      { name: 'two.md', path: 'two.md', handle: { name: 'two.md' } },
    ];
    fsMock.pickFolder.mockResolvedValue({ name: 'docs' });
    fsMock.listMdFiles.mockResolvedValue(files);
    fsMock.readFileText
      .mockReturnValueOnce(firstIndexRead.promise)
      .mockResolvedValueOnce('# One')
      .mockResolvedValueOnce('# Two');

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('button.btn.secondary').click());
    await act(async () => Promise.resolve());
    await act(async () => host.querySelector('.card').click());
    await act(async () => host.querySelector('[aria-label="Back"]').click());
    await act(async () => firstIndexRead.resolve('# One'));

    expect(fsMock.readFileText).toHaveBeenCalledTimes(3);
    expect(host.querySelector('.result-count').textContent).toContain(
      '2 files',
    );
  });

  it('reports scanning when opening a folder from history', async () => {
    const scan = deferred();
    historyMock.items = [
      { name: 'archive', kind: 'directory', handle: { name: 'archive' } },
    ];
    fsMock.listMdFiles.mockReturnValue(scan.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    await act(async () => host.querySelector('.history-open').click());
    await showDelayedStatus();

    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Scanning folder: archive',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => scan.resolve([]));
    expect(host.querySelector('.library')).not.toBeNull();
    expect(host.querySelector('.empty-state').textContent).toContain(
      'No markdown files found',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('reports a file read while opening a selected file', async () => {
    const read = deferred();
    fsMock.pickSingleFile.mockResolvedValue({ name: 'selected.md' });
    fsMock.readFileText.mockReturnValue(read.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('button.btn.secondary:last-child').click(),
    );
    await showDelayedStatus();

    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Reading file: selected.md',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => read.resolve('# Selected'));
    expect(host.querySelector('.file-title').textContent).toBe('selected.md');
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('reports a file read while opening a file from history', async () => {
    const read = deferred();
    historyMock.items = [
      { name: 'recent.md', kind: 'file', handle: { name: 'recent.md' } },
    ];
    fsMock.readFileText.mockReturnValue(read.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    await act(async () => host.querySelector('.history-open').click());
    await showDelayedStatus();

    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Reading file: recent.md',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => read.resolve('# Recent'));
    expect(host.querySelector('.file-title').textContent).toBe('recent.md');
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('clears feedback after permission is denied for a recent file', async () => {
    const permission = deferred();
    historyMock.items = [
      { name: 'locked.md', kind: 'file', handle: { name: 'locked.md' } },
    ];
    fsMock.requestPermission.mockReturnValue(permission.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    await act(async () => host.querySelector('.history-open').click());
    await showDelayedStatus();
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Opening recent item: locked.md',
    );

    await act(async () => permission.resolve(false));

    expect(host.querySelector('.picker')).not.toBeNull();
    expect(host.querySelector('.toast').textContent).toContain(
      'Permission denied',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('reports reading a dropped file', async () => {
    const read = deferred();
    const file = { name: 'dropped.md', text: () => read.promise };
    const handle = { kind: 'file', name: file.name, getFile: async () => file };

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      drop({
        kind: 'file',
        getAsFileSystemHandle: () => Promise.resolve(handle),
        getAsFile: () => file,
      }),
    );
    await showDelayedStatus();

    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Reading file: dropped.md',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => read.resolve('# Dropped'));
    expect(host.querySelector('.file-title').textContent).toBe('dropped.md');
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('clears busy state and shows a notice when folder scanning fails', async () => {
    fsMock.pickFolder.mockResolvedValue({ name: 'broken' });
    fsMock.listMdFiles.mockRejectedValue(new Error('scan failed'));

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('button.btn.secondary').click());

    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(host.querySelector('.toast')).not.toBeNull();
    expect(host.querySelector('.library')).toBeNull();
  });

  it('clears busy state and shows a notice when a selected file read fails', async () => {
    fsMock.pickSingleFile.mockResolvedValue({ name: 'broken.md' });
    fsMock.readFileText.mockRejectedValue(new Error('read failed'));

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('button.btn.secondary:last-child').click(),
    );

    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(host.querySelector('.toast')).not.toBeNull();
    expect(host.querySelector('.preview-page')).toBeNull();
  });

  it('does not let an older read replace the screen or clear newer activity', async () => {
    const oldRead = deferred();
    const newRead = deferred();
    fsMock.pickSingleFile
      .mockResolvedValueOnce({ name: 'old.md' })
      .mockResolvedValueOnce({ name: 'new.md' });
    fsMock.readFileText
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(newRead.promise);

    await act(async () => root.render(createElement(App)));
    const openButton = () =>
      host.querySelector('button.btn.secondary:last-child');
    await act(async () => openButton().click());
    await act(async () => host.querySelector('[aria-label="Go home"]').click());
    await act(async () => openButton().click());
    await showDelayedStatus();

    await act(async () => oldRead.resolve('# Old'));
    expect(host.querySelector('.picker')).not.toBeNull();
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Reading file: new.md',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => newRead.resolve('# New'));
    expect(host.querySelector('.file-title').textContent).toBe('new.md');
    expect(host.querySelector('.md-body h1').textContent).toBe('New');
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

describe('preview processing feedback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.restoreAllMocks());

  it('reports delayed rendering for pasted Markdown and clears when rendered', async () => {
    const render = deferred();
    vi.spyOn(markdown, 'renderMarkdown').mockReturnValueOnce(render.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('.dz-actions button').click());
    const input = host.querySelector('#pasted-markdown');
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      ).set.call(input, '# Pasted preview');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('.paste-footer button').click());
    await showDelayedStatus();

    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Rendering preview',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => render.resolve('<h1>Pasted preview</h1>'));

    expect(host.querySelector('.md-body h1').textContent).toBe(
      'Pasted preview',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('keeps the live status outside the busy content', async () => {
    const render = deferred();
    vi.spyOn(markdown, 'renderMarkdown').mockReturnValueOnce(render.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('.dz-actions button').click());
    const input = host.querySelector('#pasted-markdown');
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      ).set.call(input, '# Busy region');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('.paste-footer button').click());
    await showDelayedStatus();

    const status = host.querySelector('[role="status"]');
    const busy = host.querySelector('[aria-busy="true"]');
    expect(status).not.toBeNull();
    expect(busy).not.toBeNull();
    expect(busy.contains(status)).toBe(false);

    await act(async () => render.resolve('<h1>Busy region</h1>'));
  });

  it('reports delayed rendering for a file preview', async () => {
    const render = deferred();
    fsMock.pickSingleFile.mockResolvedValue({ name: 'large.md' });
    fsMock.readFileText.mockResolvedValue('# Large file');
    vi.spyOn(markdown, 'renderMarkdown').mockReturnValueOnce(render.promise);

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('button.btn.secondary:last-child').click(),
    );
    await showDelayedStatus();

    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Rendering preview',
    );

    await act(async () => render.resolve('<h1>Large file</h1>'));

    expect(host.querySelector('.md-body h1').textContent).toBe('Large file');
    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('keeps an in-flight file read as owner while the current preview rerenders', async () => {
    const read = deferred();
    const editedRender = deferred();
    const render = vi
      .spyOn(markdown, 'renderMarkdown')
      .mockImplementation((source) =>
        source.includes('Edited')
          ? editedRender.promise
          : Promise.resolve(`<h1>${source.slice(2)}</h1>`),
      );
    fsMock.pickSingleFile.mockResolvedValue({ name: 'current.md' });
    fsMock.readFileText.mockResolvedValue('# Initial');
    historyMock.items = [
      { name: 'recent.md', kind: 'file', handle: { name: 'recent.md' } },
    ];

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('button.btn.secondary:last-child').click(),
    );
    await act(async () =>
      host.querySelector('[aria-label="Recent files and folders"]').click(),
    );
    fsMock.readFileText.mockReturnValue(read.promise);
    await act(async () => host.querySelector('.history-open').click());
    await showDelayedStatus();
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Reading file: recent.md',
    );

    await act(async () => host.querySelector('[aria-label="Edit"]').click());
    const editor = host.querySelector('.cm-content');
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      ).set.call(editor, '# Edited');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await showDelayedStatus();

    expect(
      render.mock.calls.some(([source]) => source.includes('Edited')),
    ).toBe(true);
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Reading file: recent.md',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => editedRender.resolve('<h1>Edited</h1>'));
    await act(async () => read.resolve('# Recent'));
  });

  it('does not let an obsolete render clear a newer preview status', async () => {
    const oldRender = deferred();
    const newRender = deferred();
    vi.spyOn(markdown, 'renderMarkdown')
      .mockReturnValueOnce(oldRender.promise)
      .mockReturnValueOnce(newRender.promise);
    fsMock.pickSingleFile.mockResolvedValue({ name: 'old.md' });
    fsMock.readFileText.mockResolvedValue('# Old preview');

    await act(async () => root.render(createElement(App)));
    await act(async () =>
      host.querySelector('button.btn.secondary:last-child').click(),
    );
    await act(async () => host.querySelector('[aria-label="Back"]').click());
    await act(async () => host.querySelector('.dz-actions button').click());
    const input = host.querySelector('#pasted-markdown');
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      ).set.call(input, '# New preview');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('.paste-footer button').click());
    await showDelayedStatus();
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Rendering preview',
    );

    await act(async () => oldRender.resolve('<h1>Old preview</h1>'));
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Rendering preview',
    );
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'true',
    );

    await act(async () => newRender.resolve('<h1>New preview</h1>'));
    expect(host.querySelector('.md-body h1').textContent).toBe('New preview');
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('does not flash status for a quick preview render', async () => {
    await act(async () => root.render(createElement(App)));
    await act(async () => host.querySelector('.dz-actions button').click());
    const input = host.querySelector('#pasted-markdown');
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      ).set.call(input, '# Quick preview');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => host.querySelector('.paste-footer button').click());
    await act(async () => vi.advanceTimersByTimeAsync(300));

    expect(host.querySelector('.md-body h1').textContent).toBe('Quick preview');
    expect(host.querySelector('[role="status"]')).toBeNull();
    expect(host.querySelector('.app-content').getAttribute('aria-busy')).toBe(
      'false',
    );
  });

  it('delays status for a later preview instead of reusing visibility', async () => {
    const firstRender = deferred();
    const secondRender = deferred();
    fsMock.pickSingleFile
      .mockResolvedValueOnce({ name: 'first.md' })
      .mockResolvedValueOnce({ name: 'second.md' });
    fsMock.readFileText
      .mockResolvedValueOnce('# First')
      .mockResolvedValueOnce('# Second');
    vi.spyOn(markdown, 'renderMarkdown')
      .mockReturnValueOnce(firstRender.promise)
      .mockReturnValueOnce(secondRender.promise);

    await act(async () => root.render(createElement(App)));
    const openButton = () =>
      host.querySelector('button.btn.secondary:last-child');
    await act(async () => openButton().click());
    await showDelayedStatus();
    expect(host.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => firstRender.resolve('<h1>First</h1>'));
    expect(host.querySelector('[role="status"]')).toBeNull();

    await act(async () => host.querySelector('[aria-label="Back"]').click());
    await act(async () => openButton().click());

    expect(host.querySelector('[role="status"]')).toBeNull();
    await showDelayedStatus();
    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      'Rendering preview',
    );
    await act(async () => secondRender.resolve('<h1>Second</h1>'));
    expect(host.querySelector('[role="status"]')).toBeNull();
  });
});
