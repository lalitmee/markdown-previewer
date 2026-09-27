import { describe, it, expect } from 'vitest';
import {
  extractMermaidFences,
  renderMarkdown,
} from '../markdown';

describe('extractMermaidFences', () => {
  it('replaces mermaid fences with placeholders and collects diagrams', () => {
    const src = '# Hi\n\n```mermaid\ngraph LR\nA-->B\n```\n\ntext';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toEqual(['graph LR\nA-->B']);
    expect(text).not.toMatch(/```mermaid/);
    expect(text).toContain('@@MERMAID_0@@');
  });

  it('handles multiple diagrams with distinct indices', () => {
    const src = '```mermaid\nflowchart A\n```\n\n```mermaid\nflowchart B\n```';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toHaveLength(2);
    expect(text).toContain('@@MERMAID_0@@');
    expect(text).toContain('@@MERMAID_1@@');
  });

  it('leaves text unchanged when no mermaid fences', () => {
    const src = '# plain\n\n```js\nconsole.log(1)\n```';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toEqual([]);
    expect(text).toBe(src);
  });

  it('detects bare unfenced flowchart diagrams', () => {
    const src = 'flowchart TD\n  A["React 18"] --> B["No events"]\n  B --> C["pain"]';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]).toContain('flowchart TD');
    expect(diagrams[0]).toContain('A["React 18"] --> B');
    expect(text).toContain('@@MERMAID_0@@');
  });

  it('detects diagram with a blank line after the type keyword', () => {
    const src = 'flowchart TD\n\n  A["start"] --> B["end"]';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]).toContain('A["start"] --> B["end"]');
    expect(text).toContain('@@MERMAID_0@@');
  });

  it('detects node-only flags without edges and keeps trailing prose', () => {
    const src = 'flowchart TD\n  A["one"]\n  B["two"]\n\nplain prose after';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toHaveLength(1);
    expect(text).toContain('@@MERMAID_0@@');
    expect(text).toContain('plain prose after');
  });

  it('stops the diagram before non-diagram prose', () => {
    const src = 'flowchart TD\n  A --> B\n\nThese are some notes about the flow.';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]).not.toContain('These are');
    expect(text).toContain('These are some notes');
  });

  it('does not treat prose starting with a diagram word as a diagram', () => {
    const { text, diagrams } = extractMermaidFences('graph theory is fun to study');
    expect(diagrams).toEqual([]);
    expect(text).toBe('graph theory is fun to study');
  });

  it('detects a bare diagram wrapped in an unlabeled code fence', () => {
    const src = 'intro paragraph\n\n```\nflowchart TD\n  expA["getEligible(VARIANT, A)"] --> props\n  props --> checked{"variant?"}\n  checked -->|yes| icon["WISHLIST_ICON heart SVG"]\n```\n\noutro paragraph';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]).toContain('flowchart TD');
    expect(diagrams[0]).toContain('checked{"variant?"}');
    expect(text).toContain('@@MERMAID_0@@');
    expect(text).toContain('intro paragraph');
    expect(text).toContain('outro paragraph');
  });

  it('leaves real code blocks (non-diagram first line) inside unlabeled fences untouched', () => {
    const src = '```\nconst graph = buildGraph();\ngraph.nodes.load();\n```';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toEqual([]);
    expect(text).toContain('const graph = buildGraph();');
  });

  it('still skips content inside labeled code fences', () => {
    const src = '```js\nflowchart TD\n  A --> B\n```';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toEqual([]);
    expect(text).toContain('flowchart TD');
  });

  it('does not detect inside code fences', () => {
    const src = '```js\nconst graph = 1; // -->\n```';
    const { text, diagrams } = extractMermaidFences(src);
    expect(diagrams).toEqual([]);
    expect(text).toBe(src);
  });
});

describe('renderMarkdown', () => {
  it('renders GFM table and task lists', async () => {
    const html = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done');
    expect(html).toContain('<table>');
    expect(html).toContain('type="checkbox"');
  });

  it('sanitizes script tags', async () => {
    const html = await renderMarkdown('<script>alert(1)</script># hi');
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('hi');
  });

  it('renders mermaid diagrams into svg placeholders', async () => {
    const html = await renderMarkdown('```mermaid\ngraph LR\nA-->B\n```');
    expect(html).toContain('<svg');
    expect(html).not.toMatch(/@@MERMAID/);
  });

  it('highlights code blocks', async () => {
    const html = await renderMarkdown('```js\nconst a = 1;\n```');
    expect(html).toContain('hljs');
  });
});