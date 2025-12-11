# WIG Editor

A Next.js 15 + shadcn/ui prototype for **WIG**: a lightweight design system editor where you can **view** components, **edit** them via chat-assisted changes, and **push** updates through a GitHub PR workflow (with optional token sync to Figma on merge).

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + TypeScript
- **Tailwind CSS v4** (CSS-first config) + tw-animate-css
- **shadcn/ui** (New York style, CSS variables, Lucide icons)
- ESLint (Next config)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Dev server (Turbopack)   |
| `npm run build` | Production build         |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

## Project Structure

```
app/
├── page.tsx          # Landing page
├── layout.tsx        # Root layout + fonts
└── globals.css       # Tailwind v4 + CSS variables theme
lib/
└── utils.ts          # cn() helper for shadcn
```

## WIG Loop (Target Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                         WIG                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   VIEW      │    │   EDIT      │    │   PUSH      │        │
│   │             │    │             │    │             │        │
│   │  Sandpack   │ →  │  Chat +     │ →  │  Branch →   │        │
│   │  renders    │    │  Live code  │    │  PR → Merge │        │
│   │  from repo  │    │  changes    │    │             │        │
│   └─────────────┘    └─────────────┘    └──────┬──────┘        │
│         ↑                                      │               │
│         │            ┌─────────────┐           │               │
│         │            │   FIGMA     │ ←─────────┘               │
│         │            │   SYNC      │  (GitHub Action           │
│         │            │             │   on merge)               │
│         │            └─────────────┘                           │
│         │                   │                                  │
│         └───────────────────┘                                  │
│              (tokens.json)                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Roadmap

### UI
- [ ] Project selector + viewer route
- [ ] Preview harness (Sandpack-based sandbox)

### API Routes
- [ ] `/api/chat` – AI-assisted code edits
- [ ] `/api/github/branch` – Create feature branch
- [ ] `/api/github/commit` – Commit changes
- [ ] `/api/github/pr` – Open PR (draft)

### Tokens + Figma
- [ ] Define token format (`tokens.json`)
- [ ] Transform tokens → Figma Variables
- [ ] GitHub Action: sync tokens on merge

## Environment Variables (Planned)

```bash
# GitHub App (recommended over personal tokens)
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_INSTALLATION_ID=

# Figma
FIGMA_TOKEN=
FIGMA_FILE_ID=

# AI Provider
OPENAI_API_KEY=
```

## License

MIT