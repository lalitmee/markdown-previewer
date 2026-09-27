import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { escapeHtml } from './search';
import { parsePlan, planToHtml } from './plan';

let initializedTheme = null;

const DIAGRAM_TYPES = [
  'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'classDiagram-v2',
  'stateDiagram-v2', 'stateDiagram', 'erDiagram', 'gantt', 'journey', 'pie',
  'requirementDiagram', 'gitGraph', 'mindmap', 'timeline', 'quadrantChart',
  'C4Context', 'C4Container', 'C4Component', 'C4Deployment', 'C4Dynamic',
  'sankey-beta', 'xychart-beta', 'block-beta', 'architecture-beta',
  'packet-beta', 'kanban',
];
const DIAGRAM_TYPE_RE = new RegExp(`^(${DIAGRAM_TYPES.join('|')})\\s`, 'i');
const DIAGRAM_LINE_RE = /-->|==>|\.->|--x|--o|o--|~~~|->>|:::|\["|\[\{|\[\(|^\s*\w+\s*[\[({]/;

export function extractMermaidFences(src) {
  const diagrams = [];
  let text = String(src).replace(/```mermaid[ \t]*\r?\n([\s\S]*?)```/g, (m, code) => {
    diagrams.push(code.trim());
    return '\n\n@@MERMAID_' + (diagrams.length - 1) + '@@\n\n';
  });

  // Bare, unfenced diagrams: a line starting with a diagram type, followed by
  // node/edge syntax. Expands across blank lines while the next content still
  // looks like diagram syntax; stops before plain prose.
  const lines = text.split('\n');
  const out = [];
  let inFence = false;
  for (let i = 0; i < lines.length; ) {
    const trimmed = lines[i].trim();
    const isFence = /^(```+|~~~+)/.test(trimmed);
    if (isFence) {
      if (!inFence && /^(```+|~~~+)\s*$/.test(trimmed)) {
        // Unlabeled code fence — may hold a bare diagram that was copied out
        // of another tool. If its first line is a diagram type, treat the
        // whole fence as one diagram.
        let j = i + 1;
        const inner = [];
        let first = null;
        while (j < lines.length && !/^(```+|~~~+)/.test(lines[j].trim())) {
          const t = lines[j].trim();
          if (t && first === null) first = t;
          inner.push(lines[j]);
          j++;
        }
        if (j < lines.length && first && DIAGRAM_TYPE_RE.test(first) && first.split(/\s+/).length >= 2) {
          diagrams.push(inner.join('\n').trim());
          out.push('\n\n@@MERMAID_' + (diagrams.length - 1) + '@@\n\n');
          i = j + 1;
          continue;
        }
      }
      inFence = !inFence;
      out.push(lines[i]); i++; continue;
    }
    if (!inFence && DIAGRAM_TYPE_RE.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
      const blockLines = [lines[i]];
      let j = i + 1;
      let diagramLine = false;
      while (j < lines.length) {
        const t = lines[j].trim();
        if (!t) {
          let k = j;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k >= lines.length) break;
          if (!DIAGRAM_LINE_RE.test(lines[k].trim())) break;
          diagramLine = true;
          while (j <= k) { blockLines.push(lines[j]); j++; }
          continue;
        }
        if (DIAGRAM_LINE_RE.test(t)) diagramLine = true;
        blockLines.push(lines[j]);
        j++;
      }
      if (blockLines.length > 1 && diagramLine) {
        diagrams.push(blockLines.join('\n').trim());
        out.push('\n\n@@MERMAID_' + (diagrams.length - 1) + '@@\n\n');
        i = j;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }
  text = out.join('\n');

  return { text, diagrams };
}

/**
 * Render markdown with GFM, sanitize against XSS, render mermaid diagrams
 * (lazy-loaded) and highlight code blocks. Returns an HTML string.
 */
export async function renderMarkdown(text, theme = 'light') {
  const plan = parsePlan(text);
  if (plan) {
    let html = DOMPurify.sanitize(planToHtml(plan));
    if (plan.rest) html += DOMPurify.sanitize(marked.parse(plan.rest, { gfm: true, breaks: true }));
    return html;
  }
  const { text: body, diagrams } = extractMermaidFences(text);
  const raw = marked.parse(body, { gfm: true, breaks: true });
  let html = DOMPurify.sanitize(raw);

  let mermaidLib = null;
  if (diagrams.length) {
    mermaidLib = (await import('mermaid')).default;
    if (initializedTheme !== theme) {
      mermaidLib.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default' });
      initializedTheme = theme;
    }
  }

  const replacements = {};
  for (let i = 0; i < diagrams.length; i++) {
    const key = '@@MERMAID_' + i + '@@';
    try {
      const r = await mermaidLib.render('mdpv-m-' + i + '-' + theme, diagrams[i]);
      const svg = (r && r.svg) ? r.svg : '';
      replacements[key] = svg ? '<div class="mdiagram">' + svg + '</div>' : `<pre class="mermaid-error">Diagram failed to render:\n${escapeHtml(diagrams[i])}</pre>`;
    } catch (_) {
      replacements[key] = `<pre class="mermaid-error">Diagram failed to render:\n${escapeHtml(diagrams[i])}</pre>`;
    }
  }
  for (const [k, v] of Object.entries(replacements)) {
    html = html.split(k).join(v);
  }

  html = await highlightCode(html);
  return html;
}

async function highlightCode(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  const codes = container.querySelectorAll('pre code');
  if (!codes.length) return html;
  const hljsMod = await import('highlight.js');
  const hljs = hljsMod.default || hljsMod;
  codes.forEach((el) => {
    const langGuess = (el.className || '').replace(/^language-/, '').trim();
    try {
      const lang = langGuess && hljs.getLanguage(langGuess);
      if (lang) el.innerHTML = hljs.highlight(el.textContent, { language: langGuess }).value;
      else el.innerHTML = hljs.highlightAuto(el.textContent).value;
      el.classList.add('hljs');
    } catch (_) {
      // leave block as-is
    }
  });
  return container.innerHTML;
}