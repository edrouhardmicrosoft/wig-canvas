## Phase 1 — Foundation (Weeks 1–2)

[ ] Initialize pnpm workspace (root `package.json`, `pnpm-workspace.yaml`) with packages `core/`, `cli/`, `daemon/`.
[ ] Verify pnpm workspace: `pnpm -w -r list` runs and shows `core`, `cli`, `daemon` packages.

[ ] Add root TypeScript tooling: `tsconfig.json` (build + dev), ensure all packages extend it.
[ ] Verify TypeScript config: `pnpm -w typecheck` succeeds and each package extends the root config.

[ ] Add root lint/format baseline (ESLint + Prettier) and minimal scripts (`lint`, `format`, `typecheck`, `build`).
[ ] Verify lint/format: `pnpm -w lint` and `pnpm -w format --check` succeed.

[ ] Create `packages/core` package scaffold with exports set up (`types`, `errors`, `protocol`).
[ ] Verify `core` package build: `pnpm -w --filter @wig/canvas-core build` produces dist outputs and exports resolve.

[ ] Define shared protocol types in `packages/core` (Request/Response envelope, ids, method names, params/result typing, format enums).
[ ] Verify protocol types compile: `pnpm -w --filter @wig/canvas-core typecheck` succeeds and a sample import compiles.

[ ] Define shared error codes + error schema in `packages/core` (including `param`, `retryable`, `category`). Establish stable error code ranges (1xxx/2xxx/3xxx/4xxx/5xxx/9xxx).
[ ] Verify error schema: add a small type-level test or sample file that constructs one error object per range and compiles.

[ ] Decide and document the default IPC transport: Unix domain socket (mac/linux) + Windows named pipe.
[ ] Verify transport decision is reflected in docs/tasks (search for “socket” and ensure it matches UDS/pipe language; no TCP default).

[ ] Create `packages/daemon` package scaffold with a `canvasd` entrypoint (`bin` or `node dist/index.js`).
[ ] Verify daemon entrypoint: `node packages/daemon/dist/index.js --help` (or equivalent) runs without crashing.

[ ] Implement daemon state dir + transport endpoint selection:
    - mac/linux: Unix domain socket path (under per-user state dir)
    - windows: named pipe name
    Ensure the default is local-only and has safe permissions.
[ ] Verify endpoint: `canvas daemon status` prints resolved endpoint info and it is usable on this OS.

[ ] Implement protocol handshake/version reporting (daemon returns protocol/client compatibility info in `daemon.status`).
[ ] Verify handshake: mismatched versions return a 1xxx error with a clear upgrade suggestion.

[ ] Implement daemon IPC server skeleton (accept connection, parse JSON messages, write JSON responses).
[ ] Verify IPC roundtrip: a minimal `ping` method returns `{ ok: true }` from CLI to daemon.

[ ] Implement daemon lifecycle commands: start, stop, status (status includes pid, socket path, version).
[ ] Verify lifecycle: `canvas daemon start`, `canvas daemon status`, and `canvas daemon stop` behave correctly.

[ ] Create `packages/cli` package scaffold with `canvas` bin entry and Commander command tree.
[ ] Verify CLI help: `canvas --help` renders, includes subcommands, and exits 0.

[ ] Implement CLI→daemon connection helper (connect to socket, send request, read response).
[ ] Verify CLI→daemon helper: unit test or smoke test sends `ping` and receives response.

[ ] Implement `canvas daemon start|stop|status` commands (thin client calling daemon methods).
[ ] Verify daemon commands: each command returns valid output in both text and `--format json`.

[ ] Add Playwright dependency + minimal browser manager in daemon (launch Chromium in headless mode).
[ ] Verify Playwright launch: daemon can launch and close a browser cleanly without leaking processes.

[ ] Implement `connect` capability in daemon: open a page and navigate to provided URL (store session in daemon memory).
[ ] Verify connect: `canvas connect http://example.com` returns success and `canvas status` shows connected URL/session.

[ ] Implement `disconnect` capability in daemon: close active page/context and clear session state (daemon remains running).
[ ] Verify disconnect: `canvas disconnect` clears session and `canvas status` returns disconnected state.

[ ] Implement `status` capability in daemon (session status): connected URL, browser engine, viewport defaults, watch paths.
[ ] Verify session status: `canvas status --format json` prints a single JSON object with expected keys.

[ ] Implement `canvas connect <url>` CLI command (calls daemon connect; returns a friendly stdout summary).
[ ] Verify connect output: `canvas connect <url> --format json` prints a single JSON object on stdout and logs only on stderr.

[ ] Implement `canvas disconnect` CLI command.
[ ] Verify disconnect output: returns `{ ok: true }` (or equivalent) and does not shut down the daemon.

[ ] Implement `canvas status` CLI command (session status, distinct from `canvas daemon status`).
[ ] Verify `canvas status`: returns disconnected/connected state correctly in both text and json.

[ ] Implement screenshot storage helper: ensure `.canvas/screenshots/` exists under current working directory.
[ ] Verify screenshot dirs: running `canvas screenshot` creates `.canvas/screenshots/` and writes a PNG.

[ ] Implement `screenshot` capability (viewport): `page.screenshot()` with `--out` support.
[ ] Verify viewport screenshot: file exists, is non-empty, and `file <path>` reports PNG.

[ ] Implement `canvas screenshot` CLI command for viewport screenshots (`--out` optional; default timestamp path).
[ ] Verify default path: calling without `--out` writes to `.canvas/screenshots/<timestamp>.png`.

[ ] Implement screenshot defaults for stability (viewport 1280x720, deviceScaleFactor=1, reduced motion on; override flags optional for later).
[ ] Verify screenshot defaults: repeated screenshots of a static page are byte-stable or visually identical within threshold.

[ ] Implement element screenshot capability: `locator.screenshot()` for a provided selector.
[ ] Verify element screenshot: `canvas screenshot "body" --out ./tmp/body.png` succeeds and output is PNG.

[ ] Implement `canvas screenshot <selector>` CLI support (element screenshot).
[ ] Verify selector handling: invalid selector returns structured error with `code` in 3xxx range and `param: "selector"`.

[ ] Add basic stdout/stderr discipline: stdout only prints result payload; logs go to stderr.
[ ] Verify stdout/stderr separation: in `--format json` mode, stdout is parseable JSON with no extra text.

[ ] Add `--format` plumbing to CLI (accepted but can be no-op in Phase 1 except for json/text wrapper).
[ ] Verify `--format`: `canvas screenshot --format json` returns JSON and `--format text` returns a human summary.

[ ] Add minimal integration test script (one smoke test that starts daemon, connects to a URL, takes a screenshot).
[ ] Verify integration test: `pnpm -w test` (or `pnpm -w smoke`) runs green on a clean machine.

---

## Phase 2 — Describe & Inspect (Weeks 3–4)

[ ] Define output formats contract in `packages/core` (`text|json|yaml|ndjson`) and a shared result envelope shape.
[ ] Verify result envelopes: each CLI command returns `{ ok: true, ... }` (or `{ ok: false, error: ... }`) consistently.

[ ] Implement CLI output renderer layer (text/json/yaml) used by all commands.
[ ] Verify renderer: golden tests validate stable text and JSON outputs for one sample payload.

[ ] Implement `styles` capability: compute styles via `locator.evaluate(getComputedStyle)` returning selected props.
[ ] Verify styles: `canvas styles "body" --props color,display --format json` returns those keys.

[ ] Implement `canvas styles <selector> --props ...` CLI command (defaults to a sensible property set).
[ ] Verify defaults: `canvas styles "body"` returns a stable default set of props.

[ ] Implement DOM semantic snapshot capability (minimal): return accessibility snapshot + basic metadata (selector, url).
[ ] Verify DOM snapshot: `canvas dom --format yaml` produces valid YAML and includes ARIA roles/names.

[ ] Implement `canvas dom [selector] --depth <n>` CLI command (initially depth is best-effort).
[ ] Verify depth: `--depth 1` returns fewer nodes than `--depth 3` (or explicitly documents best-effort behavior).

[ ] Add bounding box extraction in DOM snapshot (x/y/width/height per key node where possible).
[ ] Verify bounding boxes: JSON output includes numeric box values for at least the root or selected node.

[ ] Implement visibility + disabled state extraction for described elements.
[ ] Verify visibility/disabled: selecting a disabled button reports disabled=true; hidden elements report visible=false.

[ ] Implement heuristic “describe” engine (no LLM): templates powered by role/name, box size, key styles.
[ ] Verify describe stability: same page state yields identical text output (no randomness).

[ ] Implement `canvas describe <selector>` returning natural language by default.
[ ] Verify describe text: output includes role/name + size summary + at least one style cue.

[ ] Implement `canvas describe <selector> --format json` returning structured data.
[ ] Verify describe JSON: includes selector, role/name, box, and a small list of summarized children.

[ ] Implement YAML output for `dom`/`describe` using ARIA-style snapshot format where applicable.
[ ] Verify YAML output: YAML parses and resembles ARIA snapshot structure (roles, names, levels).

[ ] Add selector hinting: when selector fails, include small “nearby candidates” list in error `suggestion`.
[ ] Verify selector hinting: a known-bad selector returns suggestion text and is marked retryable.

[ ] Add deterministic text formatting rules (line breaks, indentation, stable ordering) for agent friendliness.
[ ] Verify formatting: add snapshot tests so formatting changes are intentional.

---

## Phase 3 — Visual Diff (Weeks 5–6)

[ ] Create `.canvas/diffs/` directory management and a metadata record format for diff runs.
[ ] Verify diff artifacts: running `canvas diff` creates a diff PNG in `.canvas/diffs/`.

[ ] Implement screenshot “baseline” pointer logic (what “last” means) using timestamps and/or manifest.
[ ] Verify baseline: `canvas diff --since last` picks the most recent baseline deterministically.

[ ] Define and implement behavior when no baseline exists (initialize baseline on first diff; not an error).
[ ] Verify baseline init: on an empty `.canvas/`, `canvas diff --since last` returns `baselineInitialized: true` and `mismatchedRatio: 0`.

[ ] Add `pixelmatch` + `pngjs` dependencies and implement image decode/encode helpers.
[ ] Verify image helpers: unit test decodes and re-encodes a PNG without throwing.

[ ] Implement diff computation (mismatched pixels, ratio) and diff image output path selection.
[ ] Verify diff results: diff output includes mismatchedPixels and mismatchedRatio fields.

[ ] Implement coarse changed-region detection (simple bounding boxes from diff mask).
[ ] Verify regions: when two known images differ, regions array is non-empty.

[ ] Implement `canvas diff --since last` returning: mismatched ratio, diff image path, changed regions.
[ ] Verify `diff` json: output is parseable JSON, includes `diffPath`, `baselinePath`, `currentPath`.

[ ] Implement natural language diff summary (e.g., “3 regions changed; largest change near top-right”).
[ ] Verify diff text: output includes a count of regions and a short description.

[ ] Implement `canvas diff --since <timestamp>` selecting the correct baseline screenshot.
[ ] Verify timestamp resolution: invalid timestamps return a 5xxx error with a suggestion.

[ ] Implement “auto-update baseline” behavior after diff completes (write/update baseline marker).
[ ] Verify baseline update: re-running `canvas diff --since last` after update yields zero changes (when UI unchanged).

[ ] Add configurable threshold option for diff noise handling (`--threshold`).
[ ] Verify threshold: higher threshold reduces mismatched pixels for the same image pair.

---

## Phase 4 — Watch Mode (Week 7)

[ ] Implement `--watch <path>` option on `canvas connect` that tells daemon to watch that directory.
[ ] Verify watch registration: daemon status shows the watch path(s) being monitored.

[ ] Add Chokidar watcher in daemon (emit `file_changed` events with path + timestamp).
[ ] Verify file events: touching a file under watch path emits `file_changed` via `canvas watch`.

[ ] Implement injected HMR listener script and load it into the page on connect:
    - Vite: `import.meta.hot`
    - Webpack/Next (webpack): `module.hot` status hooks
    - Next (Turbopack): best-effort detection (may fall back to mutation heuristic)
[ ] Verify HMR events: making a real UI change produces `hmr_start` and `hmr_complete` events (or a documented fallback event for Turbopack).

[ ] Implement DOM-settled heuristic (quiet window + max wait) used after HMR completion before emitting `ui_ready`.
[ ] Verify DOM-settled: force a delayed render (e.g. setTimeout state update) and ensure `ui_ready` waits for the final mutation burst.

[ ] Implement fallback “UI changed” detector (MutationObserver + debounce) if HMR hooks unavailable.
[ ] Verify fallback: on a project without HMR hooks, DOM mutations still emit a “ui_changed” style event.

[ ] Implement “UI ready” heuristic after HMR complete (debounce + stable DOM check).
[ ] Verify ui_ready: `ui_ready` is emitted after `hmr_complete` and not before.

[ ] Implement daemon event bus that emits events to subscribers.
[ ] Verify multi-subscriber: two `canvas watch` processes both receive events.

[ ] Implement `canvas watch --format ndjson` CLI command that subscribes and streams events to stdout.
[ ] Verify NDJSON: each line is a valid JSON object; no multi-line records.

[ ] Ensure watch stream uses NDJSON (one JSON object per line) and never mixes stderr logs into stdout.
[ ] Verify clean stream: `canvas watch --format ndjson | jq .` works without parse errors.

[ ] Implement clean shutdown handling (SIGINT) for `canvas watch` (flush and exit 0).
[ ] Verify shutdown: sending Ctrl+C closes without leaving the daemon or endpoint in a bad state.

[ ] Implement daemon graceful shutdown (stop accepting requests, close watchers, close Playwright) with a force-timeout fallback.
[ ] Verify shutdown policy: daemon exits cleanly under normal conditions and does not hang indefinitely.

---

## Phase 5 — A11y + Polish (Week 8)

[ ] Add `@axe-core/playwright` integration in daemon and implement `a11y` capability for page or selector scope.
[ ] Verify axe runs: `canvas a11y --format json` returns an `axe`-like results object with violations array.

[ ] Implement `canvas a11y [selector] --level A|AA|AAA` with default AA.
[ ] Verify level: different levels change the applied rule tags or filtering behavior.

[ ] Implement natural language a11y summary output (top violations + impacted nodes).
[ ] Verify summary: text output includes violation count and at least one element hint.

[ ] Implement `--browser chromium|firefox|webkit` option wired end-to-end (daemon launches selected engine).
[ ] Verify browsers: running with each engine starts successfully and can screenshot a simple page.

[ ] Add “graceful degradation” notes in outputs when a capability is partial across browsers.
[ ] Verify degradation messaging: in non-Chromium modes, any unsupported feature explains itself (no silent failure).

[ ] Implement daemon auto-start behavior: if CLI can’t connect, it starts daemon and retries once.
[ ] Verify auto-start: after `canvas daemon stop`, running `canvas screenshot` starts daemon automatically.

[ ] Add `--timeout` option to commands that hit the browser (connect/screenshot/describe/dom/styles/a11y).
[ ] Verify timeout: setting a low timeout reliably returns a 2xxx timeout error.

[ ] Add `--retry` option for transient failures (navigation/timeouts) with backoff.
[ ] Verify retry: simulate a transient failure and confirm retry attempts are visible in stderr logs.

[ ] Create `skills/opencode/canvas.yaml` with command descriptions and examples matching the implemented CLI.
[ ] Verify skills file: examples run successfully against a demo dev server.

[ ] Add package publishing metadata (`name: @wig/canvas`, bin name `canvas`, versioning, license).
[ ] Verify package integrity: `npm pack` succeeds and contains built artifacts and bin entry.

[ ] Add minimal README “Quickstart” (install, connect, screenshot, describe, diff, watch, a11y).
[ ] Verify README: commands in README work as written on a clean install.

[ ] Add `canvas doctor` command to print simple diagnostics (daemon reachable, browser installed, endpoint, last error).
[ ] Verify doctor: running `canvas doctor` returns actionable output and exit code indicates pass/fail.

[ ] Add `canvas clean` command to remove `.canvas/` artifacts safely (optionally keep baseline).
[ ] Verify clean: after `canvas clean`, `.canvas/screenshots` and `.canvas/diffs` are empty/removed as expected.

[ ] Add a “Troubleshooting” section (daemon stuck, endpoint issues, OneDrive path issues, browser install issues).
[ ] Verify troubleshooting: each item includes at least one concrete command to diagnose.

---

## (Future) Phase 2 — WYSIWYG Visual Editing (Roadmap Tasks)

[ ] Define a stable element identity strategy (e.g., injected `data-wig-id`) that can survive HMR.
[ ] Verify identity stability: after HMR, the same element can be reselected by id.

[ ] Implement a selection overlay prototype (hover outline + click-to-select) on top of the live page.
[ ] Verify selection overlay: hovering highlights elements and clicking locks selection without breaking page interaction.

[ ] Add resize/drag handles prototype (Moveable) that updates runtime styles for immediate feedback.
[ ] Verify handles: dragging updates element dimensions/position visually and can be cancelled/reverted.

[ ] Implement an inspector popover anchored to selection (Floating UI) with constrained style controls.
[ ] Verify inspector: selecting an element positions the popover correctly and updates when selection changes.

[ ] Define a “style provenance” model (tailwind vs css vs inline) to decide where edits should go.
[ ] Verify provenance: at least one example per source type is classified correctly.

[ ] Implement TSX className patcher (ts-morph or recast) to apply constrained Tailwind changes.
[ ] Verify TSX patch: a controlled edit updates `className` and preserves formatting.

[ ] Implement CSS patcher (PostCSS) for authored stylesheet updates (when provenance says “css”).
[ ] Verify CSS patch: a controlled edit updates the correct rule and survives formatting/linting.

[ ] Implement apply pipeline: gesture → intent → runtime apply → code patch → wait HMR → reselect by id.
[ ] Verify pipeline: editing via UI results in a real source code change and the element stays selected after HMR.

[ ] Add overlay event routing rules so editing tools don’t break app interaction (portal pattern).
[ ] Verify routing: inputs/buttons still work normally when not actively editing.

[ ] Add multi-select + grouping (Selecto) for batch edits.
[ ] Verify multi-select: multiple elements can be selected and a common style edit affects all.

[ ] Add an “escape hatch” to fall back to Tailwind arbitrary values when token mapping fails (optional).
[ ] Verify escape hatch: editing to a non-token value produces an arbitrary utility and still renders correctly.
