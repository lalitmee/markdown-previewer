import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import HistorySection from '../HistorySection';

describe('HistorySection', () => {
  it('removes a recent entry without opening it', async () => {
    const entry = { name: 'notes', kind: 'file', handle: {} };
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root.render(
        createElement(HistorySection, {
          history: [entry],
          onOpen,
          onRemove,
        }),
      );
    });

    const removeButton = container.querySelector(
      '[aria-label="Remove notes from recent"]',
    );
    expect(removeButton).not.toBeNull();

    await act(async () => removeButton.click());

    expect(onRemove).toHaveBeenCalledWith(entry);
    expect(onOpen).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('renders paste entries with content_paste icon and opens them on click', async () => {
    const entry = {
      name: 'Meeting notes',
      kind: 'paste',
      text: '# Meeting notes',
    };
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root.render(
        createElement(HistorySection, {
          history: [entry],
          onOpen,
          onRemove,
        }),
      );
    });

    expect(container.querySelector('.h-ico').textContent).toBe('content_paste');
    expect(container.querySelector('.h-kind').textContent).toBe('paste');

    await act(async () => container.querySelector('.history-open').click());
    expect(onOpen).toHaveBeenCalledWith(entry);

    await act(async () => root.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
});
