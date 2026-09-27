import { escapeHtml } from './search';

const KEY_LINE = /^[ \t]*[-*+]*[ \t]*(\*\*)?([A-Za-z_][\w:]*?)(\*\*)?:[ \t]*(.*)$/;

/**
 * Detect and parse the Cursor plan format:
 *   name: ...
 *   overview: ...
 *   todos:
 *   id: ...
 *   content: ...
 *   status: pending|in progress|completed
 *   isProject: false
 * Tolerates optional leading bullets/indentation and **bolded** keys, since
 * Cursor's markdown export may render the todo fields as list items.
 * Returns { title, overview, todos: [{ id, content, status }] } or null.
 */
export function parsePlan(text) {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const nameM = src.match(/^[ \t]*name:[ \t]*(.+)$/m);
  if (!nameM) return null;
  const title = nameM[1].trim();

  const lines = src.split(/\r\n|\r|\n/);
  let overview = '';
  let inOverview = false;
  let inTodos = false;
  let hasTodos = false;
  let cur = null;
  const todos = [];
  const rest = [];

  const pushCur = () => { if (cur) { todos.push(cur); cur = null; } };

  for (const raw of lines) {
    const m = KEY_LINE.exec(raw);
    if (m) {
      const key = m[2].toLowerCase().replace(/:$/, '');
      const value = m[4];
      if (key === 'name') { inOverview = false; continue; }
      if (key === 'overview') { pushCur(); inTodos = false; inOverview = true; overview = value; continue; }
      if (key === 'todos') { pushCur(); inOverview = false; inTodos = true; hasTodos = true; continue; }
      if (inTodos && key === 'id') { pushCur(); cur = { id: value }; continue; }
      if (inTodos && key === 'content') { if (cur) cur.content = value; continue; }
      if (inTodos && key === 'status') { if (cur) cur.status = value; continue; }
      pushCur();
      inTodos = false;
      inOverview = false;
      if (key !== 'isproject') rest.push(raw);
      continue;
    }
    if (inTodos) {
      if (cur && raw.trim()) cur.content = (cur.content ? cur.content + ' ' : '') + raw.trim();
      continue;
    }
    if (inOverview && raw.trim()) overview += ' ' + raw.trim();
    else rest.push(raw);
  }
  pushCur();

  if (!overview && !todos.length) return null;
  return { title, overview: overview.trim(), todos, rest: rest.join('\n').trim() };
}

function statusMeta(status) {
  const s = String(status || 'pending').toLowerCase().trim();
  if (s === 'completed' || s === 'complete' || s === 'done') {
    return { cls: 'done', icon: 'check_box', label: status || 'completed' };
  }
  if (s === 'in progress' || s === 'in_progress' || s === 'inprogress' || s === 'doing') {
    return { cls: 'doing', icon: 'indeterminate_check_box', label: status || 'in progress' };
  }
  return { cls: 'todo', icon: 'check_box_outline_blank', label: status || 'pending' };
}

export function planToHtml(plan) {
  const todos = (plan.todos || []).map((t) => {
    const meta = statusMeta(t.status);
    return `<li class="plan-todo ${meta.cls}">
      <span class="material-symbols-outlined plan-check">${meta.icon}</span>
      <span class="plan-content">${escapeHtml(t.content || '')}</span>
      <span class="plan-status">${escapeHtml(meta.label)}</span>
    </li>`;
  }).join('');

  return `<div class="plan">
    <h1 class="plan-title">${escapeHtml(plan.title)}</h1>
    ${plan.overview ? `<p class="plan-overview">${escapeHtml(plan.overview)}</p>` : ''}
    ${todos ? `<ul class="plan-todos">${todos}</ul>` : ''}
  </div>`;
}
