// The pure half of the inline colour picker (public/app.js): reading a CSS
// colour literal, writing one back in the same notation, and finding them in a
// block of JSON. The DOM half (attachColorSwatches, openColorPicker) is not
// covered here - these are the parts that decide what ends up in the file.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadFns, extractConst } from './helpers/load-app-fns.mjs';

const { parseCssColor, formatCssColor, findColorTokens, spaceForSwatches, rgbToHsv, hsvToRgb } =
  loadFns(['parseCssColor', 'formatCssColor', 'findColorTokens', 'spaceForSwatches', 'rgbToHsv', 'hsvToRgb'],
    { CSS_COLOR_RE: extractConst('CSS_COLOR_RE') });

describe('parseCssColor - CSS literal to channels', () => {
  test('reads the six digit hex the themes are written in', () => {
    assert.deepEqual(parseCssColor('#e0613a'), { r:224, g:97, b:58, a:1 });
  });

  test('expands the three digit shorthand', () => {
    assert.deepEqual(parseCssColor('#fff'), { r:255, g:255, b:255, a:1 });
  });

  test('reads the alpha of the eight digit form', () => {
    const c = parseCssColor('#00000080');
    assert.equal(c.r, 0);
    assert.ok(Math.abs(c.a - 0.502) < 0.01, `alpha was ${c.a}`);
  });

  test('reads rgba(), including the short .5 style alpha the themes use', () => {
    assert.deepEqual(parseCssColor('rgba(255,255,255,.5)'), { r:255, g:255, b:255, a:0.5 });
  });

  test('reads the space separated syntax as well as the comma one', () => {
    assert.deepEqual(parseCssColor('rgb(10 20 30 / 0.25)'), { r:10, g:20, b:30, a:0.25 });
  });

  test('rejects the lengths that are not colours, so no swatch is drawn for them', () => {
    assert.equal(parseCssColor('#12345'), null);
    assert.equal(parseCssColor('#1234567'), null);
    assert.equal(parseCssColor('rebeccapurple'), null);
    assert.equal(parseCssColor('hsl(200,50%,50%)'), null);
    assert.equal(parseCssColor(''), null);
  });
});

describe('formatCssColor - channels back to a literal', () => {
  test('a hex value stays hex', () => {
    assert.equal(formatCssColor({ r:224, g:97, b:58, a:1 }, '#f4efe6'), '#e0613a');
  });

  test('an alpha below 1 promotes hex to its eight digit form', () => {
    assert.equal(formatCssColor({ r:0, g:0, b:0, a:0.5 }, '#000000'), '#00000080');
  });

  test('an rgba value stays functional and keeps its compact spacing', () => {
    assert.equal(formatCssColor({ r:1, g:2, b:3, a:0.07 }, 'rgba(255,255,255,.5)'), 'rgba(1,2,3,.07)');
  });

  test('spacing after the commas is kept when the original had it', () => {
    assert.equal(formatCssColor({ r:1, g:2, b:3, a:1 }, 'rgb(9, 9, 9)'), 'rgb(1, 2, 3)');
  });

  test('an opaque colour written as rgba() stays rgba()', () => {
    assert.equal(formatCssColor({ r:1, g:2, b:3, a:1 }, 'rgba(9,9,9,.5)'), 'rgba(1,2,3,1)');
  });

  test('follows the case of the literal being replaced', () => {
    assert.equal(formatCssColor({ r:171, g:205, b:239, a:1 }, '#FFFFFF'), '#ABCDEF');
  });

  test('round trips every colour in a real theme file', async () => {
    const { readFileSync } = await import('node:fs');
    const nord = JSON.parse(readFileSync(new URL('../themes/nord.json', import.meta.url), 'utf8'));
    let seen = 0;
    for(const value of Object.values(nord.vars)){
      for(const tok of findColorTokens(value)){
        const back = formatCssColor(tok.rgba, tok.text);
        assert.deepEqual(parseCssColor(back), tok.rgba, `${value} changed colour`);
        // The 18 values that are nothing but a colour, which are the ones the
        // picker can reach, have to come back character for character: a diff of
        // an imported theme should show the one value the user actually picked.
        if(tok.text === value) assert.equal(back, value);
        seen++;
      }
    }
    assert.equal(seen, 21, 'nord.json has 18 plain colours plus 3 inside its shadows');
  });
});

describe('findColorTokens - locating the literals to decorate', () => {
  const json = '{\n  "paper":   "#f4efe6",\n  "glow":   "rgba(255,255,255,.5)"\n}';

  test('finds each colour with the offsets that address it in the text', () => {
    const found = findColorTokens(json);
    assert.equal(found.length, 2);
    assert.equal(found[0].text, '#f4efe6');
    assert.equal(json.slice(found[0].start, found[0].end), '#f4efe6');
    assert.equal(json.slice(found[1].start, found[1].end), 'rgba(255,255,255,.5)');
  });

  test('finds the colours buried inside a longer value, such as a shadow', () => {
    const shadow = '"--shadow": "0 2px 4px rgba(40,30,15,.06),0 8px 24px rgba(40,30,15,.10)"';
    assert.equal(findColorTokens(shadow).length, 2);
  });

  test('drops what it matched but cannot read, rather than reporting a broken token', () => {
    assert.deepEqual(findColorTokens('#12345 and #beef00'), findColorTokens('#beef00').map(
      t => ({ ...t, start: t.start + 11, end: t.end + 11 })));
  });

  test('is not left mid scan by the previous call', () => {
    const once = findColorTokens('#000000 #ffffff').length;
    assert.equal(findColorTokens('#000000 #ffffff').length, once);
  });
});

describe('spaceForSwatches - the blank columns the square sits in', () => {
  test('widens the gap between key and value', () => {
    assert.equal(spaceForSwatches('{"paper": "#fff"}'), '{"paper":   "#fff"}');
  });

  test('leaves the parsed object identical, which is the whole point', () => {
    const src = JSON.stringify({ vars: { '--paper': '#f4efe6', '--ink': '#23201b' } }, null, 2);
    assert.deepEqual(JSON.parse(spaceForSwatches(src)), JSON.parse(src));
  });

  test('is idempotent, so re-spacing on every paste changes nothing further', () => {
    const once = spaceForSwatches('{"a": "#fff"}');
    assert.equal(spaceForSwatches(once), once);
  });
});

describe('rgbToHsv / hsvToRgb - what the picker drags in', () => {
  test('round trips the theme accent', () => {
    const c = { r:224, g:97, b:58 };
    const hsv = rgbToHsv(c);
    assert.deepEqual(hsvToRgb(hsv.h, hsv.s, hsv.v), c);
  });

  test('grey has no saturation and black no value', () => {
    assert.equal(rgbToHsv({ r:128, g:128, b:128 }).s, 0);
    assert.equal(rgbToHsv({ r:0, g:0, b:0 }).v, 0);
  });
});
