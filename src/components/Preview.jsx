import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { renderMarkdown } from '../lib/markdown';
import { inlineImages } from '../lib/fs-access';
import { applyTableState, decorateTables } from '../lib/tableColumns';
import TableModal from './TableModal';
import ZoomModal from './ZoomModal';

export default function Preview({
  entry,
  text,
  setText,
  tableState,
  setTableState,
  theme,
  folderHandle,
  mode,
  editorFont,
  widthVar,
}) {
  const [html, setHtml] = useState('');
  const [zoomSvg, setZoomSvg] = useState(null);
  const [expandedTable, setExpandedTable] = useState(null);
  const previewRef = useRef(null);

  const expandedHtml = useMemo(() => {
    if (expandedTable === null) return '';
    const source = document.createElement('div');
    source.innerHTML = html;
    return (
      source.querySelectorAll('table')[expandedTable.index]?.outerHTML || ''
    );
  }, [html, expandedTable]);

  const fontTheme = EditorView.theme({
    '.cm-content': { fontFamily: editorFont },
  });
  const extensions = [markdown(), fontTheme];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rendered = await renderMarkdown(text, theme);
      const inlined = await inlineImages(
        rendered,
        folderHandle,
        entry ? entry.path : '',
      );
      if (!cancelled) setHtml(inlined);
    })();
    return () => {
      cancelled = true;
    };
  }, [text, theme, entry, folderHandle]);

  // Structural pass: rebuild handles/colgroup/rail on the fresh DOM. Keyed on
  // html + mode only, so a column drag never rebuilds the handles it holds.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current
      .querySelectorAll('.preview-document .md-body')
      .forEach((body) => decorateTables(body, { interactive: false }));
  }, [html, mode]);

  // Apply pass: cheap, runs after the structural pass and on every state change.
  useEffect(() => {
    if (!previewRef.current) return;
    previewRef.current
      .querySelectorAll('.preview-document .md-body')
      .forEach((b) => applyTableState(b, tableState));
  }, [tableState, html, mode]);

  function onClick(e) {
    const diagram = e.target.closest('.mdiagram');
    if (diagram) {
      const svgChild = diagram.querySelector('svg');
      if (svgChild) {
        const clone = svgChild.cloneNode(true);
        clone.removeAttribute('style');
        setZoomSvg(clone.outerHTML);
      }
      return;
    }
    const expand = e.target.closest('.mp-expand');
    if (expand) {
      setExpandedTable({ index: Number(expand.dataset.t), opener: expand });
    }
  }

  return (
    <main
      className="preview-page"
      style={{ ['--md-maxw']: widthVar }}
      ref={previewRef}
      onClick={onClick}
    >
      <div className="preview-document">
        {mode === 'edit' ? (
          <div className="split">
            <div className="split-left">
              <CodeMirror
                value={text}
                onChange={(v) => setText(v)}
                extensions={extensions}
                theme={theme === 'dark' ? 'dark' : 'light'}
                height="100%"
              />
            </div>
            <div className="split-right">
              <div
                className="md-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        ) : (
          <div className="md-body" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>

      {expandedTable !== null && expandedHtml && (
        <TableModal
          tableHtml={expandedHtml}
          tableIndex={expandedTable.index}
          tableState={tableState}
          setTableState={setTableState}
          opener={expandedTable.opener}
          onClose={() => setExpandedTable(null)}
        />
      )}

      <ZoomModal svgHtml={zoomSvg} onClose={() => setZoomSvg(null)} />
    </main>
  );
}
