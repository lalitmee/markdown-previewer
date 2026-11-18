import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
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

function renderLibrary({
  viewMode = 'list',
  entries = files,
  query = '',
  scope = 'name',
  folderName = '',
  cache = new Map(),
  sortOrder,
} = {}) {
  const markup = renderToStaticMarkup(
    createElement(Library, {
      files: entries,
      folderName,
      cache,
      indexed: entries.length,
      query,
      scope,
      viewMode,
      sortOrder,
      onOpen: () => {},
    }),
  );
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container;
}

function displayedLabel(button) {
  return (
    (button.querySelector('.folder-path')?.textContent || '') +
    button.querySelector('.fname').textContent
  );
}

describe('Library duplicate filename locations', () => {
  it.each(['grid', 'list'])(
    'prefixes duplicate names with the shortest unique folder path in %s view',
    (viewMode) => {
      const container = renderLibrary({ viewMode });
      const buttons = Array.from(
        container.querySelectorAll('.card, .list-row'),
      );

      expect(buttons.map(displayedLabel)).toEqual([
        'app/README.md',
        'api/README.md',
        'blue/docs/README.md',
        'red/docs/README.md',
        'packages/changelog/CHANGELOG.md',
      ]);
      expect(buttons[0].getAttribute('title')).toBe('packages/app/README.md');
      expect(buttons[4].querySelector('.folder-path').textContent).toBe(
        'packages/changelog/',
      );
      expect(buttons[4].getAttribute('title')).toBe(
        'packages/changelog/CHANGELOG.md',
      );
    },
  );

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

  it.each(['grid', 'list'])(
    'keeps long duplicate folder labels intact in %s view and omits unavailable size',
    (viewMode) => {
      const container = renderLibrary({
        viewMode,
        entries: [
          file('reference.md', 'project-a/docs/guides/reference.md'),
          file('reference.md', 'project-b/docs/guides/reference.md'),
        ],
      });
      const buttons = Array.from(
        container.querySelectorAll('.card, .list-row'),
      );

      expect(
        buttons.map(
          (button) => button.querySelector('.folder-path').textContent,
        ),
      ).toEqual(['project-a/docs/guides/', 'project-b/docs/guides/']);
      expect(
        buttons.every((button) => button.querySelector('.meta') === null),
      ).toBe(true);
    },
  );
});

describe('Library folder crumb', () => {
  it('shows the folder name with a folder icon when a folder is loaded', () => {
    const container = renderLibrary({ folderName: 'my-notes' });
    const crumb = container.querySelector('.result-count .crumb');

    expect(crumb.querySelector('.crumb-ico').textContent).toBe('folder');
    expect(crumb.textContent).toContain('my-notes');
    expect(container.querySelector('.result-count').textContent).toContain(
      'my-notes · 5 files',
    );
  });

  it('omits the crumb when no folder name is given', () => {
    const container = renderLibrary();

    expect(container.querySelector('.crumb')).toBeNull();
    expect(container.querySelector('.result-count').textContent).toBe(
      '5 files',
    );
  });
});

describe('Library layout and metadata', () => {
  it('changes layout directly, persists choices, and keeps the panel open', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    localStorage.removeItem('mdpv-library-layout');
    try {
      await act(async () =>
        root.render(
          createElement(Library, {
            files,
            cache: new Map(),
            viewMode: 'grid',
            onOpen: () => {},
          }),
        ),
      );
      const panel = host.querySelector('.layout-menu');
      await act(async () => panel.querySelector('summary').click());
      expect(panel.open).toBe(true);
      expect(panel.querySelector('.custom-select')).toBeNull();
      expect(panel.querySelectorAll('fieldset')).toHaveLength(2);
      expect(panel.querySelectorAll('input[type="radio"]')).toHaveLength(8);
      for (const value of ['3', 'compact']) {
        const input = panel.querySelector(`input[value="${value}"]`);
        await act(async () => {
          panel.querySelector('summary').focus();
          input
            .closest('label')
            .dispatchEvent(new Event('pointerdown', { bubbles: true }));
          // Clicking non-focusable label text can blur to null before the
          // browser forwards the click/focus to its associated radio.
          document.activeElement.blur();
        });
        expect(panel.open).toBe(true);
        await act(async () =>
          input.closest('label').querySelector('span').click(),
        );
        expect(panel.open).toBe(true);
        expect(panel.querySelector(`input[value="${value}"]`).checked).toBe(
          true,
        );
      }
      expect(host.querySelector('.file-grid').dataset.columns).toBe('3');
      expect(
        host.querySelector('.library').classList.contains('density-compact'),
      ).toBe(true);
      expect(JSON.parse(localStorage.getItem('mdpv-library-layout'))).toEqual({
        columns: '3',
        density: 'compact',
        excerpts: true,
      });
      await act(async () =>
        panel.querySelector('input[type="checkbox"]').click(),
      );
      expect(panel.open).toBe(true);
      expect(
        JSON.parse(localStorage.getItem('mdpv-library-layout')).excerpts,
      ).toBe(false);
      await act(async () =>
        panel.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
          }),
        ),
      );
      expect(panel.open).toBe(false);
      expect(document.activeElement).toBe(panel.querySelector('summary'));
      await act(async () => panel.querySelector('summary').click());
      await act(async () =>
        host.querySelector('[aria-label="Grid view"]').focus(),
      );
      expect(panel.open).toBe(false);
      await act(async () => panel.querySelector('summary').click());
      await act(async () =>
        document.body.dispatchEvent(
          new Event('pointerdown', { bubbles: true }),
        ),
      );
      expect(panel.open).toBe(false);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      localStorage.removeItem('mdpv-library-layout');
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  });
  it('renders folder-local controls, excerpts, and file metadata', () => {
    const container = renderLibrary({
      viewMode: 'grid',
      entries: [
        {
          ...file('guide.md', 'docs/guide.md'),
          size: 2048,
          lastModified: 1700000000000,
        },
      ],
      cache: new Map([
        ['docs/guide.md', '# Getting started\n\nA useful introduction.'],
      ]),
    });
    expect(
      container.querySelector('.library-toolbar [aria-label="Sort files"]'),
    ).not.toBeNull();
    expect(container.querySelector('.card .snippet').textContent).toContain(
      'A useful introduction.',
    );
    expect(container.querySelector('.file-meta').textContent).toContain(
      '2.0 KB',
    );
    expect(container.querySelector('time').dateTime).toBe(
      new Date(1700000000000).toISOString(),
    );
  });

  it('restores compact layout preferences and hides excerpts', () => {
    localStorage.setItem(
      'mdpv-library-layout',
      JSON.stringify({ columns: '3', density: 'compact', excerpts: false }),
    );
    try {
      const container = renderLibrary({
        viewMode: 'grid',
        cache: new Map([['packages/app/README.md', 'Example text']]),
      });
      expect(
        container
          .querySelector('.library')
          .classList.contains('density-compact'),
      ).toBe(true);
      expect(container.querySelector('.file-grid').dataset.columns).toBe('3');
      expect(container.querySelector('.snippet')).toBeNull();
    } finally {
      localStorage.removeItem('mdpv-library-layout');
    }
  });

  it.each(['newest', 'oldest'])(
    'sorts by %s and puts unknown dates last',
    (sortOrder) => {
      const entries = [
        { ...file('a.md', 'a.md'), lastModified: 100 },
        { ...file('b.md', 'b.md'), lastModified: 200 },
        file('c.md', 'c.md'),
      ];
      const container = renderLibrary({ entries, sortOrder });
      expect(
        [...container.querySelectorAll('.fname')].map(
          (node) => node.textContent,
        ),
      ).toEqual(
        sortOrder === 'newest'
          ? ['b.md', 'a.md', 'c.md']
          : ['a.md', 'b.md', 'c.md'],
      );
    },
  );
});

describe('Library search scope', () => {
  const entries = [
    file('notes.md', 'notes.md'),
    file('readme.md', 'docs/readme.md'),
  ];
  const cache = new Map([
    ['notes.md', 'needle in the body'],
    ['docs/readme.md', 'nothing relevant'],
  ]);

  it('keeps only filename hits in name scope', () => {
    const container = renderLibrary({ entries, cache, query: 'readme' });
    const buttons = Array.from(container.querySelectorAll('.list-row'));

    expect(buttons.map(displayedLabel)).toEqual(['docs/readme.md']);
    expect(buttons[0].querySelector('.snippet')).toBeNull();
    expect(buttons[0].querySelector('.fname mark').textContent).toBe('readme');
  });

  it('keeps only body hits in content scope', () => {
    const container = renderLibrary({
      entries,
      cache,
      query: 'needle',
      scope: 'content',
    });
    const buttons = Array.from(container.querySelectorAll('.list-row'));

    expect(buttons.map(displayedLabel)).toEqual(['./notes.md']);
    expect(buttons[0].querySelector('.snippet mark').textContent).toBe(
      'needle',
    );
  });
});
