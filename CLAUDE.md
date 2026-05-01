# CLAUDE.md — SharpEdge (Prime Edge Picks)

## Project Overview

SharpEdge is a sports betting analytics dashboard (primeedgepicks.com) that surfaces sharp money signals, player props EV, yes/no value markets, middles detection, and surebet widgets. It is a paid product gated behind a Whop paywall at $49.99/$99.99. The target user is a serious sports bettor who wants edge — not noise. Speed, accuracy, and clean UI are non-negotiable.

---

## Tech Stack

- **Frontend:** Vanilla JavaScript + HTML — single `index.html` file. No frameworks, no bundlers.
- **Backend:** Vercel serverless functions (Node.js) in `/api/` routes
- **Data:** The Odds API — key: `e9e337f8f997b9942a63be8cd817bfb2`
- **Auth:** Whop API — membership validation only. Owner backdoor has been permanently removed.
- **Deployment:** Vercel (preview on branch, production on main)
- **Repo:** GitHub — Tmoney202612/sharpedge
- **Live URL:** sharpedge-two.vercel.app
- **Local repo path:** `C:\Users\Prime\OneDrive\Documents\New project\sharpedge`

---

## Git Workflow Rules — NEVER BREAK THESE

- Always branch from `main` before starting any feature
- One feature per branch, one commit per feature
- Never commit directly to `main`
- Fast-forward merge only — no merge commits
- Test on Vercel preview URL in incognito before merging to main
- The OneDrive repo path causes Git lock errors during rebase aborts — always click **1. Yes** on the first Codex prompt to resolve
- Never use Replace All in the GitHub web editor — it corrupts files

---

## Browser & Dev Environment Rules

- **Right-click → Inspect only** — never use F12
- **Ctrl+R to refresh** — never use F5
- Test all changes in **incognito** on the Vercel preview URL
- Never test on localhost — always use Vercel preview

---

## Coding Conventions

- All logic lives in `index.html` — do not split into separate JS files unless explicitly asked
- API routes live in `/api/` as individual `.js` serverless functions
- Use `no-store` cache headers on all `/api/` routes — caching has caused stale data bugs before
- Arrow functions preferred over function declarations
- No `var` — use `const` and `let` only
- No `console.log` in production code
- No inline styles — use existing CSS classes
- No placeholder comments like `// TODO: implement this`
- Keep functions focused — extract helpers if a function exceeds ~50 lines

---

## PowerShell Specific

- Markdown auto-linking corrupts dot-notation in PowerShell scripts
- Fix via string concatenation: `$dot = '.'` then use `"something$($dot)something"` instead of `something.something`

---

## Never Do This

- Never commit directly to `main`
- Never install a new npm package without asking first
- Never rewrite a file or function that was not part of the current task
- Never add default exports
- Never use Socket.io — causes memory leaks on Vercel. We use Supabase real-time where needed.
- Never suggest switching from vanilla JS/HTML to React, Next.js, or any framework
- Never suggest changing the deployment platform away from Vercel
- Never remove or modify the Whop paywall auth logic
- Never add the owner backdoor back — it was intentionally removed
- Never use F-keys in browser instructions
- Never use Replace All in the GitHub editor

---

## Architecture — What's Already Built (Do Not Rewrite)

- ✅ Blue theme (`#3b82f6`)
- ✅ Oddspedia Surebets widget (domain licensed)
- ✅ Combat draw filter
- ✅ Sharp Money v3 (historical endpoint, steam/RLM detection)
- ✅ Player Props v2 (fair-line math, middles detection with correct Over/Under logic, concurrency cap, alt line markets)
- ✅ Yes Value scanner (6% edge threshold, 3+ books)
- ✅ Ignored Market badge (branch: `ignored-props-tag`)
- ✅ Sport coverage expansion (branch: `add-sports-coverage`, merged)
- ✅ Pipeline cleanup slices 1–3 (margin removal, scan depth 25, dedupe by book pair)
- ✅ Cache fix (no-store headers on all API routes)
- ✅ Prop EV Engine (branch: `prop-ev-engine`) — 933–2009 EV plays computed. **UI Step 4 not yet built.**

---

## Known Gaps / Limitations

- NHL has no player props via The Odds API (h2h only)
- Soccer player props limited to 6 leagues via The Odds API regardless of live game count
- NFL and WNBA player prop coverage is incomplete
- Worldwide soccer/tennis/table tennis not yet covered

---

## Current Goals (Active Sprint)

- Build Prop EV UI (Step 4) — render EV results from `detectPropEV` in the dashboard
- Investigate the Player Props pipeline for correct WNBA and NFL coverage
- Expand middles detection to cover alt line arb scenarios

**Not working on right now — do not suggest:**
- Auth changes
- Whop paywall modifications
- Framework migration
- New data providers

---

## Important Context

- The Odds API key: `e9e337f8f997b9942a63be8cd817bfb2`
- The Odds API has rate limits — always batch and cache requests at the function level
- Socket.io was tried for real-time and caused memory leaks on Vercel — do not suggest it
- The repo path on OneDrive causes recurring Git lock errors — this is a known issue, always click Yes on first Codex prompt
- This is a live paid product — code quality matters, no throwaway changes

---

## Communication Style

- Be direct. No preamble.
- One change at a time — do not bundle multiple features into one commit
- When you make a change, tell me what changed and why in one sentence
- If something looks like a bug or architectural issue, flag it even if I did not ask
- If you are unsure about scope, ask before writing code
- Never explain what you are about to do — just do it and report what you did
