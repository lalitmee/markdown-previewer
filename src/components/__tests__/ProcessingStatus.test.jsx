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
