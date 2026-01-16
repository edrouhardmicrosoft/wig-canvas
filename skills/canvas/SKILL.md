---
name: canvas
description: Use the Canvas CLI to get visual context (screenshots, DOM/a11y snapshots, computed styles, and diffs) from a local dev server when browser inspection is needed.
metadata:
  author: wig-editor
  version: "0.1"
---

# Canvas (CLI) Skill

Use this skill whenever the user asks for anything that requires **looking at a web page** or **verifying UI visually**.

### High-signal trigger phrases

- “check the layout / spacing / alignment”
- “is this visible / overlapped / clipped?”
- “what changed after my CSS edit?”
- “take a screenshot” / “compare before/after”
- “what are the computed styles for …?”
- “what does the DOM / accessibility tree look like?”

Common examples:

- “What does it look like?” / “Can you check the layout?”
- “Is this button visible / aligned / overlapped?”
- “Did my CSS change the hero/header?”
- “Compare before/after” / “Visual regression”
- “What are the computed styles for …?”
- “What does the accessibility tree say?”

This skill uses the **Canvas CLI** (backed by the `canvasd` daemon) to produce deterministic, agent-friendly outputs.

## Principles

- Prefer `--format json` for machine-readable results.
- Keep stdout clean: redirect structured outputs to files when long.
- Use `canvas context` to bundle screenshot + describe + dom + styles when unsure.
- When doing diffs, establish/initialize a baseline before comparing.

## Quickstart (agent-friendly / ephemeral)

For visual context gathering, **you usually do not need to manually start/stop anything**.

### Default lifecycle behavior

- For one-shot inspection commands, the CLI will **auto-start** `canvasd` if needed.
- If the CLI auto-started `canvasd` for that one-shot command, it will **auto-stop** it when the command finishes.
- If `canvasd` was already running (e.g. you started it explicitly), the CLI will **not** stop it.

```bash
# One-shot context bundle (starts daemon if needed, then stops when done)
canvas context --format json --inline
```

### Commands that intentionally keep the daemon alive

Some commands are long-running or explicitly session-oriented and therefore keep the daemon alive:

- `canvas connect …`
- `canvas watch …`
- `canvas viewer start …`

### Persistent session workflow

When you need multiple commands back-to-back, do a normal connect:

```bash
canvas connect http://localhost:3000
canvas screenshot
canvas describe ".hero"
```

When you’re done, disconnect. (Stopping the daemon is optional and only needed if you started it explicitly.)

```bash
canvas disconnect
# optional:
canvas daemon stop
```

## Common Workflows

### 1) “Look at the page” (one-shot context bundle)

```bash
canvas context --format json --inline > ./tmp/canvas.context.json
```

With a selector:

```bash
canvas context ".hero" --depth 3 --format json --inline > ./tmp/canvas.hero.context.json
```

### 2) Screenshot (viewport or element)

```bash
canvas screenshot --out ./tmp/page.png
canvas screenshot ".hero" --out ./tmp/hero.png
```

### 3) Describe an element (text or structured)

```bash
canvas describe ".hero"
canvas describe ".hero" --format json > ./tmp/hero.describe.json
```

### 4) Computed styles

```bash
canvas styles ".hero" --props display,color,background,padding --format json > ./tmp/hero.styles.json
```

### 5) DOM / accessibility snapshot

```bash
canvas dom --depth 3 --format json > ./tmp/dom.json
# or yaml if desired
canvas dom --depth 3 --format yaml > ./tmp/dom.yaml
```

### 6) Visual diff (baseline → change → diff)

```bash
# Initialize or update baseline implicitly
canvas diff --since last --format json > ./tmp/diff.baseline.json

# After code/UI changes:
canvas screenshot --out ./tmp/current.png
canvas diff --since last --format json > ./tmp/diff.json
```

## Decision Guide

- If the user wants **visual confirmation**, run `canvas screenshot` and/or `canvas diff`.
- If the user wants **understanding why** (layout/styling), run `canvas context` or `canvas styles` + `canvas describe`.
- If the user’s issue sounds like **keyboard/focus/labels/contrast**, run `canvas a11y`.

## Troubleshooting

- Browser missing:

```bash
npx playwright install
```

- Daemon stuck:

```bash
# Prefer one-shot commands first (they should auto-manage the daemon lifecycle)
canvas context --format json --inline

# If you explicitly need to restart the daemon:
canvas stop
canvas start
```
