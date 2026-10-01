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
      root.render(createElement(HistorySection, {
        history: [entry],
        onOpen,
        onRemove,
      }));
    });

    const removeButton = container.querySelector('[aria-label="Remove notes from recent"]');
    expect(removeButton).not.toBeNull();

    await act(async () => removeButton.click());

    expect(onRemove).toHaveBeenCalledWith(entry);
    expect(onOpen).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });
});
