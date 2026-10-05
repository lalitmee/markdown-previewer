import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Library from '../Library';

function file(name, path) {
  return { name, path, handle: {} };
}

const files = [
  file('README.md', 'packages/app/README.md'),
  file('README.md', 'packages/api/README.md'),
  file('README.md', 'clients/blue/docs/README.md'),
  file('README.md', 'clients/red/docs/README.md'),
  file('CHANGELOG.md', 'packages/changelog/CHANGELOG.md'),
];

function renderLibrary({ viewMode = 'list', entries = files, query = '', scope = 'name', folderName = '', cache = new Map() } = {}) {
  const markup = renderToStaticMarkup(createElement(Library, {
    files: entries,
    folderName,
    cache,
    indexed: entries.length,
    query,
    scope,
    viewMode,
    onOpen: () => {},
  }));
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container;
}

function displayedLabel(button) {
  return (button.querySelector('.folder-path')?.textContent || '') +
    button.querySelector('.fname').textContent;
}

describe('Library duplicate filename locations', () => {
  it.each(['grid', 'list'])('prefixes duplicate names with the shortest unique folder path in %s view', (viewMode) => {
    const container = renderLibrary({ viewMode });
    const buttons = Array.from(container.querySelectorAll('.card, .list-row'));

    expect(buttons.map(displayedLabel)).toEqual([
      'app/README.md',
      'api/README.md',
      'blue/docs/README.md',
      'red/docs/README.md',
      'CHANGELOG.md',
    ]);
    expect(buttons[0].getAttribute('title')).toBe('packages/app/README.md');
    expect(buttons[4].querySelector('.folder-path')).toBeNull();
    expect(buttons[4].getAttribute('title')).toBeNull();
  });

  it('keeps folder labels based on the full library when search shows one duplicate', () => {
    const container = renderLibrary({
      query: 'needle',
      scope: 'content',
      cache: new Map([['packages/api/README.md', 'needle']]),
    });
    const buttons = Array.from(container.querySelectorAll('.list-row'));

    expect(buttons).toHaveLength(1);
    expect(displayedLabel(buttons[0])).toBe('api/README.md');
  });

  it('uses ./ to identify a duplicate file in the selected folder root', () => {
    const container = renderLibrary({
      entries: [
        file('README.md', 'README.md'),
        file('README.md', 'docs/README.md'),
      ],
    });
    const buttons = Array.from(container.querySelectorAll('.list-row'));

    expect(buttons.map(displayedLabel)).toEqual([
      './README.md',
      'docs/README.md',
    ]);
  });

  it.each(['grid', 'list'])('keeps long duplicate folder labels intact in %s view and omits unavailable size', (viewMode) => {
    const container = renderLibrary({
      viewMode,
      entries: [
        file('reference.md', 'project-a/docs/guides/reference.md'),
        file('reference.md', 'project-b/docs/guides/reference.md'),
      ],
    });
    const buttons = Array.from(container.querySelectorAll('.card, .list-row'));

    expect(buttons.map((button) => button.querySelector('.folder-path').textContent)).toEqual([
      'project-a/docs/guides/',
      'project-b/docs/guides/',
    ]);
    expect(buttons.every((button) => button.querySelector('.meta') === null)).toBe(true);
  });
});

describe('Library folder crumb', () => {
  it('shows the folder name with a folder icon when a folder is loaded', () => {
    const container = renderLibrary({ folderName: 'my-notes' });
    const crumb = container.querySelector('.result-count .crumb');

    expect(crumb.querySelector('.crumb-ico').textContent).toBe('folder');
    expect(crumb.textContent).toContain('my-notes');
    expect(container.querySelector('.result-count').textContent).toContain('my-notes · 5 files');
  });

  it('omits the crumb when no folder name is given', () => {
    const container = renderLibrary();

    expect(container.querySelector('.crumb')).toBeNull();
    expect(container.querySelector('.result-count').textContent).toBe('5 files');
  });
});

describe('Library search scope', () => {
  const entries = [file('notes.md', 'notes.md'), file('readme.md', 'docs/readme.md')];
  const cache = new Map([
    ['notes.md', 'needle in the body'],
    ['docs/readme.md', 'nothing relevant'],
  ]);

  it('keeps only filename hits in name scope', () => {
    const container = renderLibrary({ entries, cache, query: 'readme' });
    const buttons = Array.from(container.querySelectorAll('.list-row'));

    expect(buttons.map(displayedLabel)).toEqual(['readme.md']);
    expect(buttons[0].querySelector('.snippet')).toBeNull();
    expect(buttons[0].querySelector('.fname mark').textContent).toBe('readme');
  });

  it('keeps only body hits in content scope', () => {
    const container = renderLibrary({ entries, cache, query: 'needle', scope: 'content' });
    const buttons = Array.from(container.querySelectorAll('.list-row'));

    expect(buttons.map(displayedLabel)).toEqual(['notes.md']);
    expect(buttons[0].querySelector('.snippet mark').textContent).toBe('needle');
  });
});
