import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import Picker from '../Picker';

it('renders home actions with font-independent icons', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () =>
      root.render(
        createElement(Picker, {
          onPickFile: vi.fn(),
          onPickFolder: vi.fn(),
          onPaste: vi.fn(),
          onDropEntry: vi.fn(),
          onDropError: vi.fn(),
        }),
      ),
    );
    expect(host.querySelectorAll('.dz-actions button')).toHaveLength(3);
    expect(host.querySelectorAll('.dz-actions button svg')).toHaveLength(3);
    expect(
      host.querySelectorAll('.dz-actions .material-symbols-outlined'),
    ).toHaveLength(0);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
