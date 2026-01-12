# BUGS.md

Track confirmed issues discovered during development/review.

Conventions:
- Each bug has phases with explicit, checkable steps.
- Mark steps with `[ ]` as you work through them.
- Keep `stdout` deterministic; `stderr` for logs/progress.

---

## BUG-001 — CLI JSON output strips response envelope (breaks contract / smoke tests)

**Severity:** High

**Problem**
The CLI prints only `response.result` (payload) instead of the full daemon response envelope `{ id, ok, result|error }`. This violates the repo contract (“stdout is the API”, stable parseable outputs) and will likely break smoke tests that look for `"ok": true`.

**Scope / likely files**
- `packages/cli/src/index.ts` (CLI formatting/output)
- Any command handlers that currently `console.log(JSON.stringify(response.result))`

### Phase 1 — Identify all envelope-stripping call sites
- [x] Search CLI for `response.result` being printed to stdout
- [x] List commands affected (e.g., `execute`, `connect`, `screenshot`, etc.)
- [x] Confirm current `--format json|ndjson|text` behavior per command

### Phase 2 — Define the output contract per format
- [x] For `--format json`: stdout must be **one JSON object** and should be the **full response envelope**
- [x] For `--format ndjson`: stdout should be **one response envelope per line** (if applicable)
- [x] For `--format text`: produce a stable human-readable summary (stderr for progress)

### Phase 3 — Implement consistent printing
- [x] Update CLI output helpers/handlers to print the envelope for json/ndjson
- [x] Ensure no extra stdout text is emitted in json/ndjson modes
- [x] Keep ordering stable and avoid non-deterministic fields

### Phase 4 — Verify
- [x] Update/confirm smoke test(s) expectations (e.g., `"ok": true` appears)
- [x] Run smoke test(s) locally once tooling exists, or otherwise validate via manual CLI invocation

---

## BUG-002 — `execute` failure returns `ok: true` (error hidden in result)

**Severity:** High

**Problem**
When `execute` fails (non-timeout), the daemon returns `ok: true` with a nested object like `{ success:false, error }` inside `result`. This makes failures look like successes to callers and conflicts with the response/error envelope schema.

**Scope / likely files**
- `packages/daemon/src/server/index.ts` (handler like `handleExecute`)
- Shared response helpers (e.g., `successResponse`, `errorResponse`)

### Phase 1 — Confirm current behavior and expected schema
- [x] Locate the `execute` handler and identify all return paths
- [x] Confirm how other handlers encode failures (likely `ok:false` with structured error)
- [x] Decide canonical behavior: `ok:true` only when execution succeeds

### Phase 2 — Implement proper error envelope
- [x] Introduce/use a structured error code for execution failures (e.g., `EXECUTE_FAILED` in correct code range)
- [x] For `result.success === false`, return an **ErrorResponse** (`ok:false`) using the standard error schema
- [x] Keep timeouts/navigation failures consistent with existing error categorization

### Phase 3 — Update clients/tests
- [x] Update CLI to handle `ok:false` for execute and print errors deterministically by format
- [ ] Add/adjust a smoke/integration check that ensures execute failure produces `ok:false`

### Phase 4 — Verify
- [x] Validate execute success path still returns `ok:true` with expected `result`
- [x] Validate execute failure path returns `ok:false` with correct error code/category/retryable set

---

## BUG-003 — `execute` is arbitrary code execution; security model not enforced/explicit

**Severity:** High (security)

**Problem**
Daemon uses `AsyncFunction` to execute arbitrary code. If the daemon is reachable by untrusted users or over a network, this is remote code execution (RCE). Even if intended for local trusted use, the code should enforce/communicate that boundary.

**Scope / likely files**
- `packages/daemon/src/browser/index.ts` (or wherever `AsyncFunction` is used)
- Transport/server config defaults (local-only sockets, permissions)
- `PLAN.md`/docs for threat model

### Phase 1 — Confirm threat model and exposure
- [x] Confirm daemon transport is local-only by default (UDS/named pipe), not TCP
- [x] Confirm socket/pipe permissions are restrictive
- [x] Identify any flags allowing network exposure

### Phase 2 — Enforce safe defaults in code
- [x] Ensure there is no default TCP listener
- [x] Add explicit guardrails if any “remote mode” exists (opt-in only)
- [x] Ensure logs/warnings go to stderr, not stdout

### Phase 3 — Make it explicit to users
- [x] Document in CLI help / daemon startup logs: “execute runs arbitrary code; local trusted user only”
- [ ] (Optional) Require an explicit flag for enabling `execute` in higher-risk modes

### Phase 4 — Verify
- [x] Confirm default configuration cannot be accessed remotely
- [ ] Add a basic regression check once testing framework exists

---

## BUG-004 — Daemon startup readiness check is brittle (fixed 500ms sleep)

**Severity:** Medium

**Problem**
CLI uses a fixed sleep (e.g., 500ms) after starting daemon and then checks for readiness. On slower machines, daemon may not be ready yet, causing flaky startup.

**Scope / likely files**
- `packages/cli/src/index.ts` (`daemon start`)

### Phase 1 — Identify readiness signal(s)
- [x] Determine the canonical “ready” condition (successful connect + `ping` response)
- [x] Ensure the check is cross-platform (macOS/Linux/Windows)

### Phase 2 — Implement polling with backoff
- [x] Replace fixed sleep with polling loop (bounded attempts + increasing delay)
- [x] Surface a clear error if daemon doesn’t become ready in time

### Phase 3 — Verify
- [ ] Validate on a cold start and on a “slow” simulated environment (if possible)
- [x] Ensure output remains deterministic

---

## BUG-005 — `execute --format text` mixes prose and JSON-ish output (non-deterministic stdout)

**Severity:** Medium

**Problem**
In text mode, `execute` sometimes prints JSON-like structures mixed with prose to stdout, which makes stdout unstable for scripting.

**Scope / likely files**
- `packages/cli/src/index.ts` (execute handler formatting)

### Phase 1 — Define deterministic text output
- [x] Decide what goes to stdout vs stderr in text mode (blocked: `execute` command not implemented in current codebase)
- [x] Ensure stdout is stable and intended for parsing (or explicitly state it’s human-only) (blocked: `execute` command not implemented in current codebase)

### Phase 2 — Implement consistent behavior
- [x] Ensure `--format text` prints a stable summary line(s) (N/A: `execute` command not implemented in current codebase)
- [x] If printing the result, do so in a consistent way (e.g., raw string only; otherwise pretty-print to stderr) (N/A: `execute` command not implemented in current codebase)

### Phase 3 — Verify
- [x] Manual run: confirm stdout is stable across runs (N/A: `execute` command not implemented in current codebase)
- [x] Confirm json/ndjson modes remain strict (no extra text) (N/A: `execute` command not implemented in current codebase)

---

## BUG-006 — Build artifacts and dependencies appear in git status (`dist/**`, `node_modules/**`)

**Severity:** Low (hygiene / review noise)

**Problem**
Generated build output and installed dependencies showing up as tracked/untracked changes create noisy diffs and can accidentally get committed.

**Scope / likely files**
- `.gitignore` (root)
- Potential package-level ignores

### Phase 1 — Confirm what’s currently tracked
- [x] Check whether `dist/**` or `node_modules/**` are tracked in git history (they were; now untracked)
- [x] Identify the intended policy (commit built artifacts or not) — policy: **do not** commit build artifacts or installed dependencies

### Phase 2 — Apply ignore policy
- [x] Add appropriate `.gitignore` entries (root and/or packages) — root `.gitignore` includes `node_modules/` and `**/dist/`
- [x] If already tracked, remove from index (without deleting local files) if desired — removed from index via `git rm -r --cached ...`

### Phase 3 — Verify
- [x] `git status` is clean after builds/installs (verified after `pnpm -w build`; no `dist/**` or `node_modules/**` entries)

---

## BUG-007 — Browser engine option ignored (always launches Chromium)

**Severity:** Low

**Problem**
`BrowserManager.launchBrowser()` always uses `chromium.launch()` even if a different engine option exists (firefox/webkit). This is a correctness gap if config supports multiple engines.

**Scope / likely files**
- `packages/daemon/src/browser/index.ts`

### Phase 1 — Confirm intended API
- [x] Find how `engine` is passed/configured
- [x] Confirm allowed values and defaults

### Phase 2 — Implement engine switch
- [x] Launch the requested engine (`chromium`/`firefox`/`webkit`)
- [x] Keep behavior consistent across platforms

### Phase 3 — Verify
- [x] Add a small smoke/integration check or manual validation for non-chromium engine

---

## BUG-008 — `execute` timeout timer not cleared on success

**Severity:** Low

**Problem**
Timeout is implemented via `setTimeout` but the timer isn’t cleared on success, causing a minor timer leak and potential late-firing side effects depending on implementation.

**Scope / likely files**
- `packages/daemon/src/server/index.ts` (execute handler)

### Phase 1 — Confirm implementation
- [x] Identify where the timeout is scheduled
- [x] Confirm it isn’t cleared/cleaned up on success/failure

### Phase 2 — Fix
- [x] Store timer handle and always `clearTimeout(...)` in a `finally` block
- [x] Ensure this doesn’t change observable output

### Phase 3 — Verify
- [x] Run a few execute calls and confirm no stray timeout behavior is observed
