import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import Library from '../Library';

function render(viewMode, query = '', scope = 'name') {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(
    createElement(Library, {
      files: [{ name: 'guide.md', path: 'docs/guide.md' }],
      cache: new Map([['docs/guide.md', 'A useful introduction with needle.']]),
      viewMode,
      query,
      scope,
      onOpen: () => {},
    }),
  );
  return host;
}

it('shows list column headings and aligned placeholders for missing metadata', () => {
  const host = render('list');
  expect(host.querySelector('.list-heading').textContent).toBe(
    'DocumentModifiedSize',
  );
  expect(host.querySelector('.file-date').textContent).toBe('—');
  expect(host.querySelector('.file-size').textContent).toBe('—');
  expect(host.querySelector('.snippet')).toBeNull();
  expect(host.querySelector('.folder-path').textContent).toBe('docs/');
});

it('retains matching content snippets in list searches', () => {
  const host = render('list', 'needle', 'content');
  expect(host.querySelector('.snippet mark').textContent).toBe('needle');
});

it('keeps normal grid excerpts without list headings', () => {
  const host = render('grid');
  expect(host.querySelector('.list-heading')).toBeNull();
  expect(host.querySelector('.card .snippet').textContent).toContain(
    'A useful introduction',
  );
});
