import { describe, it, expect } from 'vitest';
import { parsePlan, planToHtml } from '../plan';
import { renderMarkdown } from '../markdown';

const PLAN = `name: Cart wishlist icon fix
overview: The shopping bag wishlist icon is not controlled by a standalone wishlist flag.
todos:

id: rc-pdp-experiment
content: Add SEARCH_INP_ON_CART to remote-config/pdp/experiments/config.json
status: pending
id: rc-dweb-experiment
content: Add same block to dweb remoteConfig ABV2 array
status: in progress
id: dweb-header-wiring
content: Port mweb experiment + searchHandler wiring into dweb Header
status: completed
isProject: false`;

describe('parsePlan', () => {
  it('extracts name, overview and todos with statuses', () => {
    const p = parsePlan(PLAN);
    expect(p.title).toBe('Cart wishlist icon fix');
    expect(p.overview).toContain('wishlist icon');
    expect(p.todos).toHaveLength(3);
    expect(p.todos[0]).toEqual({ id: 'rc-pdp-experiment', content: 'Add SEARCH_INP_ON_CART to remote-config/pdp/experiments/config.json', status: 'pending' });
    expect(p.todos[2].status).toBe('completed');
  });

  it('excludes the isProject flag from todos and rest', () => {
    const p = parsePlan(PLAN);
    expect(p.todos.every((t) => t.content !== 'false')).toBe(true);
    expect(p.rest).toBe('');
  });

  it('captures content after the todos block as rest', () => {
    const p = parsePlan(PLAN + '\n\n## Next steps\n- File a follow-up for Safari support.');
    expect(p.rest).toContain('## Next steps');
    expect(p.rest).toContain('Safari support');
  });

  it('returns null for ordinary markdown', () => {
    expect(parsePlan('# Hello\n\nsome text')).toBeNull();
    expect(parsePlan('name: only a name')).toBeNull();
  });

  it('handles dash-bulleted and bolded todo keys', () => {
    const p = parsePlan(`name: Plan
overview: Desc.
todos:
- **id**: a
- **content**: Add thing
- **status**: completed
- **id**: b
  content: Second one
  status: in progress
isProject: false`);
    expect(p.todos).toHaveLength(2);
    expect(p.todos[0]).toEqual({ id: 'a', content: 'Add thing', status: 'completed' });
    expect(p.todos[1].content).toBe('Second one');
  });

  it('handles a UTF-8 BOM on the first line', () => {
    const p = parsePlan('\uFEFF' + PLAN);
    expect(p.title).toBe('Cart wishlist icon fix');
    expect(p.todos).toHaveLength(3);
  });
});

describe('planToHtml', () => {
  it('renders h1 title, overview and status boxes', () => {
    const html = planToHtml(parsePlan(PLAN));
    expect(html).toContain('<h1 class="plan-title">Cart wishlist icon fix</h1>');
    expect(html).toContain('plan-overview');
    expect(html).toContain('check_box_outline_blank');
    expect(html).toContain('indeterminate_check_box');
    expect(html).toContain('plan-todo done');
  });

  it('escapes content', () => {
    const html = planToHtml(parsePlan('name: x\noverview: y\ntodos:\nid: a\ncontent: <img src=x onerror=1>\nstatus: pending'));
    expect(html).not.toContain('<img');
  });
});

describe('renderMarkdown plan integration', () => {
  it('renders plan format as a plan block, not raw text', async () => {
    const html = await renderMarkdown(PLAN, 'light');
    expect(html).toContain('plan-title');
    expect(html).toContain('plan-todos');
    expect(html).not.toContain('@@MERMAID');
  });

  it('renders trailing content after todos as markdown', async () => {
    const html = await renderMarkdown(PLAN + '\n\n## Next steps\n\nSome more **context**.', 'light');
    expect(html).toContain('plan-todos');
    expect(html).toContain('<h2>Next steps</h2>');
    expect(html).toContain('<strong>context</strong>');
    expect(html).not.toContain('isProject');
  });

  it('leaves non-plan markdown to the normal pipeline', async () => {
    const html = await renderMarkdown('# Hi\n\n- item');
    expect(html).not.toContain('plan-title');
    expect(html).toContain('<h1');
  });
});
