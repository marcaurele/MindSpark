// The minimal-layout launcher's cascade panels must never cover the main menu,
// or the user gets trapped in a submenu with no way back to Maps/Templates/Open
// source. minimalSubPlacement decides where each panel lands, relative to the
// anchor item it hangs off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadFns } from './helpers/load-app-fns.mjs';

const { minimalSubPlacement } = loadFns(['minimalSubPlacement']);

// Menu is pinned to the top-left: 190px wide, so menuLeft=10, menuRight=200.
const M = { left: 10, right: 200 };

test('opens to the right when it fits: top-level Maps item on a wide screen', () => {
  const p = minimalSubPlacement({ top: 10, left: 16, right: 206, bottom: 44 }, 190, 400, 1280, 800, M.left, M.right);
  assert.deepEqual(p, { top: 10, left: 210 });
});

test('flips to the left when the anchor is on the right half and it clears the menu', () => {
  // Anchor at x 1000..1190: flipping to the left lands at 806, far right of the menu.
  const p = minimalSubPlacement({ top: 10, left: 1000, right: 1190, bottom: 44 }, 190, 400, 1280, 800, M.left, M.right);
  assert.deepEqual(p, { top: 10, left: 806 });
});

test('drops below the category item instead of covering the menu on a narrow screen', () => {
  // Templates sub is beside the menu (x 210..400); Prompt-engineering category
  // item spans x 216..394. Opening right (398) overflows the 480px viewport and
  // flipping left (22) would land on the menu items, so it cascades below it.
  const p = minimalSubPlacement({ top: 16, left: 216, right: 394, bottom: 50 }, 190, 400, 480, 800, M.left, M.right);
  assert.deepEqual(p, { top: 54, left: 216 });
});

test('clamps to the bottom edge when the panel would run off screen', () => {
  const p = minimalSubPlacement({ top: 700, left: 16, right: 206, bottom: 734 }, 190, 400, 1280, 800, M.left, M.right);
  assert.deepEqual(p, { top: 392, left: 210 });
});

test('never overlaps the menu items at any viewport width', () => {
  for (const vw of [280, 320, 480, 720, 1280]) {
    // Top-level Maps item (top 10..44) and a category item (top 54..88) inside
    // the Templates cascade: the menu items live in the y band 10..50.
    const topLevel = minimalSubPlacement({ top: 10, left: 16, right: 206, bottom: 44 }, 190, 400, vw, 800, M.left, M.right);
    const category = minimalSubPlacement({ top: 54, left: 22, right: 210, bottom: 88 }, 190, 400, vw, 800, M.left, M.right);
    for (const p of [topLevel, category]) {
      const overMenu =
        p.top < 44 &&                       // starts above the menu items' bottom edge
        p.left < M.right && p.left + 190 > M.left;   // and horizontally overlaps the menu box
      assert.equal(overMenu, false, `panel overlaps menu at viewport width ${vw}: ${JSON.stringify(p)}`);
    }
  }
});