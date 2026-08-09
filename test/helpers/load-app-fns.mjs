// public/app.js is a plain browser script with no module exports — it can't be
// imported. Rather than copy functions into the tests (where they'd silently
// drift from the shipped code the first time someone edits app.js), this reads
// the REAL source and lifts out individual top-level function declarations by
// brace-matching, then evaluates them in an isolated scope.
//
// Consequence worth knowing: if someone renames or deletes one of these
// functions, the affected test fails loudly at load time rather than passing
// against a stale copy. That's the point.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const APP_JS = join(here, '..', '..', 'public', 'app.js');

let _src = null;
function source() {
  if (_src === null) _src = readFileSync(APP_JS, 'utf8');
  return _src;
}

/**
 * Extract the full text of a top-level `function NAME(...) { ... }`.
 *
 * Finds the end by asking the JS parser rather than brace-counting by hand:
 * try each following `}` as a candidate end and return the first slice that
 * compiles as a function expression. Hand-rolled brace matching needs a full
 * lexer to avoid tripping over braces and quotes inside strings, template
 * literals, regexes and comments — app.js has all four (escapeHtml's
 * /[&<>"]/g regex is enough to break the naive version).
 */
export function extractFunction(name) {
  const src = source();
  const re = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`load-app-fns: function ${name}() not found in public/app.js`);

  const start = m.index;
  for (let i = src.indexOf('{', start); i !== -1; i = src.indexOf('}', i + 1)) {
    if (src[i] !== '}') continue;
    const candidate = src.slice(start, i + 1);
    try {
      // Throws unless `candidate` is a complete, syntactically valid function.
      new Function(`return (${candidate});`);
      return candidate;
    } catch { /* not the end yet — keep going */ }
  }
  throw new Error(`load-app-fns: could not find the end of ${name}()`);
}

/**
 * Build callable versions of the named functions.
 * `deps` supplies anything they close over that isn't a JS/Node global.
 */
export function loadFns(names, deps = {}) {
  const bodies = names.map(extractFunction).join('\n\n');
  const depNames = Object.keys(deps);
  const factory = new Function(
    ...depNames,
    `${bodies}\nreturn { ${names.join(', ')} };`
  );
  return factory(...depNames.map(k => deps[k]));
}

/** Extract a top-level `const NAME = ...;` single-line declaration (e.g. a regex). */
export function extractConst(name) {
  const src = source();
  const re = new RegExp(`^const\\s+${name}\\s*=\\s*(.+?);\\s*$`, 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`load-app-fns: const ${name} not found in public/app.js`);
  return new Function(`return (${m[1]});`)();
}
