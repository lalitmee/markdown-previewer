import { useState } from 'react';
import { validateDraft } from '../lib/excludes';
import { ACCENT_PRESETS } from '../lib/accent';

export default function SettingsPage({ rules, theme, accent, onThemeSelect, onAccentSelect, onAdd, onRemove, onReset, onBack }) {
  const [draft, setDraft] = useState('');
  const [type, setType] = useState('name'); // name | regex
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const value = draft.trim();
    const err = validateDraft(value, type, rules);
    if (err) { setError(err); return; }
    onAdd({ type, value });
    setDraft('');
    setError('');
  }

  return (
    <main className="settings">
      <div className="settings-card">
        <div className="settings-header">
          <button className="btn secondary icon-btn" onClick={onBack} title="Back" aria-label="Back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1>Settings</h1>
        </div>

        <section className="settings-section">
          <h2>Excluded paths</h2>
          <p className="settings-sub">
            Files and folders matching these rules are hidden from every folder you open.
          </p>

          <form className="exclude-form" onSubmit={submit} noValidate>
            <input
              className="exclude-input"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); if (error) setError(''); }}
              placeholder="Type a name or pattern"
              aria-label="Exclusion pattern"
              aria-invalid={!!error}
            />
            <div className="exclude-type" role="group" aria-label="Pattern type">
              <button
                type="button"
                className={type === 'name' ? 'active' : ''}
                onClick={() => setType('name')}
                aria-pressed={type === 'name'}
                aria-label="Name pattern"
              >Name</button>
              <button
                type="button"
                className={type === 'regex' ? 'active' : ''}
                onClick={() => setType('regex')}
                aria-pressed={type === 'regex'}
                aria-label="Regex pattern"
              >Regex</button>
            </div>
          </form>
          {error && <p className="settings-error" role="alert">{error}</p>}

          {rules.length === 0 ? (
            <p className="settings-empty">No exclusions yet.</p>
          ) : (
            <ul className="settings-chips">
              {rules.map((r, i) => (
                <li key={r.type + ':' + r.value} className="settings-chip">
                  <span className="settings-chip-label" title={r.value}>{r.value}</span>
                  <button
                    className="settings-chip-x"
                    onClick={() => onRemove(i)}
                    title={'Remove ' + r.value}
                    aria-label={'Remove ' + r.value}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button className="btn secondary settings-reset" onClick={onReset}>
            Reset to defaults
          </button>
        </section>

        <section className="settings-section">
          <h2>Appearance</h2>
          <div className="settings-row">
            <span className="settings-row-label">Theme</span>
            <div className="view-toggle" role="group" aria-label="Theme">
              <button
                type="button"
                className={theme === 'system' ? 'active' : ''}
                onClick={() => onThemeSelect('system')}
                title="System theme"
                aria-label="System theme"
                aria-pressed={theme === 'system'}
              ><span className="material-symbols-outlined">laptop</span></button>
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                onClick={() => onThemeSelect('light')}
                title="Light theme"
                aria-label="Light theme"
                aria-pressed={theme === 'light'}
              ><span className="material-symbols-outlined">light_mode</span></button>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => onThemeSelect('dark')}
                title="Dark theme"
                aria-label="Dark theme"
                aria-pressed={theme === 'dark'}
              ><span className="material-symbols-outlined">dark_mode</span></button>
            </div>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">Accent color</span>
            <div className="accent-picker" role="group" aria-label="Accent color presets">
              {ACCENT_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`accent-swatch${accent === hex ? ' active' : ''}`}
                  onClick={() => onAccentSelect(hex)}
                  title={hex}
                  aria-label={'Accent color ' + hex}
                  aria-pressed={accent === hex}
                  style={{ background: hex }}
                />
              ))}
              <span
                className="accent-custom-wrap"
                style={{ '--cur': accent ?? '#1a73e8' }}
                title="Custom color"
              >
                <input
                  type="color"
                  className="accent-custom"
                  value={accent ?? '#1a73e8'}
                  onChange={(e) => onAccentSelect(e.target.value)}
                  aria-label="Custom accent color"
                />
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}