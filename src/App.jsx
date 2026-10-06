import { useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import Picker from './components/Picker';
import Library from './components/Library';
import Preview from './components/Preview';
import HistorySection from './components/HistorySection';
import SettingsPage from './components/SettingsPage';
import { createHistory } from './lib/history';
import { DEFAULT_EXCLUDES, parseRules } from './lib/excludes';
import { contrastForeground } from './lib/accent';
import { isFsaSupported, pickSingleFile, pickFolder, requestPermission, listMdFiles, readFileText, saveFileText } from './lib/fs-access';

const history = createHistory();
const THEME_KEY = 'mdpv-theme';
const ACCENT_KEY = 'mdpv-accent';
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const FONT_KEY = 'mdpv-editor-font';
const WIDTH_KEY = 'mdpv-width';
const VIEWMODE_KEY = 'mdpv-viewmode';
const SCOPE_KEY = 'mdpv-searchscope';
const EXCLUDES_KEY = 'mdpv-excludes';
const FONT_OPTIONS = [
  { label: 'Monospace (default)', value: MONO_STACK },
  { label: 'Menlo', value: 'Menlo, monospace' },
  { label: 'SF Mono', value: '"SF Mono", Menlo, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Fira Code', value: '"Fira Code", Menlo, monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", Menlo, monospace' },
  { label: 'Iosevka', value: 'Iosevka, monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Google Sans Flex', value: "'Google Sans Flex', 'Google Sans', Roboto, sans-serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
];
const WIDTH_OPTIONS = [
  { key: 'normal', label: 'Normal', px: '860px' },
  { key: 'wide', label: 'Wide', px: '1140px' },
  { key: 'wider', label: 'Wider', px: '1500px' },
];

function loadStored(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
}

function loadExcludes() {
  const raw = loadStored(EXCLUDES_KEY, '');
  if (!raw) return DEFAULT_EXCLUDES;
  return parseRules(raw);
}

export default function App() {
  const [theme, setTheme] = useState(() => loadStored(THEME_KEY, 'light'));
  const [accent, setAccent] = useState(() => loadStored(ACCENT_KEY, '') || null);
  const [view, setView] = useState('picker'); // picker | library | preview
  const [folder, setFolder] = useState(null);   // { name, handle }
  const [files, setFiles] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [active, setActive] = useState(null);   // { name, path, handle }
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [indexed, setIndexed] = useState(0);
  const [mode, setMode] = useState('preview');  // preview | edit
  const [editorFont, setEditorFont] = useState(() => loadStored(FONT_KEY, MONO_STACK));
  const [widthMode, setWidthMode] = useState(() => loadStored(WIDTH_KEY, 'normal'));
  const [viewMode, setViewMode] = useState(() => loadStored(VIEWMODE_KEY, 'grid')); // grid | list
  const [scope, setScope] = useState(() => loadStored(SCOPE_KEY, 'name')); // name | content
  const [excludes, setExcludes] = useState(loadExcludes);
  const [query, setQuery] = useState('');
  const [showRecents, setShowRecents] = useState(false);
  const cacheRef = useRef(new Map());
  const settingsReturnRef = useRef('picker');

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
    try { localStorage.setItem(ACCENT_KEY, accent || ''); } catch (_) { /* ignore */ }
  }, [accent]);

  useEffect(() => { history.list().then(setHistoryList); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  function goHome() {
    setView('picker');
    setFolder(null);
    setFiles([]);
    setActive(null);
    setQuery('');
  }

  function pickViewMode(v) {
    setViewMode(v);
    try { localStorage.setItem(VIEWMODE_KEY, v); } catch (_) { /* ignore */ }
  }

  function pickScope(s) {
    setScope(s);
    try { localStorage.setItem(SCOPE_KEY, s); } catch (_) { /* ignore */ }
  }

  function openSettings() {
    if (view !== 'settings') settingsReturnRef.current = view;
    setView('settings');
  }

  function closeSettings() {
    setView(settingsReturnRef.current);
  }

  async function applyExcludes(next) {
    setExcludes(next);
    try { localStorage.setItem(EXCLUDES_KEY, JSON.stringify(next)); } catch (_) { /* ignore */ }
    if (folder && folder.handle) {
      try {
        setFiles(await listMdFiles(folder.handle, next));
      } catch (_) { /* keep current list if the rescan fails */ }
    }
  }

  async function loadFolder(handle, name) {
    cacheRef.current = new Map();
    const md = await listMdFiles(handle, excludes);
    setFolder({ name, handle });
    setFiles(md);
    setActive(null);
    setView('library');
    setIndexed(0);
    for (let i = 0; i < md.length; i++) {
      const f = md[i];
      try { cacheRef.current.set(f.path, await readFileText(f.handle)); } catch (_) { /* skip unreadable */ }
      setIndexed(i + 1);
    }
    setNotice('');
  }

  async function openEntry(entry) {
    const t = cacheRef.current.get(entry.path) ?? await readFileText(entry.handle);
    if (!cacheRef.current.has(entry.path)) cacheRef.current.set(entry.path, t);
    if (folder) {
      const location = folder.name + (entry.path ? '/' + entry.path : '');
      persistHistory(entry.handle, location);
    } else {
      persistHistory(entry.handle);
    }
    setActive(entry);
    setText(t);
    setView('preview');
  }

  async function onPickFolder() {
    const handle = await pickFolder();
    if (!handle) return;
    persistHistory(handle);
    await loadFolder(handle, handle.name);
  }

  async function onPickSingleFile() {
    const handle = await pickSingleFile();
    if (!handle) return;
    const t = await readFileText(handle);
    persistHistory(handle);
    setFolder(null);
    setFiles([]);
    cacheRef.current.set(handle.name, t);
    setActive({ name: handle.name, path: handle.name, handle });
    setText(t);
    setView('preview');
  }

  async function persistHistory(handle, location) {
    try { await history.add(handle, location); } catch (_) { /* persistence is best-effort */ }
    try { setHistoryList(await history.list()); } catch (_) { /* ignore */ }
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
    const granted = await requestPermission(h.handle);
    if (!granted) { setNotice('Permission denied. Re-pick the folder or file.'); setView('picker'); return; }
    if (h.kind === 'directory') {
      await loadFolder(h.handle, h.name);
    } else {
      setFolder(null);
      setFiles([]);
      setActive({ name: h.name, path: h.name, handle: h.handle });
      setText(await readFileText(h.handle));
      persistHistory(h.handle, h.location);
      setView('preview');
    }
  }

  async function onSave(markdown) {
    if (!active || !active.handle || typeof active.handle.createWritable !== 'function') return;
    try {
      await saveFileText(active.handle, markdown);
      setNotice('Saved ✓');
    } catch (err) {
      setNotice('Save failed: ' + (err && err.message));
    }
  }

  function onBack() {
    setActive(null);
    setView(folder ? 'library' : 'picker');
  }

  const canSave = () => active && active.handle && typeof active.handle.createWritable === 'function';

  function pickFont(v) {
    setEditorFont(v);
    try { localStorage.setItem(FONT_KEY, v); } catch (_) { /* ignore */ }
  }

  function cycleWidth() {
    setWidthMode((w) => {
      const next = WIDTH_OPTIONS[(WIDTH_OPTIONS.findIndex((o) => o.key === w) + 1) % WIDTH_OPTIONS.length];
      try { localStorage.setItem(WIDTH_KEY, next.key); } catch (_) { /* ignore */ }
      return next.key;
    });
  }

  const doc = view === 'preview' && active ? {
    title: active.name,
    onBack,
    mode,
    onMode: setMode,
    font: editorFont,
    onFont: pickFont,
    fontOptions: FONT_OPTIONS,
    widthLabel: (WIDTH_OPTIONS.find((o) => o.key === widthMode) || WIDTH_OPTIONS[0]).label,
    widthIcon: { normal: 'width', wide: 'width_wide', wider: 'width_full' }[widthMode] || 'width',
    onWidth: cycleWidth,
    canSave: canSave(),
    onSave: () => onSave(text),
  } : null;

  return (
    <div className="app">
      <TopBar
        doc={doc}
        onHome={goHome}
        hasRecents={historyList.length > 0}
        onRecents={() => setShowRecents(true)}
        onSettings={view === 'settings' ? null : openSettings}
        library={view === 'library' ? {
          query,
          onQuery: setQuery,
          viewMode,
          onViewMode: pickViewMode,
          scope,
          onScope: pickScope,
        } : null}
      />

      {view === 'picker' && (
        <Picker
          onPickFile={onPickSingleFile}
          onPickFolder={onPickFolder}
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
          onThemeSelect={setTheme}
          onAccentSelect={setAccent}
          onAdd={(rule) => applyExcludes([...excludes, rule])}
          onRemove={(i) => applyExcludes(excludes.filter((_, j) => j !== i))}
          onReset={() => applyExcludes(DEFAULT_EXCLUDES)}
          onBack={closeSettings}
        />
      )}

      {view === 'preview' && (
        <Preview
          entry={active}
          text={text}
          setText={setText}
          theme={theme}
          folderHandle={folder ? folder.handle : null}
          mode={mode}
          onMode={setMode}
          editorFont={editorFont}
          widthVar={(WIDTH_OPTIONS.find((o) => o.key === widthMode) || WIDTH_OPTIONS[0]).px}
        />
      )}

      {showRecents && (
        <div className="drawer-backdrop" onClick={() => setShowRecents(false)} aria-hidden="true" />
      )}
      <aside className={`recents-drawer ${showRecents ? 'open' : ''}`} aria-label="Recent files and folders">
        <div className="drawer-header">
          <h2 className="drawer-title">Recent</h2>
          <button
            className="drawer-close"
            onClick={() => setShowRecents(false)}
            aria-label="Close recent list"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
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

      {notice && <div className="toast" onClick={() => setNotice('')}>{notice}</div>}
    </div>
  );
}
