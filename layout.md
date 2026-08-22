# MindSpark Layout Migration: OLD → NEW

**Goal:** Reproduce the NEW MindSpark layout (as implemented in this workspace) on the OLD
reference repo `https://github.com/prasadpatil25/MindSpark` (branch `main`, files under
`public/`). After this change the old repo's UI must look and behave exactly like the new
layout described below.

**Files to modify (only these three):** `public/index.html`, `public/styles.css`,
`public/app.js`. `public/templates.js` is untouched by this change.

**Reference line numbers** cited below are for the OLD repo files; NEW rules are quoted
verbatim from the target workspace so they can be pasted in directly.

---

## 1. Target layout (what the app must look like)

```
┌──────────────────────────────┬──────────────────────────────────────────────────┐
│  topbar  (full-width strip, grid-row 1, spans columns 2..-1)                    │
├──────────┬───────────────────┴──────────────────────────────────────────────────┤
│ side      │  stage (canvas, grid-column 2, grid-row 2)                          │
│ (grid-col1│  └── breadcrumb: fixed pill, top:56px left:14px, hidden (opacity 0) │
│  grid-row │      until .shown (hover/focus of overview chip)                    │
│  1/4,     │                                                                     │
│  spans 3  │                                                                     │
│ rows)     │                                                                     │
├──────────┴──────────────────────────────────────────────────────────────────────┤
│  statusbar (bottom strip, grid-row 3, spans columns 2..-1)                      │
│  hint (flex:1) … save-pill · token-total · user-pill        ▢ minimap ▢ zoom ▾ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Key structural facts:

- `.app` is a CSS grid: 3 columns (`auto minmax(0,1fr) auto`) and 3 rows
  (`auto minmax(0,1fr) auto`). The 3rd column exists only in markdown mode
  (`body.md-ready`): `#mdPane` occupies the middle track and `.stage` moves to
  column 3.
- The **topbar and statusbar are real strips** inside the grid (no floating bars).
- The **sidebar spans all 3 rows** on its own first column; collapsed, it becomes a
  36px icon rail (`.side-rail`) instead of disappearing entirely.
- The **zoombar is gone**. Zoom controls live in the statusbar's `.overview` chip,
  together with the (smaller) minimap and a new `#zoomSlider` range input.
- The **hint moved** from a floating bottom-left pill into the statusbar's left side.
- The **breadcrumb** is a fixed pill at `top:56px; left:14px`, invisible by default
  (`opacity:0`), shown via `.shown` class (fade+slide), expanded while hovering the
  overview chip (or while it has keyboard focus).
- Theme switching is pure CSS (`:root[data-theme=...]` + transitions); **there is no
  fade-veil element**.

---

## 2. index.html changes

### 2.1 Sidebar (`<aside class="side" id="side">`)

OLD structure (inside `.side`): `.brand` (mark + `<h1>MindSpark</h1>`), then
`.new-map-row` with `#newMap` button + `#newMapMenu` caret, then `.side-scroll`,
`.side-foot`, and finally the mobile-dismiss markup.

NEW structure — the sidebar's inner HTML must become exactly:

```html
<aside class="side" id="side">
  <div class="brand">
    <svg class="mark" viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
      <defs><radialGradient id="brandGrad" cx="30%" cy="25%"><stop offset="0%" stop-color="#ff8a5b"/><stop offset="100%" stop-color="#e0613a"/></radialGradient></defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#brandGrad)"/>
      <path d="M32 16 L36 28 L48 32 L36 36 L32 48 L28 36 L16 32 L28 28 Z" fill="#fff" opacity=".95"/>
    </svg>
    <h1>Mind<span>Spark</span></h1>
    <button class="tb" id="newMap" title="New mind map" aria-label="New mind map">＋</button>
    <button class="tb" id="toggleSide" title="Toggle sidebar" aria-label="Toggle sidebar">☰</button>
  </div>
  <div class="side-tabs">
    <button class="side-tab active" id="sideTabMaps" title="Your maps">🗺 Maps</button>
    <button class="side-tab" id="sideTabTpls" title="Start from a template">✦ Templates</button>
  </div>
  <div class="side-pane active" id="sidePaneMaps">
    <div class="side-scroll">
      <div class="side-label">Your maps</div>
      <div id="mapList"></div>
    </div>
  </div>
  <div class="side-pane" id="sidePaneTpls">
    <div class="side-scroll" id="tplList"></div>
  </div>
  <div class="side-foot">
    Open source · <b>no limits</b>
    <div class="side-links"> … (keep existing links) … </div>
  </div>
  <div class="side-rail"><button class="tb" id="railToggle" title="Open sidebar">☰</button></div>
  <div class="side-resize" id="sideResize" title="Drag to resize"></div>
</aside>
```

Rules:
- **Remove** `.new-map-row`, `.new-map` button, `.new-map-caret` and the
  `#newMapMenu` button entirely from the HTML. `#newMap` moves into `.brand` as a
  32×32 icon button (glyph `＋`), `#toggleSide` (glyph `☰`) is the last brand item.
- **Add** `.side-tabs` + `.side-tab` buttons (Maps / Templates) and the two
  `.side-pane` containers. Tab switching is **class-based** (`.side-pane.active`),
  never inline styles — this is what lets the collapsed rail hide the panes even
  when a tab is selected. `#sidePaneMaps` starts with class `active`;
  `#sidePaneTpls` must NOT carry any inline `style="display:…"`.
- **Add** `.side-rail` (reopen button, shown only when collapsed) and
  `.side-resize` drag handle.
- `.side-foot` stays as-is.

### 2.2 Topbar

The OLD topbar is an absolutely-positioned floating bar. Its children order in the
NEW layout is (keep all existing buttons/IDs, reorder to this):

```html
<div class="topbar">
  <input class="title-edit" id="mapTitle" placeholder="Untitled map" />
  <div class="tb-group">
    <button class="tb" id="undo" title="Undo (Ctrl+Z)">↶</button>
    <button class="tb" id="redo" title="Redo (Ctrl+Y)">↷</button>
  </div>
  <span class="tb-sep"></span>
  <div class="tb-group">
    <button class="tb wide primary" id="addChild" title="Add child (Tab)">＋ Topic</button>
    <button class="tb" id="layout" title="Tidy layout (rearrange topics into a balanced tree)">⟐</button>
    <button class="tb" id="collapseAll" title="Collapse / expand all branches, one level per click">⊟</button>
    <button class="tb" id="mdToggle" title="Markdown mode — edit as text with live preview">&lt;/&gt;</button>
  </div>
  <div class="spacer"></div>
  <div class="search-wrap" id="searchWrap">
    <input id="search" placeholder="Find in nodes…" autocomplete="off" />
    <span class="search-count" id="searchCount"></span>
    <button class="search-toggle" id="allMapsToggle" title="Search across all maps">🌐</button>
    <button class="search-toggle" id="replaceToggle" title="Toggle replace (Ctrl/⌘+H)">⇄</button>
    <input id="replace" placeholder="Replace with…" autocomplete="off" />
    <button class="search-act" id="replaceOne" title="Replace next match">Replace</button>
    <button class="search-act" id="replaceAll" title="Replace all matches">All</button>
  </div>
  <span class="tb-sep"></span>
  <div class="tb-group">
    <button class="tb" id="searchBtn" title="Search">⌕</button>
    <button class="tb" id="varsBtn" title="Map variables — set {{placeholder}} defaults">{ }</button>
    <button class="tb" id="themeBtn" title="Theme">🎨</button>
    <button class="tb" id="menuExport" title="Export">⤓</button>
    <button class="tb" id="focusBtn" title="Focus mode (Esc to exit)">⛶</button>
    <button class="tb donate-btn" id="donateBtn" title="Support MindSpark">♥</button>
  </div>
</div>
```

Rules:
- All toolbar buttons stay identical; only `#toggleSide` **moves out** of the topbar
  into the sidebar brand. No other button moves.
- Add `.tb-sep` hairline spans at the two boundaries shown (undo/redo ↔ topic group,
  and search ↔ right cluster). The spacer `.spacer` sits between the topic group and
  the search wrap.

### 2.3 Statusbar (NEW element)

Insert directly inside `.app`, after `.stage` (i.e. between `.stage`'s closing tag and
`.app`'s closing tag):

```html
<div class="statusbar" id="statusBar">
  <div class="hint" id="hint">
    <button class="close" id="hintClose">×</button>
    <span class="hint-text"><b>Tab</b> child · <b>Enter</b> sibling · <b>↑↓←→</b> navigate · <b>F2</b>/dbl-click edit · <b>L</b> link · <b>Del</b> remove · <b>?</b> all shortcuts</span>
  </div>
  <div class="sb-right">
    <div class="save-pill" id="savePill"><span class="ring"></span><span id="saveText">Saved</span></div>
    <div class="token-total" id="tokenTotal" title="Rough estimate of total tokens across all nodes (~4 chars/token)"></div>
    <div class="user-pill" id="userPill" style="display:none">
      <img id="userAvatar" alt="" />
      <span id="userName"></span>
      <button id="userSignOut" title="Sign out">⏻</button>
    </div>
  </div>
  <div class="overview" id="overview">
    <div class="minimap" id="minimap" title="Overview — click to jump"></div>
    <div class="zoom-row">
      <button id="zoomOut" title="Zoom out">－</button>
      <input type="range" id="zoomSlider" min="10" max="300" step="1" value="100" aria-label="Zoom level" />
      <button id="zoomIn" title="Zoom in">＋</button>
      <div class="zoom-val" id="zoomVal" title="Click to set custom zoom %">100%</div>
      <button id="zoomFit" title="Fit all topics to screen (camera only)">⊡</button>
    </div>
    <button class="overview-toggle" id="overviewToggle" title="Collapse overview" aria-label="Collapse overview">▾</button>
  </div>
</div>
```

Rules:
- The `.hint` element **moves here** from its old floating position (it was
  `position:absolute; bottom:18px; left:18px`). Its text now lives in the
  `.hint-text` span (keep `#hintClose`).
- The `.minimap` element **moves here** from its old fixed bottom-right spot, inside
  the `.overview` chip.
- **Remove** the old `.zoombar` markup (zoom out / 100% / zoom in / fit buttons) from
  the stage. Its functions are covered by `#zoomOut`, `#zoomIn`, `#zoomVal`,
  `#zoomFit` and the new `#zoomSlider` above.
- Save-pill / token-total / user-pill keep their IDs; they are wrapped in `.sb-right`.

### 2.4 Breadcrumb and toast

- `.breadcrumb#breadcrumb` stays inside `.stage` (as before).
- `.toast#toast` stays inside `.stage`.

---

## 3. styles.css changes

Apply these substitutions to OLD styles.css. Keep every rule not mentioned here
(theme definitions, nodes, markdown pane, templates popup, login, etc.).

### 3.1 App grid (replace OLD rule at old line 170)

```css
/* Three rows: a top header, the main content, and a status bar. Both bars
   span only the tracks to the right of the sidebar (they start beside it,
   not above/below it); .side spans all three rows and .stage is placed
   explicitly so nothing is left to auto-placement. */
.app{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto minmax(0,1fr) auto;height:calc(100vh / var(--ui-zoom, 1));height:calc(100dvh / var(--ui-zoom, 1))}
.topbar{grid-column:2 / -1;grid-row:1}
.side{grid-column:1;grid-row:1 / 4}
.stage{grid-column:2;grid-row:2}
.statusbar{grid-column:2 / -1;grid-row:3}
/* Markdown mode: split pane (editor | live map) */
body.md-ready .app{grid-template-columns:auto auto minmax(0,1fr)}   /* md pane takes the middle track once it exists */
#mdPane{width:0;overflow:hidden;position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;background:var(--paper);border-right:1px solid var(--line);transition:width .22s cubic-bezier(.4,0,.2,1);grid-column:2;grid-row:2}
body.md-ready .stage{grid-column:3;grid-row:2}
body.md-mode #mdPane{width:var(--md-w,40vw)}
body.md-resizing #mdPane{transition:none}                            /* no easing while dragging the divider */
@media (prefers-reduced-motion: reduce){ #mdPane{transition:none} }
```

### 3.2 Sidebar (replace old lines 270–271 and add)

```css
.side{width:268px;min-height:0;position:relative;background:var(--chrome);border-right:1px solid var(--chrome-edge);display:flex;flex-direction:column;transition:width .22s cubic-bezier(.4,0,.2,1),background-color .3s ease,border-color .3s ease}
.side.collapsed{width:36px;border:none}                 /* icon rail instead of fully gone */
.side.resizing{transition:none}
.side.collapsed .brand{display:none !important}  /* never bleed into the slim rail */
.side.collapsed .side-tabs,
.side.collapsed .side-pane,
.side.collapsed .side-foot,
.side.collapsed .side-resize{display:none}
.side-rail{display:none;width:36px;flex:1 0 auto;justify-content:center;align-items:center}
.side.collapsed .side-rail{display:flex}
.side-rail .tb{background:none;border:none}
/* Drag handle on the sidebar's right edge (desktop only) */
.side-resize{position:absolute;top:0;right:-4px;width:8px;height:100%;cursor:col-resize;z-index:10;opacity:0;transition:opacity .15s}
.side-resize:hover,.side-resize:active{opacity:.55;background:var(--accent)}
.side-tabs{display:flex;gap:2px;padding:0 10px 10px}
.side-tab{flex:1;padding:7px 6px;border:none;background:none;border-radius:9px;font-family:inherit;font-size:12.5px;font-weight:600;color:var(--ink-soft);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap}
.side-tab:hover{background:var(--hover);color:var(--ink)}
.side-tab.active{background:var(--paper-2);color:var(--ink)}
.side-pane{flex:1;min-height:0;display:flex;flex-direction:column}
/* Tab switching is class-based (never inline styles) so the collapsed-rail
   rules always win: `.side-pane:not(.active)` is hidden, the active pane is
   shown, and `.side.collapsed` (declared later + !important) hides everything
   inside the slim rail. */
.side-pane.active{display:flex}
.side-pane:not(.active){display:none}
```

Brand header — replace `.brand{...}` (old line 273) with:

```css
.brand{display:flex;align-items:center;gap:10px;padding:18px 18px 14px}
.brand .mark{flex:0 0 auto; filter:drop-shadow(0 1px 3px rgba(40,30,15,.2))}
.brand h1{font-family:var(--serif);font-weight:900;font-size:22px;margin:0;letter-spacing:-.5px}
.brand h1 span{color:var(--accent)}
.brand #newMap,
.brand #toggleSide{width:32px;height:32px;flex:0 0 auto;font-size:16px}
.brand #newMap{margin-left:auto}
.brand #newMap:hover,
.brand #toggleSide:hover{background:var(--hover)}
```

**Delete** the whole `.new-map-row`/`.new-map`/`.new-map-caret` block (old lines
1313–1327) and the `.tpl-pop` popover rules (old lines 1329–1352ish, including the
`:root[data-look=…] .tpl-pop` overrides at old lines 665, 709, 745 and the
`--look-radius` combined rule at old 764) — the template picker is now the sidebar
Templates tab, so the popover and its caret are dead code. (Leave `.tpl-pop` rules
that other code may still reference only if you keep `showTemplatesMenu`; the NEW
layout removes both — see §4.3.)

### 3.3 Topbar strip (replace old line 310)

```css
.topbar{display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--chrome);border-bottom:1px solid var(--chrome-edge);z-index:30;flex-wrap:wrap;row-gap:4px;min-width:0}
```

Flatten the old chrome-pill `.tb-group` (old line 312):

```css
.tb-group{display:flex;align-items:center;gap:2px;padding:0;background:none;border:none;border-radius:0;box-shadow:none}
```

Add separators and keep `.tb`/`.title-edit` as in the old file (unchanged), plus:

```css
.tb-sep{width:1px;height:26px;background:var(--chrome-edge);flex:0 0 auto}
.spacer{flex:1}
```

Search wrap — replace old lines 322–324 with a flat, pill-only-when-open style:

```css
.search-wrap{display:flex;align-items:center;background:none;border:none;border-radius:0;box-shadow:none;overflow:hidden;width:0;transition:width .22s,background-color .3s ease,border-color .3s ease,color .3s ease}
.search-wrap.open{width:230px;background:var(--paper-2);border-radius:9px}
.search-wrap.open.replace-mode{width:420px}
```

### 3.4 Status bar (NEW block)

```css
.statusbar{display:flex;align-items:center;gap:14px;padding:5px 14px;background:var(--chrome);border-top:1px solid var(--chrome-edge);min-height:34px;font-family:var(--sans)}
.statusbar .hint{
  display:flex;align-items:center;gap:6px;position:static;margin:0;
  background:none;border:none;box-shadow:none;border-radius:0;padding:0;
  font-size:12px;color:var(--ink-soft);max-width:70%;line-height:1.5;flex:1;min-width:0;
}
.statusbar .hint b{color:var(--ink);font-weight:600}
.statusbar .hint .hint-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.statusbar .hint .close{border:none;background:none;color:var(--ink-soft);font-size:14px;line-height:1;padding:2px 5px;border-radius:5px;cursor:pointer;flex:0 0 auto}
.statusbar .hint .close:hover{background:var(--hover);color:var(--ink)}
.statusbar .save-pill,
.statusbar .token-total{font-size:11.5px;padding:4px 11px;box-shadow:none}
.statusbar .user-pill{height:28px;font-size:12px}
.statusbar .user-pill img{width:20px;height:20px}
.sb-right{margin-left:auto;display:flex;align-items:center;gap:10px;flex:0 0 auto}
```

**Delete** the old floating `.hint` rule (old lines 349–352: `position:absolute;
bottom:18px;left:18px; …`) — the statusbar rules above take over. Keep the
`.hint kbd` rule (still used).

### 3.5 Overview chip + zoom + minimap (replace old `.zoombar` and `.minimap`)

**Delete** the old `.zoombar` block (old lines 343–345) and old `.minimap` block
(old lines 1660–1669: `position:fixed;bottom:18px;right:72px;width:168px;height:120px`).

Add:

```css
/* ===== Bottom controls — one "overview" card ===== */
.overview{flex:0 0 auto;display:flex;align-items:center;gap:7px;padding:2px 6px;border-radius:8px}
.overview:hover{background:var(--hover)}
.overview .minimap{position:static;border-radius:6px;box-shadow:none}
.zoom-row{display:flex;align-items:center;gap:3px}
.zoom-row button{border:none;background:none;width:28px;height:26px;border-radius:7px;font-size:15px;color:var(--ink);flex:0 0 auto;display:grid;place-items:center}
.zoom-row button:hover{background:var(--hover)}
#zoomSlider{flex:1;min-width:0;width:70px;accent-color:var(--accent);height:16px;margin:0;cursor:pointer}
.zoom-val{font-size:11px;text-align:center;color:var(--ink-soft);font-weight:600;padding:3px 4px;border-radius:5px;cursor:pointer;min-width:38px;outline:none;flex:0 0 auto}
.zoom-val:hover{background:var(--hover);color:var(--ink)}
.zoom-val[contenteditable="true"]{background:#fff;box-shadow:0 0 0 2px var(--accent);color:var(--ink)}
.overview-toggle{border:none;background:none;color:var(--ink-soft);font-size:11px;width:22px;height:22px;flex:0 0 auto;border-radius:6px;cursor:pointer;display:grid;place-items:center;transition:transform .18s}
.overview-toggle:hover{background:var(--hover);color:var(--ink)}
.overview.collapsed{padding:2px}
.overview.collapsed .minimap,
.overview.collapsed .zoom-row{display:none}
.overview.collapsed .overview-toggle{transform:rotate(-90deg)}
```

Keep the minimap internals (`svg`, `#mmView`, `.mm-sel` rules) but size the minimap
down:

```css
.minimap{
  position:relative; z-index:29;
  width:104px; height:50px;
  background:color-mix(in srgb, var(--chrome) 92%, transparent);
  border:1px solid var(--chrome-edge); border-radius:10px;
  box-shadow:var(--shadow); overflow:hidden; cursor:crosshair;
}
.minimap svg{display:block;width:100%;height:100%}
```

### 3.6 Breadcrumb (replace old lines 1642–1657)

```css
.breadcrumb{
  position:fixed; top:56px; left:14px; transform:none;
  display:flex; align-items:center; gap:1px; z-index:90;
  background:var(--chrome); border:1px solid var(--chrome-edge);
  border-radius:10px; box-shadow:var(--shadow); padding:3px 6px;
  max-width:min(70vw, 720px); overflow:hidden; font-family:var(--sans);
  opacity:0; pointer-events:none; transform:translateY(-4px);
  transition:opacity .16s ease, transform .16s ease;
}
.breadcrumb.shown{opacity:1; pointer-events:auto; transform:translateY(0)}
```

Keep `.bc-crumb`, `.bc-sep` rules unchanged (adjust only if they conflict).

### 3.7 Mobile (≤720px) — replace the sidebar parts of the old mobile block

Inside `@media (max-width:720px)`, the collapsed sidebar becomes an off-canvas
overlay (not a rail), and the strips go single-column. Replace the old collapsed
rules with:

```css
.side.collapsed{
  width:min(280px, 86vw);     /* keep width so transform works */
  transform:translateX(-100%);
  border:none; box-shadow:none;
}
/* Off-canvas overlay shows the sidebar contents again — but only the
   ACTIVE pane, and with !important to beat the collapsed-rail rules.
   (The brand stays hidden: the overlay is dismissed by tapping the dimmed
   stage, which closes the sidebar.) */
.side.collapsed .side-tabs{display:flex !important}
.side.collapsed .side-pane.active{display:flex !important}
.side.collapsed .side-foot{display:block !important}
.side.collapsed .side-rail,
.side-resize{display:none !important}       /* no icon rail / resize on touch */
/* Status bar: single-line, hint text shrinks to fit */
.statusbar{padding:4px 10px; gap:8px; grid-column:1; grid-row:3}
.statusbar .hint{max-width:58%}
.statusbar .save-pill{display:none}
.statusbar .token-total{padding:4px 9px; font-size:11px}
/* Dim the canvas while the mobile sidebar is open */
.app:has(.side:not(.collapsed)) .stage::after{
  content:""; position:absolute; inset:0; background:rgba(20,15,8,.35);
  z-index:150; backdrop-filter:blur(1px);
}
.stage{width:100%}
.topbar{padding:7px 8px; gap:4px; grid-column:1; grid-row:1}
.side{grid-column:1; grid-row:2}
.stage{grid-column:1; grid-row:2}
/* Overview chip tighter on phones; minimap hidden */
.overview{gap:4px; padding:2px 4px}
.overview .minimap{display:none}
.zoom-row button{width:32px; height:32px}
```

(Keep all other existing mobile rules; the old mobile `.zoombar{bottom:14px;
right:12px;…}` rule is deleted with the zoombar.)

### 3.8 Focus mode & shared view

- Focus mode (old lines 1278–1286): remove `.zoombar` from the hide list and delete
  the `body.focus-mode .zoombar` rules. Replace `.hint` reference with `.statusbar`:

```css
body.focus-mode .topbar,
body.focus-mode .side,
body.focus-mode .hint,
body.focus-mode .save-pill,
body.focus-mode .user-pill,
body.focus-mode .empty .btn-row,
body.focus-mode .statusbar,
body.focus-mode .search-wrap{display:none !important}
body.focus-mode .app{grid-template-columns:1fr}
body.focus-mode .stage{grid-column:1;grid-row:2;width:calc(100vw / var(--ui-zoom, 1)); height:calc(100vh / var(--ui-zoom, 1)); height:calc(100dvh / var(--ui-zoom, 1))}
```

- Shared view (old ~line 1708+): the `.hint` and `.new-map-row` hide rules now read:

```css
body.shared-view .side,
body.shared-view #newMap,
body.shared-view #menuExport,
body.shared-view #searchBtn,
body.shared-view #varsBtn,
body.shared-view #focusBtn,
body.shared-view #collapseAll,
body.shared-view #mdToggle,
body.shared-view #undo,
body.shared-view #redo,
body.shared-view #layout,
body.shared-view #donateBtn,
body.shared-view .hint,
body.shared-view .save-pill,
body.shared-view .menu-toggle,
body.shared-view #addChild,
body.shared-view #toggleSide{ display:none !important; }
```

and the shared-view grid becomes:

```css
body.shared-view .app{ grid-template-columns:1fr; padding-top:var(--shared-banner-h, 42px); }
body.shared-view .topbar{ grid-column:1; grid-row:1; }
body.shared-view .stage{ grid-column:1; grid-row:2; }
body.shared-view .statusbar{ grid-column:1; grid-row:3; }
body.shared-view .breadcrumb{ top:97px; left:14px; }
body.shared-view #mapTitle{ pointer-events:none; max-width:none; }
```

---

## 4. app.js changes

### 4.1 Zoom constants (old line 5367)

```js
const MM_W=168, MM_H=120;   // OLD  →  const MM_W=104, MM_H=50;
```

Everything downstream (`Math.min(MM_W/cw, MM_H/ch)`, `mm.innerHTML=…<svg viewBox="0 0 ${MM_W} ${MM_H}"…`) keeps working unchanged; the svg is now stretched to 104×50 by CSS.

### 4.1b Sidebar tabs — class-based switching (replace any inline `style.display` logic)

The Maps/Templates tab handler must toggle a class, NOT inline styles — otherwise
the active pane's inline `display:flex` would beat the collapsed-rail CSS and leak
("Your maps" visible inside the 36px rail). Implementation:

```js
function setSideTab(tab){
  const maps=tab==='maps';
  $('#sidePaneMaps').classList.toggle('active',maps);
  $('#sidePaneTpls').classList.toggle('active',!maps);
  $('#sideTabMaps').classList.toggle('active',maps);
  $('#sideTabTpls').classList.toggle('active',!maps);
  if(!maps) renderTplList();
}
$('#sideTabMaps').onclick=()=>setSideTab('maps');
$('#sideTabTpls').onclick=()=>setSideTab('tpls');
```

### 4.2 Sidebar toggle — replace the inline handler (old lines 8518–8537) with a named function

```js
let _sideExpandedW = 268;   // cached logical width of the expanded sidebar
const SIDE_RAIL_W = 36;     // collapsed rail width (desktop)
function toggleSidePanel(){
  const side=$('#side');
  // On phones the sidebar is a transform overlay (stage keeps full width), so no
  // reframe is needed there — let CSS slide it.
  const overlay = window.matchMedia('(max-width: 720px)').matches;
  const z=(typeof _uiZ==='function'?(_uiZ()||1):1);
  const sbNow = side.getBoundingClientRect().width / z;
  // IMPORTANT: clear any inline width the resize handle may have set, so the
  // CSS `width:36px` (collapsed) / `width:268px` (expanded) rules apply.
  const wasExpanded = !side.classList.contains('collapsed');
  if(wasExpanded && sbNow > 1) _sideExpandedW = sbNow;   // remember the expanded width
  if(wasExpanded) side.style.width='';                    // let CSS take over on collapse
  else side.style.width = Math.max(_sideExpandedW, SIDE_RAIL_W+1)+'px';  // restore user width
  // Capture the map-point at the viewport centre BEFORE the width changes.
  let cx,cy,has=false;
  if(map && !overlay){ const {w:SW,h:SH}=_stageSize(); cx=(SW/2-view.x)/view.k; cy=(SH/2-view.y)/view.k; has=isFinite(cx)&&isFinite(cy); }
  side.classList.toggle('collapsed');
  if(has){
    const collapsing = side.classList.contains('collapsed');
    const {w:W0, h:H0} = _stageSize();           // still the pre-animation size this frame
    const W1 = collapsing ? (W0 + _sideExpandedW) : (W0 - _sideExpandedW);
    _reframeSmooth(cx, cy, W1, H0);
  }
}
$('#toggleSide').onclick=()=>toggleSidePanel();
if($('#railToggle')) $('#railToggle').onclick=()=>{ const s=$('#side'); s.classList.remove('collapsed'); s.style.width=Math.max(_sideExpandedW, SIDE_RAIL_W+1)+'px'; };
```

Wire `#newMap` (it already had `$('#newMap').onclick=createMap;` at old line 8399 —
keep it; it now targets the brand button since the HTML moved it). **Remove** old line
8400 (`$('#newMapMenu')?.addEventListener(…)`).

### 4.3 Remove the template popover

- **Delete** `showTemplatesMenu()` (old lines 5759–~5795) and any reference to it.
- **Delete** `#newMapMenu` / `.new-map-row` references anywhere in app.js.
- Remove `.tpl-pop` from `closeAllMenus()` (it should still close `.row-pop`,
  `.picker`, `.theme-panel`, `.export-pop`).

### 4.4 Overview chip JS (NEW)

```js
const _overviewEl = $('#overview');
const _overviewToggle = $('#overviewToggle');
const _overviewCollapsed = localStorage.getItem('mindspark:overviewCollapsed')==='1';
_overviewEl.classList.toggle('collapsed', _overviewCollapsed);
_overviewToggle.title = _overviewCollapsed ? 'Expand overview' : 'Collapse overview';
_overviewToggle.setAttribute('aria-label', _overviewToggle.title);
_overviewToggle.addEventListener('click', () => {
  const c = _overviewEl.classList.toggle('collapsed');
  localStorage.setItem('mindspark:overviewCollapsed', c ? '1' : '0');
  _overviewToggle.title = c ? 'Expand overview' : 'Collapse overview';
  _overviewToggle.setAttribute('aria-label', _overviewToggle.title);
});
```

Place near the other DOM init code (after `_stageSize` helpers exist).

### 4.5 Breadcrumb sync (replace `display`-based show/hide)

The old code used `bc.style.display='flex'`/`'none'`. Replace with a `.shown` class
synced from two flags: `_has` (breadcrumb has ≥2 crumbs) and `_ov` (overview chip is
hovered or focused). Whenever crumbs are rebuilt or the overview enters/leaves hover,
run:

```js
function syncBreadcrumb(){
  const bc=$('#breadcrumb');
  bc.classList.toggle('shown', !!(bc._has && bc._ov));
}
```

Attach mouseenter/mouseleave/focus/blur listeners on `#overview` to set `_ov`
and call `syncBreadcrumb()`; after every crumb rebuild set `bc._has` (true when
`crumbs.length >= 2`) and call `syncBreadcrumb()`. No other `display` manipulation on
the breadcrumb.

### 4.6 Zoom slider (NEW)

The old repo already exposes `zoom(f)` (factor, animated, zoom() at old line 5041)
and `setZoom(percent)` (old line 5047), plus `userZoom` (current factor, 1 = 100%)
and `applyView()`. Wire the range input through these:

```js
$('#zoomSlider').addEventListener('input', e=>{
  setZoom(Number(e.target.value));
});
```

Clamp the input to the same limits as `setZoom` (10–300; `setZoom` clamps 0.1–3.0).
Also keep `#zoomSlider.value` in sync with `userZoom*100` wherever the zoom changes:
the wheel handler (old line 5037), `zoom()` (old 5041), `setZoom` (old 5047), `#zoomFit`
(old 8492) and the dblclick zoom. E.g. add `$('#zoomSlider').value=Math.round(userZoom*100);`
to each. `#zoomVal` text stays the existing percentage display; `#zoomVal` click →
editable input → on Enter `parseFloat` (clamp 10–300) → `setZoom` → blur exits edit.

### 4.7 Cached minimap element

If the old code queries `#minimap` by id at render time each frame, cache it once at
init: `const _mmEl = $('#minimap');` and reuse. (The minimap now lives in the
statusbar; its `getBoundingClientRect()` is no longer the stage-relative one — verify
any pointer↔map coordinate math uses the minimap's own rect, which still works since
it uses `mm.getBoundingClientRect()`.)

---

## 5. Acceptance checklist

Visual (desktop, ≥721px):
1. Topbar is a solid strip with a bottom hairline; toolbar buttons have **no** chrome
   pill behind them; search is flat until opened, then gets a rounded `--paper-2`
   background.
2. Sidebar spans the full height (all three rows); brand header shows ☰ and ＋
   buttons; no "＋ New mind map" dashed row, no caret, no template popover.
3. Collapsing the sidebar leaves a 36px rail with a centered ☰ that reopens it to the
   previous width. The canvas reframes smoothly (center point stays put).
4. No floating `.zoombar`; bottom-right shows one overview chip: 104×50 minimap,
   zoom − slider ＋, `100%` readout, ⊡ fit, and a ▾ chevron.
5. Clicking ▾ collapses the chip to just the chevron (rotated −90°), persisted across
   reloads (localStorage `mindspark:overviewCollapsed`).
6. Hint text sits at the statusbar's left, ellipsizes when the bar is narrow, and the
   × close button works.
7. Breadcrumb is invisible; moving the mouse over the overview chip fades it in under
   the topbar's left edge (top:56px,left:14px); leaving hides it again.
8. Zoom slider works and stays in sync with zoom buttons, wheel, and fit.
9. Theme switch: instant recoloring with smooth CSS transitions, no white fade veil.

Behavioral:
10. `#newMap` creates a new map (id wired as before); `#toggleSide` works from the
    brand; `#railToggle` opens from the rail.
11. Markdown mode still works: `#mdPane` appears in the middle track, stage shifts to
    column 3.
12. Focus mode (⛶) hides topbar/sidebar/statusbar, canvas full-bleed, Esc exits.
13. Shared view (`#view=`) hides chrome, single column, banner padding intact,
    breadcrumb at top:97px.
14. Mobile ≤720px: sidebar is an off-canvas overlay (slides from left), stage dims
    with the `:has()` overlay, statusbar is single-line, minimap hidden.
15. `npm test` (393 server tests) still passes; `node --check public/app.js` clean.

## 6. Verification commands

```bash
node --check public/app.js
npm test
```

Manual smoke: `node server.js`, open `http://localhost:PORT`, go through the
checklist; also test with the devtools mobile emulator at 375×667 and in a shared
view URL.
## App-shell layouts (theme panel → App layout)

The theme panel's "App layout" section switches between eight shells, persisted
in `mindspark:uiLayout`. `applyUiLayout(id)` reparents the SAME DOM elements
(nothing is hidden or cloned) and toggles one `ui-*` body class; the
corresponding CSS block restyles them. New shells are added by: a `UI_LAYOUTS`
entry, a `buildUiLayoutThumb` SVG, a branch in `applyUiLayout`, and a CSS block.

1. **modern** — topbar + sidebar + statusbar with overview chip.
2. **classic** — upstream floating shell: toolbar strip, minimap card (right:72)
   and vertical zoombar (right:18) float over the canvas; sidebar = brand +
   wide "＋ New mind map" row with ▾ caret; breadcrumb always visible.
3. **rail** — the toolbar becomes a vertical icon rail (side | rail | stage);
   title, save pill, minimap and zoombar float over the canvas.
4. **zen** — canvas only; chrome slides in when the pointer nears the top edge
   (`body.zen-chrome`, `wireZen()`).
5. **dock** — the status bar becomes a full-width dock owning the sidebar
   toggle, Maps/Templates tabs, hint and overview; the sidebar slides over the
   canvas (`body.side-open`, closed by clicking outside).
6. **split** — the markdown pane pinned open as a permanent third column
   (side | editor | canvas); md-toggle and pane-close hidden.
7. **minimal** — topbar + canvas + statusbar, no sidebar at all.
8. **mirror** — identical to classic but flipped (toolbar right-aligned, minimap
   + zoombar bottom-left, hint bottom-right). It carries `ui-classic` too, so
   every classic rule applies; only positions are mirrored.

Independent of the shell: a **presentation mode** (▶ button) walks the map
breadth-first node by node with a slim control bar; the **outline dock** (▤
button, `ui-outline` layout) shows a live tree panel beside the canvas; and a
**tabbed workspace** (▭ button) keeps several maps open as browser-style tabs,
each tab holding a deep-cloned map that autosaves on switch (`flushPendingSave`
is bound to the outgoing map's own object). Tab strip occupies grid row 2 of
the base app grid (collapses to 0 when hidden); floating shells hide it.
