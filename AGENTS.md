# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint (Next.js core web vitals)
```

## Tech Stack

- **Next.js 16** (App Router, "use client" components)
- **React 18** with TypeScript 5
- **Tailwind CSS 3.4** with custom Hanwha-branded theme
- **Framer Motion 11** for animations
- **OpenAI SDK 6** for LMS message generation

## Architecture

Single-page app with a two-panel layout: left sidebar (FP profile, stats, todos) and main chat window.

### Key Flow

1. FP searches/selects customers via chat interface
2. System filters customers by keyword (생일, 만기, 갱신, 클레임, etc.) or shows urgency-sorted list
3. Selecting a customer triggers AI-generated LMS messages (3 types: 안내형/감성형/혜택관리형)
4. Phone preview modal lets FP review before sending

### Component Hierarchy

```
app/layout.tsx          → Root layout (Noto Sans KR font, metadata)
app/page.tsx            → Home: SplashScreen + Header + Sidebar + ChatWindow
app/api/generate-lms/   → POST endpoint for OpenAI LMS generation
components/
  ChatWindow.tsx        → Main chat interface, message history, input, quick actions
  MessageBubble.tsx     → Renders text / customer-list / lms-list message types
  CustomerCard.tsx      → Customer info card (horizontal scroll in chat)
  LMSMessageCard.tsx    → AI-generated LMS option card (3 per customer)
  PhonePreviewModal.tsx → Mobile phone frame preview for selected LMS
  Sidebar.tsx           → FP profile, KPI stats (useCountUp hook), todo list
  SplashScreen.tsx      → Animated loading screen (1.6s show, 2.2s remove)
  TypingIndicator.tsx   → Bouncing dots animation
lib/
  types.ts              → TypeScript interfaces (Customer, LMSMessage, TodoItem, etc.)
  data.ts               → Mock data: FP_PROFILE, CUSTOMERS, LMS_MESSAGES, TODAY_TODOS
```

### API Route: `/api/generate-lms`

- Builds prompt with customer context → calls OpenAI Responses API (primary) → falls back to Chat Completions API → falls back to static LMS_MESSAGES from `lib/data.ts`
- Model configured via `OPENAI_MODEL` env var (default: `gpt-4o-mini`)

## Design System

Hanwha-branded color palette defined in `tailwind.config.ts`:
- **Orange:** `hanwha-orange` (#F37321) — primary accent
- **Navy:** `hanwha-navy` (#1A2B4A) — sidebar/header background
- Custom shadows: `shadow-card`, `shadow-card-hover`, `shadow-modal`, `shadow-glow`

Custom animations in `globals.css`: pulse rings, typing dots, toast notifications.

## Environment

`.env.local` requires:
```
OPENAI_API_KEY=<key>
OPENAI_MODEL=<model-name>
```

## Conventions

- All UI text is in Korean (ko-KR locale)
- State management via React hooks only (no global store)
- Path alias: `@/*` maps to project root
- Static assets in `public/` (e.g., `hwgi.jpg` logo)
- Responsive: sidebar hidden on mobile (md+ breakpoint), full-width chat below md


Workflow Orchestration
1. Plan Node Default
 * Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
 * If something goes sideways, STOP and re-plan immediately – don't keep pushing
 * Use plan mode for verification steps, not just building
 * Write detailed specs upfront to reduce ambiguity
2. Subagent Strategy
 * Use subagents liberally to keep main context window clean
 * Offload research, exploration, and parallel analysis to subagents
 * For complex problems, throw more compute at it via subagents
 * One tack per subagent for focused execution
3. Self-Improvement Loop
 * After ANY correction from the user: update tasks/lessons.md with the pattern
 * Write rules for yourself that prevent the same mistake
 * Ruthlessly iterate on these lessons until mistake rate drops
 * Review lessons at session start for relevant project
4. Verification Before Done
 * Never mark a task complete without proving it works
 * Diff behavior between main and your changes when relevant
 * Ask yourself: "Would a staff engineer approve this?"
 * Run tests, check logs, demonstrate correctness
5. Demand Elegance (Balanced)
 * For non-trivial changes: pause and ask "is there a more elegant way?"
 * If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
 * Skip this for simple, obvious fixes – don't over-engineer
 * Challenge your own work before presenting it
6. Autonomous Bug Fixing
 * When given a bug report: just fix it. Don't ask for hand-holding
 * Point at logs, errors, failing tests – then resolve them
 * Zero context switching required from the user
 * Go fix failing CI tests without being told how
Task Management
 * Plan First: Write plan to tasks/todo.md with checkable items
 * Verify Plan: Check in before starting implementation
 * Track Progress: Mark items complete as you go
 * Explain Changes: High-level summary at each step
 * Document Results: Add review section to tasks/todo.md
 * Capture Lessons: Update tasks/lessons.md after corrections
Core Principles
 * Simplicity First: Make every change as simple as possible. Impact minimal code.
 * No Laziness: Find root causes. No temporary fixes. Senior developer standards.
 * Minimat Impact: Changes should only touch what's necessary. Avoid introducing bugs.


