// The shipped theme library (themes/*.json).
//
// These files are meant to be copied by other people, so a broken one is worse
// than a missing one: it teaches the wrong schema. This checks each file
// survives the same validation an import runs, covers every theme the app
// still offers, and only ships themes the app knows about.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadFns, extractConst } from './helpers/load-app-fns.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DIR = join(here, '..', 'themes');

const fns = loadFns(['validateCustomTheme'], {
  CUSTOM_THEME_VARS: extractConst('CUSTOM_THEME_VARS'),
});

const FILES = readdirSync(DIR).filter(f => f.endsWith('.json'));
const THEMES = extractConst('THEMES');
// Removed from the panel but kept shipping (and importable) so maps saved
// under these themes keep rendering from their CSS blocks.
const RETIRED_FROM_PANEL = ['dracula', 'nord', 'slate-steel', 'vscode-onedark', 'monokai-pro', 'amazon-aws', 'synthwave', 'matrix-green'];

describe('shipped theme library', () => {
  test('there are themes to ship', () => {
    assert.ok(FILES.length > 0, 'themes/ contains no JSON files');
  });

  for (const file of FILES) {
    const raw = JSON.parse(readFileSync(join(DIR, file), 'utf8'));

    test(`${file}: passes the same validation an import does`, () => {
      assert.ok(fns.validateCustomTheme(raw), 'would be rejected on import');
    });

    test(`${file}: id, filename and swatch-visible themes agree`, () => {
      assert.equal(raw.id, file.replace(/\.json$/, ''), 'id does not match the filename');
      const panel = THEMES.some(t => t.id === raw.id);
      const retired = RETIRED_FROM_PANEL.includes(raw.id);
      assert.ok(panel || retired,
        `id "${raw.id}" is neither a panel theme nor a retired one - the file is orphaned`);
    });
  }

  test('every panel theme ships a file (light theme included)', () => {
    const shipped = new Set(FILES.map(f => f.replace(/\.json$/, '')));
    for (const t of THEMES) {
      assert.ok(shipped.has(t.id), `no themes/${t.id}.json for panel theme "${t.id}"`);
    }
    assert.ok(shipped.has('light'), 'the light theme has no themes/light.json');
  });

  test('removed themes are no longer offered in the panel', () => {
    const panelIds = THEMES.map(t => t.id);
    for (const id of RETIRED_FROM_PANEL) {
      assert.ok(!panelIds.includes(id), `${id} still offered in the panel`);
    }
  });

  test('a theme in the folder survives a round-trip', () => {
    const raw = JSON.parse(readFileSync(join(DIR, 'light.json'), 'utf8'));
    const again = fns.validateCustomTheme(JSON.parse(JSON.stringify(raw)));
    assert.deepEqual(again, raw, 'validation must not alter a well-formed theme');
  });
});