import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProcessingStatus from '../ProcessingStatus';

let host;
let root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
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

describe('ProcessingStatus', () => {
  it('never falls back to a header pill while waiting for the inline slot', async () => {
    const activity = {
      id: 1,
      message: 'Loading Markdown',
      current: 4,
      total: 9,
      immediate: true,
    };
    await act(async () =>
      root.render(createElement(ProcessingStatus, { activity, inline: true })),
    );
    await act(async () => vi.advanceTimersByTime(300));
    expect(host.querySelector('[role="status"]')).toBeNull();
    const container = document.createElement('div');
    document.body.append(container);
    try {
      await act(async () =>
        root.render(
          createElement(ProcessingStatus, {
            activity,
            inline: true,
            container,
          }),
        ),
      );
      expect(container.querySelector('.processing-message').textContent).toBe(
        'Indexing',
      );
      expect(container.querySelector('.processing-progress').textContent).toBe(
        '4/9',
      );
      expect(host.querySelector('[role="status"]')).toBeNull();
    } finally {
      container.remove();
    }
  });
  it('moves an already visible status into the library without restarting its delay', async () => {
    const activity = {
      id: 1,
      message: 'Loading Markdown',
      current: 2,
      total: 8,
    };
    const container = document.createElement('div');
    document.body.append(container);
    try {
      await act(async () =>
        root.render(createElement(ProcessingStatus, { activity })),
      );
      await act(async () => vi.advanceTimersByTime(300));
      expect(host.querySelector('[role="status"]')).not.toBeNull();
      await act(async () =>
        root.render(createElement(ProcessingStatus, { activity, container })),
      );
      expect(host.querySelector('[role="status"]')).toBeNull();
      expect(
        container.querySelector('.processing-status-inline').textContent,
      ).toContain('2/8');
      expect(
        container.querySelector('[role="status"]').getAttribute('aria-live'),
      ).toBe('polite');
      await act(async () =>
        root.render(createElement(ProcessingStatus, { container })),
      );
      expect(container.querySelector('[role="status"]')).toBeNull();
    } finally {
      container.remove();
    }
  });
  it('waits 300ms before announcing an active operation', async () => {
    await act(async () => {
      root.render(
        createElement(ProcessingStatus, {
          activity: { id: 1, message: 'Scanning folder' },
        }),
      );
    });

    expect(host.querySelector('[role="status"]')).toBeNull();

    await act(async () => vi.advanceTimersByTime(299));
    expect(host.querySelector('[role="status"]')).toBeNull();

    await act(async () => vi.advanceTimersByTime(1));
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'Scanning folder',
    );
  });

  it('announces progress in a polite live region', async () => {
    await act(async () => {
      root.render(
        createElement(ProcessingStatus, {
          activity: {
            id: 1,
            message: 'Loading Markdown',
            current: 3,
            total: 8,
          },
        }),
      );
    });
    await act(async () => vi.advanceTimersByTime(300));

    const status = host.querySelector('[role="status"]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Loading Markdown');
    expect(status.textContent).toContain('3/8');
  });

  it('hides the status when the operation completes before it is shown', async () => {
    await act(async () => {
      root.render(
        createElement(ProcessingStatus, {
          activity: { id: 1, message: 'Reading file' },
        }),
      );
    });
    await act(async () => vi.advanceTimersByTime(200));
    await act(async () => root.render(createElement(ProcessingStatus, {})));
    await act(async () => vi.advanceTimersByTime(300));

    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('removes the visible status when the operation completes', async () => {
    await act(async () => {
      root.render(
        createElement(ProcessingStatus, {
          activity: { id: 1, message: 'Reading file' },
        }),
      );
    });
    await act(async () => vi.advanceTimersByTime(300));
    expect(host.querySelector('[role="status"]')).not.toBeNull();

    await act(async () => root.render(createElement(ProcessingStatus, {})));

    expect(host.querySelector('[role="status"]')).toBeNull();
  });

  it('does not restart the delay when progress updates for the same operation', async () => {
    await act(async () => {
      root.render(
        createElement(ProcessingStatus, {
          activity: {
            id: 1,
            message: 'Loading Markdown',
            current: 1,
            total: 10,
          },
        }),
      );
    });
    await act(async () => vi.advanceTimersByTime(200));
    await act(async () => {
      root.render(
        createElement(ProcessingStatus, {
          activity: {
            id: 1,
            message: 'Loading Markdown',
            current: 2,
            total: 10,
          },
        }),
      );
    });
    await act(async () => vi.advanceTimersByTime(100));

    expect(host.querySelector('[role="status"]')?.textContent).toContain(
      '2/10',
    );
  });
});
