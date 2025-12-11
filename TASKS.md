Here's the shortest path to a working proof of concept, in priority order:

---

## Phase 1: View + Edit (get the loop working locally)

**1. Playground route with Sandpack**
Create page.tsx — a client component that:
- Loads a hardcoded component (e.g., a Button) into Sandpack
- Shows the code editor + live preview side-by-side

**2. Add a chat input that updates Sandpack**
- Simple textarea + submit
- Call `/api/chat` with current code + user prompt
- API returns new code (full file for now, diff later)
- `sandpack.updateFile()` to apply the change

**3. Stub the chat API**
Create `app/api/chat/route.ts`:
- Takes `{ code, prompt }`
- Calls OpenAI (or Azure OpenAI) with a system prompt like "You are editing a React component. Return only the updated code."
- Returns `{ code: "..." }`

**This gets you:** type a prompt → see the component update live. That's the core magic.

---

## Phase 2: Push to GitHub

**4. GitHub commit API**
Create `app/api/github/commit/route.ts`:
- Takes `{ filePath, content, message }`
- Creates branch, commits file, returns branch name
- Use `@octokit/rest` (or `@octokit/core`)

**5. GitHub PR API**
Create `app/api/github/pr/route.ts`:
- Takes `{ branchName, title, body }`
- Opens a draft PR, returns URL

**6. Wire "Push" button in UI**
- Grab current Sandpack code
- POST to commit → POST to PR → show PR link

**This gets you:** edit in browser → one-click PR.

---

## Phase 3: Figma Sync (separate concern)

You're right — this is best handled **outside** WIG itself:

| Option | How it works |
|--------|--------------|
| **GitHub Action** (recommended) | On merge to `main`, action reads `tokens.json` and POSTs to Figma Variables API. No plugin needed. |
| **Figma Plugin** | If you want bidirectional sync (Figma → repo), you'd build a plugin that reads/writes tokens. More complex. |

For PoC, just add a placeholder GitHub Action file (`.github/workflows/figma-sync.yml`) that logs "would sync tokens" on merge. Wire it up for real once the edit→PR loop works.

---

## Suggested file order to create

| # | File | Purpose |
|---|------|---------|
| 1 | page.tsx | Sandpack + code editor + preview |
| 2 | `app/api/chat/route.ts` | AI code edits |
| 3 | `lib/github.ts` | Octokit wrapper (branch/commit/PR) |
| 4 | `app/api/github/commit/route.ts` | Commit endpoint |
| 5 | `app/api/github/pr/route.ts` | PR endpoint |
| 6 | `.github/workflows/figma-sync.yml` | Stub action |

---

**Want me to scaffold file #1 (the playground route with Sandpack)?** That's the fastest way to see something working.