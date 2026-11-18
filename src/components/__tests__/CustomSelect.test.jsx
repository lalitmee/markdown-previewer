import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CustomSelect from '../CustomSelect';
let host, root, onChange;
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  onChange = vi.fn();
  await act(async () =>
    root.render(
      createElement(CustomSelect, {
        label: 'Sort files',
        value: 'a',
        options: [
          { value: 'a', label: 'A–Z' },
          { value: 'z', label: 'Z–A' },
        ],
        onChange,
      }),
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
it('opens, focuses the selected option, and selects with the keyboard', async () => {
  const trigger = host.querySelector('button');
  await act(async () =>
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    ),
  );
  expect(document.activeElement.getAttribute('aria-selected')).toBe('true');
  await act(async () =>
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    ),
  );
  expect(document.activeElement.textContent).toBe('Z–A');
  await act(async () => document.activeElement.click());
  expect(onChange).toHaveBeenCalledWith('z');
  expect(host.querySelector('[role="listbox"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it('dismisses on Escape and outside pointer events', async () => {
  const trigger = host.querySelector('button');
  await act(async () => trigger.click());
  await act(async () =>
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    ),
  );
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  await act(async () => trigger.click());
  await act(async () =>
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })),
  );
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
