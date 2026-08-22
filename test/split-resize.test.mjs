import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'public', 'styles.css'), 'utf8');

// The split-editor markdown pane is resized by dragging .md-resize, which
// writes --md-w onto .app. If the pane's width were clamped with a min(...)
// cap, dragging wider would do nothing once the pane hits the cap and the
// control would appear completely broken. The rule must be a plain
// var(--md-w, 40vw) so every drag delta actually moves the pane.
test('split-editor md pane width must not be capped (drag-to-resize works)', () => {
  const rule = css.match(/body\.ui-split #mdPane\{[^}]*\}/);
  assert.ok(rule, 'split mdPane rule must exist');
  assert.match(rule[0], /width:\s*var\(--md-w,\s*40vw\)/,
    'split mdPane width must track --md-w directly (no min(...) clamp)');
  assert.doesNotMatch(rule[0], /min\(/,
    'a min() clamp would freeze the drag at the cap — regression guard');
});

// The drag handler in ensureMdPane() must write the CSS variable the rule
// above reads, and only that — the pane must not get a fixed pixel width.
test('md-resize drag must set --md-w (the variable the pane width reads)', () => {
  const js = readFileSync(join(here, '..', 'public', 'app.js'), 'utf8');
  const drag = js.match(/const mv=ev=>\{[^}]*\}/);
  assert.ok(drag, 'the resize mousemove handler must exist');
  assert.match(drag[0], /setProperty\('--md-w'/,
    'the drag handler must set --md-w on the app element');
});