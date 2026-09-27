import { vi } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id, code) => ({
      svg: `<svg id="${id}"><text>${code}</text></svg>`,
    })),
  },
}));

// jsdom lacks these for mermaid's paranoid globals; we mock mermaid anyway.
globalThis.DOMMatrix = globalThis.DOMMatrix || class {};
globalThis.SVGElement = globalThis.SVGElement || class {};