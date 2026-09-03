# AI Trip Planner

**Describe a trip in plain English. Get back a structured, editable, day-by-day itinerary — validated end-to-end before it ever touches the screen.**

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2.1-6E9F18?logo=vitest&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3.23-3E67B1?logo=zod&logoColor=white)

A free-form trip description goes in; a Gemini-generated itinerary comes back as strict JSON, gets validated against a shared Zod schema on both the backend and frontend, and only then reaches the React UI as an interactive, editable list of days and stops.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup & Startup](#setup--startup)
- [Other Useful Scripts](#other-useful-scripts)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [AI Usage Note](#ai-usage-note)
- [Known Limitations](#known-limitations)
- [Time Spent](#time-spent)

## Features

- **Free-form trip input** — a single textarea (2,000-char limit) with client-side empty/whitespace validation; no rigid multi-field form to fill out.
- **Structured, AI-validated output** — every response from Gemini is parsed and checked against a shared Zod schema on *both* the backend and the frontend before it is trusted; malformed or unexpected model output is turned into a clear error state, never a crash.
- **Multiple AI-driven block types** — beyond plain stops, the itinerary can include cost summaries, packing checklists, and simple bar charts, each rendered with a dedicated card; unrecognized block types gracefully fall back to the default stop view instead of being dropped.
- **Interactive, editable itinerary** — expand/collapse any stop for full detail, remove a stop, or reorder stops with move-up/move-down controls, all as immutable, keyboard-accessible updates.
- **Stale-request-safe UX** — a request-id + `AbortController` pair guarantees that only the *latest* submitted request's outcome is ever rendered, no matter how fast you resubmit or how out-of-order responses arrive.
- **Retry & regenerate flows** — a failed retry or regenerate keeps the previous itinerary visible with a non-blocking banner instead of blanking the screen; a successful regenerate cleanly replaces it.
- **Accessible & responsive design** — token-based design system with 4.5:1+ text contrast, a visible `:focus-visible` ring, 44px+ touch targets, full keyboard operability, and a single-column mobile layout that switches to a two-column grid at 768px.

## Architecture

```
┌───────────────────────┐                    ┌───────────────────────┐                    ┌───────────────────┐
│   Browser (React SPA) │  POST /api/itinerary│  Backend Proxy        │  POST generateContent│  Gemini API       │
│                       │ ───────────────────▶│  (Express, Node.js)   │ ───────────────────▶│                   │
│  TripInputForm         │                    │                       │                    │                   │
│  useItineraryRequest   │ ◀───────────────────│  builds prompt +      │ ◀───────────────────│  returns JSON     │
│  (request-id + Abort)  │  { itinerary } or   │  responseSchema        │  raw response text   │  itinerary text   │
│  Zod validation        │  { error, code }    │  GEMINI_API_KEY        │                      │                   │
│  ItineraryView         │                    │  (server-only, never   │                      │                   │
│  (DayCard, StopItem)   │                    │   sent to the browser) │                      │                   │
└───────────────────────┘                    └───────────────────────┘                    └───────────────────┘
```

The Express proxy exists for one reason: **`GEMINI_API_KEY` must never reach the browser.** The key lives only in the proxy's process environment, is read once at request time, and is never included in any response body sent back to the client. The frontend only ever talks to same-origin `/api/itinerary` — it has no network visibility of Gemini's endpoint or credentials. As defense in depth, the backend also runs the same Zod schema on Gemini's response before forwarding it, so a shape the backend itself considers invalid never reaches the frontend disguised as a `200 OK`.

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 18 + Vite + TypeScript | Fast cold-start dev server, zero-config TS, functional components + hooks only — no extra state-management library needed for the app's single meaningful piece of shared state. |
| Backend | Express (Node.js) | Minimal, extremely well-known, one route, trivial `npm start` story — no serverless/deploy config needed to run locally. |
| Validation | Zod (shared schema) | One schema (`shared/itinerarySchema.ts`) imported by both sides via a `@shared/*` path alias — single source of truth for what counts as a valid itinerary, enforced identically on the server (defense in depth) and the client. |
| Testing | Vitest + React Testing Library | Pairs natively with Vite (same transform pipeline, no separate config), fast watch mode, first-class ESM/TS support. |
| Styling | CSS Modules + CSS custom-property design tokens | No UI-kit/Tailwind dependency risk in a time-boxed build; scoped styles avoid collisions, and a single `tokens.css` keeps color/spacing/contrast consistent and easy to audit for accessibility. |

## Prerequisites

- **Node.js 18 or later** (required by Vite 5 and the `tsx`-based backend)
- **npm** (ships with Node)
- A **Gemini API key** — get one from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Setup & Startup

1. **Install dependencies** — a single root `package.json` covers both the frontend and backend; there are no separate `client`/`server` packages to install:

   ```bash
   npm install
   ```

2. **Configure your Gemini API key.** Copy the example env file:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and set the exact variable name the backend reads:

   ```dotenv
   GEMINI_API_KEY=your-real-key-here
   ```

   The backend proxy (`server/server.ts`) reads `process.env.GEMINI_API_KEY` at request time. If it's missing, the API responds with a `server_misconfigured` error instead of attempting a call to Gemini — the key is only ever used server-side and is never sent to or exposed in the browser.

3. **Start the app** — runs the Vite dev server and the Express proxy together:

   ```bash
   npm start
   ```

   Under the hood this is `concurrently "npm:client" "npm:server"`:
   - `client` → `vite`, serving the React frontend at `http://localhost:5173`
   - `server` → `tsx watch server/server.ts`, the Express proxy on port `3001` (configurable via the `SERVER_PORT` env var)

   Vite's dev server proxies any `/api/*` request to the Express server, so the frontend only ever calls same-origin `/api/itinerary` — no CORS setup needed.

4. Open `http://localhost:5173` in your browser, describe a trip, and submit.

`npm run dev` is an alias for the exact same command as `npm start`, in case either is expected by convention.

### Other Useful Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Runs the full test suite once with Vitest |
| `npm run build` | Builds the frontend for production with Vite |
| `npm run typecheck` | Runs `tsc --noEmit` across the whole project |

## Project Structure

```
ai-trip-planner/
├── README.md
├── package.json                  # root scripts: "start" runs client + server concurrently
├── .env.example                  # GEMINI_API_KEY=
├── shared/
│   └── itinerarySchema.ts        # Zod schema + inferred types, shared by frontend & backend
├── server/
│   ├── server.ts                 # Express app, single POST /api/itinerary route
│   ├── gemini.ts                 # callLLM(prompt) — isolated Gemini integration
│   └── promptBuilder.ts          # builds the system instruction + responseSchema for Gemini
├── src/
│   ├── main.tsx, App.tsx
│   ├── hooks/
│   │   └── useItineraryRequest.ts        # request-lifecycle hook: request-id + AbortController
│   ├── lib/
│   │   ├── fetchAndValidateItinerary.ts  # fetch → parse → Zod-validate pipeline
│   │   └── validateTripDescription.ts    # client-side input validation
│   ├── components/
│   │   ├── TripInputForm/                # controlled textarea + submit
│   │   ├── ResultArea/                   # switches on request status → one state component
│   │   ├── LoadingSkeleton/, ErrorState/, EmptyState/, EmptyResultState/
│   │   ├── RetryBanner/                  # non-blocking banner during a failed retry/regenerate
│   │   ├── ItineraryView/, DayCard/, StopItem/
│   │   └── CostCard/, ChecklistCard/, ChartCard/  # type-specific block renderers
│   └── styles/tokens.css                 # design tokens: color, spacing, type, focus ring
├── vite.config.ts                # dev-server proxy: /api → the Express port
└── tsconfig.json                 # @shared/* path alias
```

## Testing

The suite covers the highest-risk area first — the AI-response parse/validation pipeline — plus every component and the request-lifecycle race condition:

- **105 tests across 17 test files**, all passing (`shared/`, `server/`, `src/`).
- Schema validation (`shared/itinerarySchema.test.ts`): valid/invalid shapes, size limits, unknown-field tolerance, recognized vs. unrecognized block types.
- Backend (`server/*.test.ts`): request validation, API key guard, prompt building, Gemini response validation before forwarding.
- Frontend pipeline (`src/lib/fetchAndValidateItinerary.test.ts`): malformed JSON, non-2xx, network failure, schema-invalid bodies.
- Request lifecycle (`src/hooks/useItineraryRequest.test.ts`): a second submission while the first is still pending correctly discards the first's late-arriving response.
- Components (`src/components/**/*.test.tsx`, `src/App.test.tsx`): every state (loading, error, empty, populated), expand/collapse, remove/reorder, retry/regenerate flows.

Run the suite:

```bash
npm test
```

Run the type checker:

```bash
npm run typecheck
```

## AI Usage Note

This project was built with **[Kiro](https://kiro.dev)**, an AI-powered development environment, working from a spec (`requirements.md` → `design.md` → `tasks.md`, also authored with AI assistance) broken into small, incrementally-committed tasks. Kiro wrote essentially all of the code in this repository, including:

- the shared Zod schema (`shared/itinerarySchema.ts`) and its unit tests
- the Express backend proxy, the Gemini prompt-building and API integration (`server/promptBuilder.ts`, `server/gemini.ts`), and backend response validation
- the frontend request/parse/validation pipeline (`src/lib/fetchAndValidateItinerary.ts`) and the stale-response-safe request lifecycle hook (`src/hooks/useItineraryRequest.ts`)
- all React components (input form, itinerary view, day/stop/block cards, loading/error/empty states) and their CSS
- the full test suite (105 unit and integration tests across schema, backend, and frontend code), and the design-token-based accessible/responsive styling

Each task was implemented, tested, and committed one at a time rather than generated as one large drop, so the git history reflects incremental, reviewable progress. A human directed the overall architecture and requirements via the spec, reviewed the generated code and test results at each step, and made the final calls on scope (e.g. which stretch goals to attempt).

## Known Limitations

- **No live Gemini API run was performed.** The sandboxed environment this project was built in did not have a `GEMINI_API_KEY` available, so the end-to-end flow against the real Gemini endpoint has not been manually exercised by the author. The backend integration, prompt construction, and response-validation logic are covered by unit tests with mocked responses, but a live smoke test against the actual API is still recommended before relying on this in production.
- **Responsive and accessibility checks were not verified in a real browser.** The 375px / 768px / desktop layout breakpoints and the keyboard-only navigation pass were validated by reviewing the CSS and markup against the design's requirements, not by driving an actual browser or device. A manual pass with real browser dev-tools (or real devices) and a screen reader is recommended before shipping.
- **Some optional stretch goals are not implemented.** These were explicitly out of scope for the ~8-hour core; multiple AI-driven block types (cost/checklist/chart cards) *were* completed as time-permitting extra work, but the rest were skipped in favor of a solid, well-tested core:
  - Streaming itinerary responses (incremental rendering as the model generates output)
  - A refinement loop (follow-up instructions to revise an existing itinerary)
  - Save/reload of itineraries via `localStorage`
  - UI polish: dark mode, reduced-motion-aware animations, keyboard shortcuts
- **Single LLM provider.** Only Gemini is supported; there's no provider abstraction layer, since the assignment scope didn't call for multi-provider support.
- **No authentication or rate limiting** on the `/api/itinerary` endpoint. This is a local evaluation project, not a hardened multi-tenant deployment — running it publicly as-is would allow anyone with network access to consume your Gemini quota.

## Time Spent

Approximately **8 hours** were spent building the mandatory core (tasks 1–18: schema, backend proxy and Gemini integration, frontend request pipeline, interactive itinerary UI, accessibility and responsive styling, manual verification, and this README), matching the project's intended time budget. Additional time beyond that was spent on the optional multiple-block-types stretch goal (task 19); the remaining stretch goals (tasks 20–23) were not attempted.
