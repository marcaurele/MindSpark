// FreeMind (.mm) import - the client-side XML parser (parseFreemind +
// convertFreemindToMap). .mm files are untrusted input from the file picker,
// so the tests pin down what survives into the map: text, position, folded
// state, rich text, notes, links, colors and fonts - and that hostile or
// malformed files are rejected rather than half-imported.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadFns } from './helpers/load-app-fns.mjs';

const deps = {
  escapeHtml: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  sanitizeInlineHTML: s => String(s),
  gmindHtmlToInline: (html, plain) => (html ? String(html).replace(/<\/(p|div)>/gi, '<br>') : String(plain ?? '')),
  nodeTextPlain: t => String(t).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim(),
  sanitizeNotes: s => s,
  uid: () => 'map-1',
  DOMParser: null,
};

const fns = loadFns(
  ['parseFreemind', 'convertFreemindToMap', 'fmAttr', 'fmHtmlToInline'],
  deps
);

// Tiny fake XML element mirroring the parts convertFreemindToMap touches.
const el = (tag, attrs = {}, children = [], props = {}) => ({
  tagName: tag,
  children,
  getAttribute: n => (attrs[n] != null ? String(attrs[n]) : null),
  innerHTML: props.innerHTML ?? '',
  textContent: props.textContent ?? '',
  querySelector: sel => (sel === 'html' ? (props.html ?? null) : null),
});

const node = (text, attrs = {}, children = [], props = {}) =>
  el('node', { TEXT: text, ...attrs }, children, props);

const fm = (topLevel) => ({
  documentElement: el('map', {}, topLevel),
  querySelector: () => null,
});

describe('parseFreemind - structure', () => {
  test('rejects a document that is not a <map>', () => {
    assert.throws(() => fns.convertFreemindToMap({ documentElement: el('html', {}, []) }), /expected <map>/);
  });

  test('rejects a <map> with no <node> children', () => {
    assert.throws(() => fns.convertFreemindToMap({ documentElement: el('map', {}, [el('cloud', {})]) }), /no <node> found/);
  });

  test('a DOMParser parsererror is rejected', () => {
    const bad = class { parseFromString() { return { querySelector: () => ({ textContent: 'junk' }) }; } };
    const withParser = loadFns(
      ['parseFreemind', 'convertFreemindToMap', 'fmAttr', 'fmHtmlToInline'],
      { ...deps, DOMParser: bad }
    );
    assert.throws(() => withParser.parseFreemind('<map><', 'x.mm'), /Not a valid \.mm/);
  });

  test('well-formed XML passes through the parser', () => {
    const doc = class {
      parseFromString() {
        return {
          querySelector: () => null,
          documentElement: el('map', {}, [node('Root', {}, [node('Kid', { POSITION: 'right' })])]),
        };
      }
    };
    const withParser = loadFns(
      ['parseFreemind', 'convertFreemindToMap', 'fmAttr', 'fmHtmlToInline'],
      { ...deps, DOMParser: doc }
    );
    const map = withParser.parseFreemind('<map><node TEXT="Root"><node TEXT="Kid" POSITION="right"/></node></map>', 'sample.mm');
    assert.equal(map.rootId, 'f0');
    assert.equal(map.nodes['f0'].text, 'Root');
    assert.equal(map.nodes['f1'].parent, 'f0');
    assert.equal(map.nodes['f1'].side, 'right');
    assert.equal(map.title, 'Root');
  });
});

describe('convertFreemindToMap - node content', () => {
  test('TEXT, POSITION, FOLDED and plain multiline text survive', () => {
    const map = fns.convertFreemindToMap(fm([
      node('Root', {}, [
        node('Line one\nLine two', { POSITION: 'right', FOLDED: 'true' }),
        node('Left', { POSITION: 'left' }),
      ]),
    ]), 'x.mm');
    assert.equal(map.nodes['f1'].text, 'Line one<br>Line two');
    assert.equal(map.nodes['f1'].side, 'right');
    assert.equal(map.nodes['f1'].collapsed, true);
    assert.equal(map.nodes['f2'].side, 'left');
    assert.equal(map.nodes['f2'].collapsed, undefined);
  });

  test('children without POSITION split right/left by half', () => {
    const map = fns.convertFreemindToMap(fm([
      node('Root', {}, [
        node('A'), node('B'), node('C'),
      ]),
    ]), 'x.mm');
    assert.equal(map.nodes['f1'].side, 'right');
    assert.equal(map.nodes['f2'].side, 'right');
    assert.equal(map.nodes['f3'].side, 'left');
  });

  test('richcontent TYPE=NODE overrides TEXT', () => {
    const rich = el('richcontent', { TYPE: 'NODE' }, [], {
      innerHTML: '<html><body><b>Rich</b> text</body></html>',
    });
    const map = fns.convertFreemindToMap(fm([
      node('Root', {}, [node('ignored', {}, [rich])]),
    ]), 'x.mm');
    assert.equal(map.nodes['f1'].text, '<b>Rich</b> text');
  });

  test('richcontent TYPE=NOTE becomes notes', () => {
    const note = el('richcontent', { TYPE: 'NOTE' }, [], {
      innerHTML: '<html><body><p>Some note</p></body></html>',
      html: el('html', {}, []),
    });
    const map = fns.convertFreemindToMap(fm([
      node('Root', {}, [node('Kid', {}, [note])]),
    ]), 'x.mm');
    assert.match(map.nodes['f1'].notes, /Some note/);
  });

  test('COLOR, BACKGROUND_COLOR and <font> map to node styles', () => {
    const font = el('font', { SIZE: '16', BOLD: 'true', ITALIC: 'true' });
    const map = fns.convertFreemindToMap(fm([
      node('Root', {}, [node('Kid', { COLOR: 'ff0000', BACKGROUND_COLOR: '00ff00' }, [font])]),
    ]), 'x.mm');
    assert.equal(map.nodes['f1'].textColor, '#ff0000');
    assert.equal(map.nodes['f1'].color, '#00ff00');
    assert.equal(map.nodes['f1'].fontSize, 16);
    assert.equal(map.nodes['f1'].bold, true);
    assert.equal(map.nodes['f1'].italic, true);
  });

  test('a LINK url lands in the notes', () => {
    const map = fns.convertFreemindToMap(fm([
      node('Root', {}, [node('Kid', { LINK: 'https://example.com/x' })]),
    ]), 'x.mm');
    assert.match(map.nodes['f1'].notes, /example\.com/);
  });

  test('multiple top-level nodes get a synthetic root', () => {
    const map = fns.convertFreemindToMap(fm([
      node('One'), node('Two'), node('Three'),
    ]), 'multi.mm');
    const root = map.nodes[map.rootId];
    assert.ok(root, 'a synthetic root exists');
    assert.equal(root.side, 'root');
    assert.equal(map.nodes[map.rootId].text, 'multi');
    const kids = Object.values(map.nodes).filter(n => n.parent === map.rootId);
    assert.equal(kids.length, 3);
    assert.equal(kids[0].side, 'right');
    assert.equal(kids[2].side, 'left');
  });
});