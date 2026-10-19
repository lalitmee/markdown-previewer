import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import TopBar from './components/TopBar';
import Picker from './components/Picker';
import PasteEditor from './components/PasteEditor';
import Library from './components/Library';
import Preview from './components/Preview';
import HistorySection from './components/HistorySection';
import SettingsPage from './components/SettingsPage';
import ProcessingStatus from './components/ProcessingStatus';
import { createHistory } from './lib/history';
import { DEFAULT_EXCLUDES, parseRules } from './lib/excludes';
import { contrastForeground } from './lib/accent';
import { isMarkdownName } from './lib/search';
import { buildStandaloneHtml, downloadPdf } from './lib/documentExport';
import {
  pickSingleFile,
  pickFolder,
  requestPermission,
  listMdFiles,
  readFileText,
  saveFileText,
} from './lib/fs-access';

const history = createHistory();
const THEME_KEY = 'mdpv-theme';
const ACCENT_KEY = 'mdpv-accent';
const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const FONT_KEY = 'mdpv-editor-font';
const WIDTH_KEY = 'mdpv-width';
const VIEWMODE_KEY = 'mdpv-viewmode';
const SCOPE_KEY = 'mdpv-searchscope';
const EXCLUDES_KEY = 'mdpv-excludes';
const HISTORY_LIMIT_KEY = 'mdpv-history-limit';
const HISTORY_LIMIT_OPTIONS = [5, 10, 20, 50];
const FONT_OPTIONS = [
  { label: 'Monospace (default)', value: MONO_STACK },
  { label: 'Menlo', value: 'Menlo, monospace' },
  { label: 'SF Mono', value: '"SF Mono", Menlo, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Fira Code', value: '"Fira Code", Menlo, monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", Menlo, monospace' },
  { label: 'Iosevka', value: 'Iosevka, monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  {
    label: 'Google Sans Flex',
    value: "'Google Sans Flex', 'Google Sans', Roboto, sans-serif",
  },
  { label: 'Georgia', value: 'Georgia, serif' },
];
const WIDTH_OPTIONS = [
  { key: 'normal', label: 'Normal', px: '860px' },
  { key: 'wide', label: 'Wide', px: '1140px' },
  { key: 'wider', label: 'Wider', px: '1500px' },
];

function loadStored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
}

function loadExcludes() {
  const raw = loadStored(EXCLUDES_KEY, '');
  if (!raw) return DEFAULT_EXCLUDES;
  return parseRules(raw);
}

function loadHistoryLimit() {
  const limit = Number(loadStored(HISTORY_LIMIT_KEY, '20'));
  return HISTORY_LIMIT_OPTIONS.includes(limit) ? limit : 20;
}

function transitionPage(update, direction) {
  if (
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update();
    return;
  }

  document.documentElement.dataset.navigation = direction;
  const transition = document.startViewTransition(() => flushSync(update));
  transition.finished.then(
    () => {
      delete document.documentElement.dataset.navigation;
    },
    () => {
      delete document.documentElement.dataset.navigation;
    },
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => loadStored(THEME_KEY, 'system'));
  const [accent, setAccent] = useState(
    () => loadStored(ACCENT_KEY, '') || null,
  );
  const [view, setView] = useState(() =>
    window.location.pathname === '/settings' ? 'settings' : 'picker',
  ); // picker | paste | library | preview | settings
  const [folder, setFolder] = useState(null); // { name, handle }
  const [files, setFiles] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(loadHistoryLimit);
  const historyLimitRef = useRef(historyLimit);
  const [active, setActive] = useState(null); // { name, path, handle }
  const [activeRevision, setActiveRevision] = useState(0);
  const [tableState, setTableState] = useState({});
  const [text, setText] = useState('');
  const [pastedDraft, setPastedDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [activity, setActivity] = useState(null);
  const [indexed, setIndexed] = useState(0);
  const [mode, setMode] = useState('preview'); // preview | edit
  const [editorFont, setEditorFont] = useState(() =>
    loadStored(FONT_KEY, MONO_STACK),
  );
  const [widthMode, setWidthMode] = useState(() =>
    loadStored(WIDTH_KEY, 'normal'),
  );
  const [viewMode, setViewMode] = useState(() =>
    loadStored(VIEWMODE_KEY, 'grid'),
  ); // grid | list
  const [scope, setScope] = useState(() => loadStored(SCOPE_KEY, 'name')); // name | content
  const [excludes, setExcludes] = useState(loadExcludes);
  const [query, setQuery] = useState('');
  const [showRecents, setShowRecents] = useState(false);
  const cacheRef = useRef(new Map());
  const settingsReturnRef = useRef('picker');
  const settingsEntryRef = useRef(false);
  const initialHistoryLimitRef = useRef(historyLimit);
  const viewRef = useRef(view);
  const historyLimitRequestRef = useRef(0);
  const operationIdRef = useRef(0);
  const foregroundOperationRef = useRef(null);
  const previewActivityIdRef = useRef(null);
  viewRef.current = view;

  const onPreviewProcessingChange = useCallback((next) => {
    if (foregroundOperationRef.current !== null) return;
    if (next) {
      previewActivityIdRef.current = next.id;
      setActivity(next);
      return;
    }
    const id = previewActivityIdRef.current;
    setActivity((current) => (current?.id === id ? null : current));
    previewActivityIdRef.current = null;
  }, []);

  function startOperation(message) {
    const id = ++operationIdRef.current;
    foregroundOperationRef.current = id;
    setNotice('');
    setActivity({ id, message });
    return id;
  }

  function isCurrentOperation(id) {
    return operationIdRef.current === id;
  }

  function updateOperation(id, next) {
    if (!isCurrentOperation(id)) return false;
    setActivity({ id, ...next });
    return true;
  }

  function finishOperation(id) {
    if (isCurrentOperation(id)) {
      foregroundOperationRef.current = null;
      setActivity(null);
    }
  }

  function cancelOperation() {
    operationIdRef.current += 1;
    foregroundOperationRef.current = null;
    setActivity(null);
  }

  useEffect(() => {
    function onPopState() {
      cancelOperation();
      const isSettings = window.location.pathname === '/settings';
      if (isSettings) {
        if (viewRef.current !== 'settings')
          settingsReturnRef.current = viewRef.current;
        settingsEntryRef.current = Boolean(window.history.state?.mdpvSettings);
        transitionPage(() => setView('settings'), 'forward');
      } else {
        settingsEntryRef.current = false;
        transitionPage(() => setView(settingsReturnRef.current), 'back');
      }
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
    };
    apply();
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'system') mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (accent) {
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-fg', contrastForeground(accent));
    } else {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-fg');
    }
    try {
      localStorage.setItem(ACCENT_KEY, accent || '');
    } catch (_) {
      /* ignore */
    }
  }, [accent]);

  useEffect(() => {
    history
      .trim(initialHistoryLimitRef.current)
      .then(setHistoryList)
      .catch(() =>
        history
          .list(initialHistoryLimitRef.current)
          .then(setHistoryList)
          .catch(() => {}),
      );
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  function goHome() {
    const wasSettings = viewRef.current === 'settings';
    cancelOperation();
    if (active?.source === 'paste') setPastedDraft(text);
    if (window.location.pathname === '/settings') {
      window.history.replaceState({}, '', '/');
      settingsEntryRef.current = false;
    }
    settingsReturnRef.current = 'picker';
    const update = () => {
      setView('picker');
      setFolder(null);
      setFiles([]);
      cacheRef.current = new Map();
      setActive(null);
      setQuery('');
    };
    if (wasSettings || viewRef.current === 'paste')
      transitionPage(update, wasSettings ? 'back' : 'paste-back');
    else update();
  }

  function pickViewMode(v) {
    setViewMode(v);
    try {
      localStorage.setItem(VIEWMODE_KEY, v);
    } catch (_) {
      /* ignore */
    }
  }

  function pickScope(s) {
    setScope(s);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch (_) {
      /* ignore */
    }
  }

  function openSettings() {
    cancelOperation();
    if (view !== 'settings') {
      settingsReturnRef.current = view;
      if (window.location.pathname !== '/settings') {
        window.history.pushState({ mdpvSettings: true }, '', '/settings');
        settingsEntryRef.current = true;
      }
    }
    transitionPage(() => setView('settings'), 'forward');
  }

  function closeSettings() {
    cancelOperation();
    if (settingsEntryRef.current && window.location.pathname === '/settings') {
      settingsEntryRef.current = false;
      window.history.back();
    } else {
      if (window.location.pathname === '/settings')
        window.history.replaceState({}, '', '/');
      transitionPage(() => setView(settingsReturnRef.current), 'back');
    }
  }

  async function applyExcludes(next) {
    setExcludes(next);
    try {
      localStorage.setItem(EXCLUDES_KEY, JSON.stringify(next));
    } catch (_) {
      /* ignore */
    }
    if (folder && folder.handle) {
      try {
        setFiles(await listMdFiles(folder.handle, next));
      } catch (_) {
        /* keep current list if the rescan fails */
      }
    }
  }

  async function loadFolder(handle, name, id) {
    updateOperation(id, { message: `Scanning folder: ${name}` });
    const md = await listMdFiles(handle, excludes);
    if (!isCurrentOperation(id)) return;

    cacheRef.current = new Map();
    const cache = cacheRef.current;
    setFolder({ name, handle });
    setFiles(md);
    setActive(null);
    transitionView('library');
    setIndexed(0);
    if (md.length) {
      updateOperation(id, {
        message: 'Loading Markdown',
        current: 0,
        total: md.length,
      });
    }
    for (let i = 0; i < md.length; i++) {
      const f = md[i];
      try {
        const markdown = await readFileText(f.handle);
        if (cacheRef.current !== cache) return;
        cache.set(f.path, markdown);
      } catch (_) {
        if (cacheRef.current !== cache) return;
        /* skip unreadable */
      }
      setIndexed(i + 1);
      updateOperation(id, {
        message: 'Loading Markdown',
        current: i + 1,
        total: md.length,
      });
    }
  }

  async function openEntry(entry) {
    cancelOperation();
    let t = cacheRef.current.get(entry.path);
    if (!cacheRef.current.has(entry.path)) {
      const id = startOperation(`Reading file: ${entry.name}`);
      try {
        t = await readFileText(entry.handle);
      } catch (_) {
        if (isCurrentOperation(id))
          setNotice('Could not open the selected file.');
        finishOperation(id);
        return;
      }
      if (!isCurrentOperation(id)) return;
      cacheRef.current.set(entry.path, t);
      finishOperation(id);
    }
    if (folder) {
      const location = folder.name + (entry.path ? '/' + entry.path : '');
      persistHistory(entry.handle, location);
    } else {
      persistHistory(entry.handle);
    }
    setActive(entry);
    setActiveRevision((revision) => revision + 1);
    setTableState({});
    setText(t);
    setView('preview');
  }

  async function onPickFolder() {
    let id;
    flushSync(() => {
      id = startOperation('Select a folder and allow browser access…');
      setActivity({
        id,
        message: 'Select a folder and allow browser access…',
        immediate: true,
      });
    });
    try {
      const handle = await pickFolder();
      if (!handle) return;
      updateOperation(id, { message: `Scanning folder: ${handle.name}` });
      persistHistory(handle);
      await loadFolder(handle, handle.name, id);
    } catch (_) {
      if (isCurrentOperation(id))
        setNotice('Could not open the selected folder.');
    } finally {
      finishOperation(id);
    }
  }

  async function onPickSingleFile() {
    const handle = await pickSingleFile();
    if (!handle) return;
    const id = startOperation(`Reading file: ${handle.name}`);
    try {
      const t = await readFileText(handle);
      if (!isCurrentOperation(id)) return;
      persistHistory(handle);
      setFolder(null);
      setFiles([]);
      cacheRef.current = new Map([[handle.name, t]]);
      setActive({ name: handle.name, path: handle.name, handle });
      setActiveRevision((revision) => revision + 1);
      setTableState({});
      setText(t);
      setView('preview');
    } catch (_) {
      if (isCurrentOperation(id))
        setNotice('Could not open the selected file.');
    } finally {
      finishOperation(id);
    }
  }

  async function onDropEntry(handlePromise, fallbackFile) {
    const id = startOperation('Opening dropped item');
    try {
      const handle = await handlePromise;
      if (!isCurrentOperation(id)) return;
      if (handle?.kind === 'directory') {
        persistHistory(handle);
        await loadFolder(handle, handle.name, id);
        return;
      }
      const file =
        handle?.kind === 'file' ? await handle.getFile() : fallbackFile;
      if (!isCurrentOperation(id)) return;
      if (!file) {
        setNotice('This browser cannot open the dropped folder.');
        return;
      }
      if (!isMarkdownName(file.name)) {
        setNotice('Drop a Markdown file or a folder.');
        return;
      }
      updateOperation(id, { message: `Reading file: ${file.name}` });
      const markdown = await file.text();
      if (!isCurrentOperation(id)) return;
      if (handle) persistHistory(handle);
      setFolder(null);
      setFiles([]);
      cacheRef.current = new Map();
      setActive({
        name: file.name,
        path: file.name,
        handle: handle || null,
        source: 'drop',
      });
      setActiveRevision((revision) => revision + 1);
      setTableState({});
      setText(markdown);
      setMode('preview');
      setView('preview');
    } catch (_) {
      if (isCurrentOperation(id)) setNotice('Could not open the dropped item.');
    } finally {
      finishOperation(id);
    }
  }

  function onPreviewPastedMarkdown() {
    if (!pastedDraft.trim()) return;
    setFolder(null);
    setFiles([]);
    cacheRef.current = new Map();
    setActive({
      name: 'Pasted Markdown',
      path: '',
      handle: null,
      source: 'paste',
    });
    setActiveRevision((revision) => revision + 1);
    setTableState({});
    setText(pastedDraft);
    setMode('preview');
    setView('preview');
  }

  async function persistHistory(handle, location) {
    const request = historyLimitRequestRef.current;
    try {
      await history.add(handle, location, historyLimitRef.current);
    } catch (_) {
      /* persistence is best-effort */
    }
    if (request !== historyLimitRequestRef.current) return;
    try {
      const rows = await history.list(historyLimitRef.current);
      if (request === historyLimitRequestRef.current) setHistoryList(rows);
    } catch (_) {
      /* ignore */
    }
  }

  async function pickHistoryLimit(limit) {
    if (!HISTORY_LIMIT_OPTIONS.includes(limit)) return;
    const request = ++historyLimitRequestRef.current;
    historyLimitRef.current = limit;
    setHistoryLimit(limit);
    try {
      localStorage.setItem(HISTORY_LIMIT_KEY, String(limit));
    } catch (_) {
      /* ignore */
    }
    try {
      const rows = await history.trim(limit);
      if (request === historyLimitRequestRef.current) setHistoryList(rows);
    } catch (_) {
      try {
        const rows = await history.list(limit);
        if (request === historyLimitRequestRef.current) setHistoryList(rows);
      } catch (_) {
        /* ignore */
      }
    }
  }

  function transitionView(nextView) {
    if (viewRef.current === 'settings') {
      settingsReturnRef.current = nextView;
      if (
        settingsEntryRef.current &&
        window.location.pathname === '/settings'
      ) {
        settingsEntryRef.current = false;
        window.history.back();
        return;
      }
      if (window.location.pathname === '/settings')
        window.history.replaceState({}, '', '/');
      transitionPage(() => setView(nextView), 'back');
      return;
    }
    setView(nextView);
  }

  async function onRemoveHistory(entry) {
    try {
      await history.remove(entry.name);
      setHistoryList((rows) => rows.filter((row) => row.name !== entry.name));
    } catch (_) {
      setNotice('Could not remove recent item.');
    }
  }

  async function onOpenHistory(h) {
    const id = startOperation(`Opening recent item: ${h.name}`);
    try {
      const granted = await requestPermission(h.handle);
      if (!isCurrentOperation(id)) return;
      if (!granted) {
        setActivity(null);
        setNotice('Permission denied. Re-pick the folder or file.');
        transitionView('picker');
        return;
      }
      if (h.kind === 'directory') {
        await loadFolder(h.handle, h.name, id);
      } else {
        updateOperation(id, { message: `Reading file: ${h.name}` });
        const markdown = await readFileText(h.handle);
        if (!isCurrentOperation(id)) return;
        setFolder(null);
        setFiles([]);
        cacheRef.current = new Map();
        setActive({ name: h.name, path: h.name, handle: h.handle });
        setActiveRevision((revision) => revision + 1);
        setTableState({});
        setText(markdown);
        persistHistory(h.handle, h.location);
        transitionView('preview');
      }
    } catch (_) {
      if (isCurrentOperation(id)) setNotice('Could not open the recent item.');
    } finally {
      finishOperation(id);
    }
  }

  async function onSave(markdown) {
    if (
      !active ||
      !active.handle ||
      typeof active.handle.createWritable !== 'function'
    )
      return;
    try {
      await saveFileText(active.handle, markdown);
      setNotice('Saved ✓');
    } catch (err) {
      setNotice('Save failed: ' + (err && err.message));
    }
  }

  function onBack() {
    cancelOperation();
    const wasPasted = active?.source === 'paste';
    if (wasPasted) setPastedDraft(text);
    setActive(null);
    transitionView(wasPasted ? 'paste' : folder ? 'library' : 'picker');
  }

  const canSave = () =>
    active &&
    active.handle &&
    typeof active.handle.createWritable === 'function';

  function pickFont(v) {
    setEditorFont(v);
    try {
      localStorage.setItem(FONT_KEY, v);
    } catch (_) {
      /* ignore */
    }
  }

  function cycleWidth() {
    setWidthMode((w) => {
      const next =
        WIDTH_OPTIONS[
          (WIDTH_OPTIONS.findIndex((o) => o.key === w) + 1) %
            WIDTH_OPTIONS.length
        ];
      try {
        localStorage.setItem(WIDTH_KEY, next.key);
      } catch (_) {
        /* ignore */
      }
      return next.key;
    });
  }

  async function exportHtml() {
    try {
      const html = await buildStandaloneHtml({
        text,
        theme,
        folderHandle: folder?.handle || null,
        activePath: active?.path || '',
        title: active?.name || '',
      });
      const title = new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector('title')?.textContent;
      const filename = (title || active?.name || 'Untitled document')
        .replace(/[\\/:*?"<>|]/g, '-')
        .trim();
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename || 'Untitled document'}.html`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(`Export failed: ${error.message || error}`);
    }
  }

  async function exportPdf() {
    try {
      const html = await buildStandaloneHtml({
        text,
        theme,
        folderHandle: folder?.handle || null,
        activePath: active?.path || '',
        title: active?.name || '',
      });
      const title =
        new DOMParser()
          .parseFromString(html, 'text/html')
          .querySelector('title')?.textContent ||
        active?.name ||
        'Untitled document';
      await downloadPdf({ html, title });
    } catch (error) {
      setNotice(`PDF export failed: ${error.message || error}`);
    }
  }

  const doc =
    view === 'preview' && active
      ? {
          title: active.name,
          onBack,
          mode,
          onMode: setMode,
          font: editorFont,
          onFont: pickFont,
          fontOptions: FONT_OPTIONS,
          widthLabel: (
            WIDTH_OPTIONS.find((o) => o.key === widthMode) || WIDTH_OPTIONS[0]
          ).label,
          widthIcon:
            { normal: 'width', wide: 'width_wide', wider: 'width_full' }[
              widthMode
            ] || 'width',
          onWidth: cycleWidth,
          canSave: canSave(),
          onSave: () => onSave(text),
          onExportHtml: exportHtml,
          onExportPdf: exportPdf,
        }
      : null;

  return (
    <div className="app">
      <div className="app-sticky-header">
        <TopBar
          doc={doc}
          onHome={goHome}
          hasRecents={historyList.length > 0}
          onRecents={() => setShowRecents(true)}
          onSettings={view === 'settings' ? closeSettings : openSettings}
          settingsActive={view === 'settings'}
          library={
            view === 'library'
              ? {
                  query,
                  onQuery: setQuery,
                  viewMode,
                  onViewMode: pickViewMode,
                  scope,
                  onScope: pickScope,
                }
              : null
          }
        />
        <ProcessingStatus activity={activity} />
      </div>

      <div className="app-content" aria-busy={Boolean(activity)}>
        {view === 'picker' && (
          <Picker
            onPickFile={onPickSingleFile}
            onPickFolder={onPickFolder}
            onPaste={() => {
              cancelOperation();
              transitionPage(() => setView('paste'), 'paste-forward');
            }}
            onDropEntry={onDropEntry}
            onDropError={(message) => {
              cancelOperation();
              setNotice(message);
            }}
          />
        )}

        {view === 'paste' && (
          <PasteEditor
            draft={pastedDraft}
            onDraftChange={setPastedDraft}
            onPreview={onPreviewPastedMarkdown}
          />
        )}

        {view === 'library' && (
          <Library
            key={folder ? folder.name : 'lib'}
            files={files}
            folderName={folder ? folder.name : ''}
            cache={cacheRef.current}
            indexed={indexed}
            query={query}
            scope={scope}
            viewMode={viewMode}
            onOpen={openEntry}
          />
        )}

        {view === 'settings' && (
          <SettingsPage
            rules={excludes}
            theme={theme}
            accent={accent}
            historyLimit={historyLimit}
            onThemeSelect={setTheme}
            onAccentSelect={setAccent}
            onHistoryLimitSelect={pickHistoryLimit}
            onAdd={(rule) => applyExcludes([...excludes, rule])}
            onRemove={(i) => applyExcludes(excludes.filter((_, j) => j !== i))}
            onReset={() => applyExcludes(DEFAULT_EXCLUDES)}
          />
        )}

        {view === 'preview' && (
          <Preview
            key={activeRevision}
            entry={active}
            text={text}
            onNotice={setNotice}
            onProcessingChange={onPreviewProcessingChange}
            setText={setText}
            tableState={tableState}
            setTableState={setTableState}
            theme={theme}
            folderHandle={folder ? folder.handle : null}
            mode={mode}
            editorFont={editorFont}
            widthVar={
              (
                WIDTH_OPTIONS.find((o) => o.key === widthMode) ||
                WIDTH_OPTIONS[0]
              ).px
            }
          />
        )}
      </div>

      {showRecents && (
        <div
          className="drawer-backdrop"
          onClick={() => setShowRecents(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`recents-drawer ${showRecents ? 'open' : ''}`}
        aria-label="Recent files and folders"
      >
        <div className="drawer-header">
          <h2 className="drawer-title">Recent</h2>
          <button
            className="drawer-close"
            onClick={() => setShowRecents(false)}
            aria-label="Close recent list"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <div className="drawer-content">
          <HistorySection
            history={historyList}
            onOpen={(h) => {
              setShowRecents(false);
              onOpenHistory(h);
            }}
            onRemove={onRemoveHistory}
          />
        </div>
      </aside>

      {notice && (
        <div className="toast" onClick={() => setNotice('')}>
          {notice}
        </div>
      )}
    </div>
  );
}
