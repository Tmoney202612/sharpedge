## HOW TO WORK — LAWS

If any rule below conflicts with rules further down this file, the laws in this section take precedence.

VERIFICATION LAW: lint / build passing is NOT done. A task is done ONLY after its behavior is verified working live (test, curl, log, or browser confirmation). Never say done, fixed, works, saved, or landed without a tool result THIS turn proving it. If unverified, the required phrasing is "not verified — here is what I have." Never claim a rule/edit/fix landed without showing it in the file or output.

NEVER-TEST-BLIND LAW: Never tell Tim to test, run, or open anything until that code's output has been confirmed valid by a read-only or logged check first. Breaking his working environment by sending him into unverified code is a failure, not a mistake.

GAP DISCLOSURE LAW: Every response that reports progress MUST end with a complete OPEN list: every gap, risk, side effect, unverified claim, and unfinished item, in full. Not a footnote — a standing list. An item stays on the list, restated every time, until a tool result proves it closed. A gap mentioned once and dropped is a violation. If there are zero open items, state "OPEN: none" explicitly — silence is not allowed.

NO-DRIFT LAW: When Tim pushes back, do not defend or re-explain — re-check against ground truth (tool output, file, prod) and correct. Never reassure to smooth things over. Never claim something can't be done without verifying it can't. Never call work done before Tim has seen it work.

NO-PARKING LAW: Tim does not park work for "later" or "next session" unless he explicitly says so. Never suggest stopping, a handoff, or deferring. Do the task now, fully, in this session.

ASSUMPTION DISCLOSURE LAW: Every assumption Claude makes — any value, path, name, behavior, or scope detail not explicitly provided by Tim — must be flagged inline at the point it appears, with the exact text "ASSUMED: [what was assumed]." Assumptions buried in prose or omitted entirely are violations. If an assumption turns out wrong, Claude owns the error — not Tim for not catching it.

NO-SILENT-EDITS LAW: If any file, config, variable, or behavior outside the explicit scope of the current task is touched, renamed, restructured, or affected — Claude must name it, show what changed, and explain why. Scope creep that isn't disclosed is a failure, not a side effect. "I also updated X" buried at the end of a response is not disclosure — it must appear before the change is reported as complete.

ROLLBACK CLARITY LAW: If a change breaks something or needs to be undone, Claude must immediately state: (1) exactly what was changed, (2) the previous value or state, and (3) the exact edit or command to restore it. "Revert the file" is not an acceptable rollback instruction. If Claude cannot provide all three, it must say so before Tim touches anything.

## RESPONSE RULES (apply to every reply to Tim)

- Concise. No preamble. One task at a time.
- Don't declare done unless verified.
- If unsure, say "I don't know" or "I haven't verified." Never "should work," "might be," "I think it," "looks right."
- Don't suggest next steps unless asked.
- Don't add hedges or guardrails Tim didn't raise.
- Don't auto-execute commands you suggested. Wait for Tim's explicit go.
- F1-F12 keys don't work on Tim's machine. Say right-click → Inspect, not F12. Say Ctrl+R, not F5.

## BEHAVIORAL RULES

1. Before any action: State in one sentence what I'm about to do and why. If it sounds like overreach, it is. Stop.
2. Scope: Do the task given. If something adjacent is spotted, name it and stop. Don't build it.
3. Pushback: Verify before defending. Never double down without checking first. Pushback is a real signal.
4. Blockers: "Blocked by X" requires a specific, provable reason. No invented dependencies.
5. Disagreement: Say "I'd do it differently — here's why," then do it Tim's way unless told otherwise.
6. Stalling: If the answer needs a search, search. No filler steps first.

FORCING FUNCTION: When Tim says "verify that" — stop, check, show findings, correct if wrong.

TRUTH RULE — CONTRADICTION EXTENSION: When two claims within the same session contradict each other, flag and verify immediately — don't pass the latest claim through.

# EXECUTION PROTOCOL (MANDATORY)
- Code work = any change to repo files, scripts, configs, or API routes.
- Safety (no destructive or unsafe changes) > Execution Protocol > Task-specific rules.
- Never make code changes without explicit approval.
- Always show FULL, explicit diff (no summaries or omissions) before applying changes.
- Wait for approval before applying.
- Apply one requested change at a time unless I explicitly approve a grouped change.
- Multiple coordinated edits must be presented in ONE complete diff and require explicit approval.
- Never patch blindly; identify and state the root cause before proposing a fix.
- Patches allowed only when I say "apply hotfix" — hotfix skips diff-approval ONLY, never the VERIFICATION LAW. Unverified code never ships.
- Verify results using the appropriate method (local test, console output, or live check) before declaring complete.

# OVERRIDE RULE
- I may override this by saying: "override protocol".
- Even when overridden, never perform destructive actions, expose secrets, or modify authentication/security logic.

# VALIDATION RULES
- Never claim something works without verification.
- Never use stale, guessed, or assumed data when live/current data is required.
- Exploratory / what-if / early-line analysis allowed when I request it.

# BETTING OUTPUT RULES
- Default to today's slate unless I ask for future or exploratory analysis.
- No fake props, made-up odds, or unsupported picks.
- Structure betting output as: Anchor / Mid-tier / Lotto.
- No filler; match edge-board style.

# CODE MODIFICATION RULES
- Use exact, minimal edits only.
- Do not reformat minified code.
- Never use Replace All.
- No silent fixes; show the diff.
- For large or minified files, show exact before/after snippet (<=20 lines) around the change.

# CLAUDE.md — SharpEdge (Prime Edge Picks)

## Project Overview

SharpEdge is a sports betting analytics dashboard (primeedgepicks.com) that surfaces sharp money signals, player props EV, yes/no value markets, middles detection, and surebet widgets. It is a paid product gated behind a Whop paywall at $49.99/$99.99. The target user is a serious sports bettor who wants edge — not noise. Speed, accuracy, and clean UI are non-negotiable.

---

## Tech Stack

- **Frontend:** Vanilla JavaScript + HTML — single `index.html` file. No frameworks, no bundlers.
- **Backend:** Vercel serverless functions (Node.js) in `/api/` routes
- **Data:** The Odds API — key: `ODDS_API_KEY (set in Vercel env, not stored in repo)`
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

## Parlay Builder — Tier Definitions

Tiers are bucketed on **combined parlay hit probability** (product of leg hit probabilities), not per-leg probabilities.

- **Safe:** combined hit probability ≥ 0.35
- **Balanced:** combined hit probability 0.20 – 0.34
- **Longshot:** combined hit probability 0.10 – 0.19

Payout floors (best-line combined decimal odds across allowed books):

- **Safe:** ≥ 2.0x
- **Balanced:** ≥ 2.5x
- **Longshot:** ≥ 5.0x

Tier suppression: if the Best (highest combined hit probability) combo in a tier fails its payout floor, the entire tier is suppressed and the UI renders "no qualifying play today."

Data freshness window: 15 minutes from `slate.fetchedAt`. Stale slates render "updating" instead of parlays.

Pre-combo input cap: top 30 scored legs by per-leg hit probability feed combo generation.

Per-leg consensus floor: 3+ books quoting both Over and Under at the same line.

Same-game exclusion: combos cannot contain more than one leg from the same `event_id`.

---

## Important Context

- The Odds API key: `ODDS_API_KEY (set in Vercel env, not stored in repo)`
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
