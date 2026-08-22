import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFns, extractFunction } from './helpers/load-app-fns.mjs';

// renderOutline() rebuilds the outline dock tree. It diffs the produced HTML
// against the cached _olPrev and skips writing when unchanged. That cache
// must be invalidated whenever the pane is destroyed — otherwise switching
// away from the outline layout and back recreates an EMPTY pane whose content
// matches the stale cache, so nothing is ever written to it.
function outlineStubs({ pane, prev, kids = [], text = 'Root', nodes = { r: { text } }, collapsed = new Set() }) {
  return {
    document: {
      getElementById: (id) => (id === 'outlinePane' ? pane : null),
      body: { classList: { contains: (c) => c === 'ui-outline' } },
    },
    map: { nodes, rootId: 'r' },
    sel: null,
    hiddenSet: () => new Set(),
    childrenOf: () => kids,
    escapeHtml: (s) => s,
    nodeTextPlain: (s) => s,
    _olCollapsed: collapsed,
    _olPrev: prev,
  };
}

function makePane() {
  let writes = 0;
  let html = '';
  const body = {
    scrollTop: 0,
    get innerHTML() { return html; },
    set innerHTML(v) { writes++; html = v; },
  };
  return {
    pane: { querySelector: (sel) => (sel === '.ol-body' ? body : null) },
    body,
    get writes() { return writes; },
  };
}

test('renderOutline fills a freshly created pane (cache empty)', () => {
  const { pane, body } = makePane();
  const { renderOutline } = loadFns(['renderOutline'], outlineStubs({ pane, prev: '' }));
  renderOutline();
  assert.ok(body.innerHTML.includes('Root'), 'fresh pane must contain the node label');
  assert.ok(body.innerHTML.includes('ol-tree'), 'fresh pane must contain the tree markup');
  assert.ok(body.innerHTML.includes('ol-twist ol-leaf'), 'leaf node must get the leaf twist');
});

test('renderOutline skips rewriting when the HTML is unchanged (cache works)', () => {
  const { pane, body } = makePane();
  const { renderOutline } = loadFns(['renderOutline'], outlineStubs({ pane, prev: '' }));
  renderOutline();
  const first = body.innerHTML;
  const writesAfterFirst = body.writes;
  renderOutline();                              // same map -> same html
  assert.equal(body.innerHTML, first, 'content must be identical');
  assert.equal(body.writes, writesAfterFirst, 'unchanged HTML must not rewrite the pane');
});

test('regression: a fresh pane with a stale _olPrev stays empty (the reported bug)', () => {
  // Simulates: render once, switch away (pane removed, _olPrev left behind),
  // switch back (pane recreated empty). Without the fix, the equal-content
  // guard skips the write and the outline is blank.
  const first = makePane();
  const { renderOutline: renderFirst } = loadFns(['renderOutline'], outlineStubs({ pane: first.pane, prev: '' }));
  renderFirst();
  const staleHtml = first.body.innerHTML;
  assert.ok(staleHtml.length > 0);

  const fresh = makePane();                     // the recreated empty pane
  const { renderOutline: renderFresh } = loadFns(['renderOutline'], outlineStubs({ pane: fresh.pane, prev: staleHtml }));
  renderFresh();
  assert.equal(fresh.body.innerHTML, '', 'this documents the bug: a stale cache leaves the outline empty');
  assert.equal(fresh.writes, 0);
});

test('applyUiLayout resets _olPrev whenever the outline pane is removed', () => {
  const fn = extractFunction('applyUiLayout');
  assert.match(fn, /if\(!outline\)\{\s*document\.getElementById\('outlinePane'\)\?\.remove\(\);\s*_olPrev='';/,
    'removing the pane must clear the html-compare cache so the next fresh pane renders');
});
