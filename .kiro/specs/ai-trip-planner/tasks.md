# Implementation Plan

## Overview

This plan implements the AI Trip Planner core (Requirements 1-12) as an ordered, incremental sequence of small, committable tasks, following the architecture in design.md: a shared Zod schema, an Express backend proxy that calls Gemini and validates its output before forwarding, and a React frontend with a request-lifecycle hook (`useItineraryRequest`) that prevents stale-response race conditions, plus the interactive Day/Stop UI, accessible/responsive styling, and README. Tasks are ordered so each one only depends on code already built in a previous task. Requirements 13-17 (stretch goals) are captured separately at the end and are explicitly optional and time-permitting.

## Tasks

- [x] 1. Scaffold the project repository
  - Initialize root `package.json` with `concurrently` as a dev dependency and a `start`/`dev` script that runs the client and server together.
  - Create the folder structure: `shared/`, `server/`, `src/` (with `hooks/`, `lib/`, `components/`, `styles/`), matching the Project Structure in design.md.
  - Set up Vite + React 18 + TypeScript in `src/` (`vite.config.ts` with dev-server proxy for `/api` → the Express port), and a root `tsconfig.json` with the `@shared/*` path alias.
  - Add `.env.example` with `GEMINI_API_KEY=` and a `.gitignore` covering `node_modules`, `.env`, and build output.
  - Commit as the initial scaffold.
  - _Requirements: 12.1, 12.3_

- [x] 2. Define the shared Itinerary schema
  - Add Zod as a dependency.
  - Create `shared/itinerarySchema.ts` with `StopSchema`, `DaySchema`, and `ItinerarySchema` exactly as described in design.md (title required 1-200 chars; time/description/location/notes optional ≤500 chars; stops ≤20 per day; days ≤30; unknown fields stripped, not `.strict()`).
  - Export the inferred `Stop`, `Day`, and `Itinerary` TypeScript types.
  - _Requirements: 3.2, 3.3, 3.4, 3.6_

- [x] 2.1 Write unit tests for the Itinerary schema
  - Set up Vitest as the test runner.
  - Create `shared/itinerarySchema.test.ts` covering: a valid itinerary passes; missing `days` fails; `days` as a non-array fails; a stop missing `title` fails; a stop with only `title` (all optional fields absent) passes; more than 30 days is rejected; more than 20 stops in a day is rejected; extra unknown fields are ignored rather than rejected.
  - Run the tests and confirm they pass.
  - _Requirements: 3.2, 3.3, 3.4, 3.6, 4.7, 4.9_

- [x] 3. Build the backend proxy server skeleton
  - Create `server/server.ts` with a minimal Express app and a single `POST /api/itinerary` route that currently returns a hardcoded stub response.
  - Add the `npm run server` script and wire it into the root `start`/`dev` script via `concurrently`.
  - Verify the server starts locally and the route responds.
  - _Requirements: 2.1_

- [x] 3.1 Add request validation and API key guard to the proxy
  - In the `POST /api/itinerary` handler, validate `req.body.description`: reject missing/empty/whitespace-only with 400 `{ "error": "missing_description" }`, and reject descriptions over 5000 characters with 400 `{ "error": "description_too_long" }`.
  - Add a startup/request-time check for `process.env.GEMINI_API_KEY`; if missing, respond 500 `{ "error": "server_misconfigured" }` without attempting any LLM call.
  - _Requirements: 2.2, 2.5, 2.6, 2.7_

- [x] 4. Implement the Gemini LLM integration
  - Create `server/promptBuilder.ts` that builds the system instruction plus the Gemini `responseSchema` (mirroring `ItinerarySchema`) and the user's Trip_Description into a single prompt payload.
  - Create `server/gemini.ts` exporting `callLLM(prompt): Promise<string>`, making a raw `fetch` call to Gemini's `generateContent` REST endpoint with `responseMimeType: "application/json"`, attaching `GEMINI_API_KEY` server-side only, and enforcing a 30-second timeout via `AbortController`/`setTimeout`.
  - Wire `server.ts`'s route handler to call `promptBuilder` + `callLLM` instead of the stub, catching network failures and non-2xx responses and mapping them to a 502 `{ "error": "upstream_error" }` response without leaking the API key or raw provider error text.
  - _Requirements: 2.3, 2.8, 3.1, 3.5_

- [x] 5. Validate Gemini output on the backend before forwarding
  - After receiving Gemini's raw text, `JSON.parse` it in a `try/catch`; on failure respond 502 `{ "error": "invalid_response" }`.
  - Run `ItinerarySchema.safeParse` on the parsed object; on failure, log `error.issues` server-side only and respond 502 `{ "error": "invalid_response" }`.
  - On success, respond 200 with the validated itinerary object.
  - Manually verify the full request flow end-to-end with a real trip description against the live Gemini API.
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Build the trip description input form
  - Create `src/components/TripInputForm/` with a controlled `<textarea>` (semantic `<form>`/`<button>` elements) limited to 2000 characters, plus a submit button.
  - Add client-side validation that blocks submission and shows a message when the description is empty or whitespace-only.
  - Wire a temporary local `onSubmit` handler (no backend call yet) so the form is committable and visually testable on its own.
  - _Requirements: 1.1, 1.2, 1.6, 10.2_

- [x] 7. Implement the frontend parse/validate pipeline
  - Create `src/lib/fetchAndValidateItinerary.ts` implementing the `ParseResult` discriminated union and `fetchAndValidateItinerary(description, signal)` function exactly as described in design.md: network failure → `network`/`timeout`, non-2xx → `http_error`, JSON parse failure → `malformed_json`, schema validation failure → `invalid_shape`, otherwise `ok: true` with typed `Itinerary` data.
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.8, 4.9_

- [x] 7.1 Write unit tests for fetchAndValidateItinerary
  - Create `src/lib/fetchAndValidateItinerary.test.ts`, mocking `fetch`, covering: malformed JSON body returns `malformed_json`; a non-2xx status returns `http_error`; a network rejection returns `network`; a valid body returns `ok: true` with the typed itinerary; a schema-invalid body returns `invalid_shape`.
  - Run the tests and confirm they pass.
  - _Requirements: 4.2, 4.3, 4.5, 4.8_

- [x] 8. Implement the request lifecycle hook (Request_Manager)
  - Create `src/hooks/useItineraryRequest.ts` with the `RequestStatus`/`RequestState`/`Action` types and `useReducer` exactly as described in design.md, including the `latestRequestId` ref, `AbortController` cancellation of the previous in-flight request on a new submit, and discarding of any outcome whose `requestId` no longer matches the latest.
  - Ensure `isBackground` is computed from whether `itinerary` was already non-null before the triggering action, so a previous result is retained during a new loading/error cycle instead of being cleared.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8.1 Write a race-condition unit test for useItineraryRequest
  - Create `src/hooks/useItineraryRequest.test.ts` using React Testing Library and fake/mocked timers.
  - Test that submitting a second request while the first is still pending, then letting the first's response resolve after the second's, results in only the second (latest) request's outcome being reflected in state — the first's late-arriving response must have no visible effect.
  - Run the test and confirm it passes.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Wire the input form to the request hook and connect App state
  - Update `src/App.tsx` to own `useItineraryRequest` and pass `submit`, `status`, `tripDescription` down to `TripInputForm`.
  - Disable the submit control while `status === "loading"` to prevent duplicate submissions, and retain the current Trip_Description text in the input after any response (success, error, or timeout).
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 10. Build the loading, error, and empty state components
  - Create `src/components/LoadingSkeleton/`, `src/components/ErrorState/`, `src/components/EmptyState/`, and `src/components/EmptyResultState/`, each with a distinguishing icon plus a plain-language text label (not color alone).
  - Create `src/components/ResultArea/` (or equivalent) that switches purely on `{ status, itinerary }` from the request state to render exactly one of: `EmptyState` (never submitted), `LoadingSkeleton` (loading, no retained itinerary), `ErrorState` (error, no retained itinerary, with plain-language message and no raw error codes/stack traces), `EmptyResultState` (success with zero days), or the populated view placeholder.
  - _Requirements: 4.4, 7.1, 7.2, 7.3, 7.4, 7.5, 10.6_

- [x] 11. Build the interactive Itinerary view (Day and Stop rendering)
  - Create `src/components/ItineraryView/`, `src/components/DayCard/`, and `src/components/StopItem/` per design.md's component table.
  - On receiving a validated `Itinerary`, copy `itinerary.days` into local `useState<Day[]>` (`structuredClone`), keyed by `requestId` so a new successful fetch resets local edit state.
  - Render each Day as a distinct section with its ordered Stops, each Stop defaulting to collapsed (title + time only) with an expand/collapse toggle showing full detail when expanded.
  - Display a "no stops" indicator on any Day with zero Stop entries, without removing the Day itself.
  - Wire `ResultArea` to render `ItineraryView` for the populated case.
  - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.8_

- [x] 12. Implement remove and reorder controls on Stops
  - Add a remove button to `StopItem` that filters the Stop out of its Day's local state immutably, with no confirmation step.
  - Add move-up/move-down buttons to `StopItem`, with `isFirst`/`isLast` computed by `DayCard` from array index, implementing the immutable splice-and-swap logic from design.md, disabling (or no-op'ing) the move at the first/last boundary.
  - _Requirements: 6.4, 6.5, 6.6_

- [x] 13. Implement retry and regenerate flows
  - Add a retry control shown whenever the full-page `ErrorState` or a non-blocking retained-error indicator is displayed; disable it while a retry-triggered request is in flight, and apply the same empty/whitespace validation as initial submission before resubmitting.
  - Ensure retry and regenerate submissions go through the same `submit()` path in `useItineraryRequest` so they are subject to the same stale-response handling as any other request.
  - Add a `RetryBanner`-style non-blocking indicator shown when a background retry/regenerate request fails or times out while a previous itinerary is retained, so the previous itinerary stays visible instead of being replaced by a full error state.
  - Allow submitting a new/edited Trip_Description while a valid itinerary is displayed, replacing it with the new one on success.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 14. Implement the timeout handling path end-to-end
  - Add a 30-second client-side timeout to the frontend's call to the backend (mirroring the backend's own 30s Gemini timeout), aborting via `AbortController` and mapping the resulting abort to the `timeout` reason in `fetchAndValidateItinerary`.
  - Confirm the timeout path surfaces a distinct "That took too long, please try again" error message with a retry control, and that it is discarded correctly if a newer request has since been submitted.
  - _Requirements: 2.8, 4.6_

- [x] 15. Apply the shared design token system and semantic/accessible markup
  - Create `src/styles/tokens.css` with the color, spacing, typography, radius, and transition custom properties from design.md, and apply them consistently across the input form and all state components (no one-off values).
  - Add a global `:focus-visible` outline style using `--color-focus-ring`, and audit all interactive elements to confirm they are native `button`/`textarea`/semantic elements reachable in a single logical Tab sequence with no focus trap.
  - Verify text/background color pairs meet the 4.5:1 contrast ratio and the focus ring meets 3:1 against its adjacent background.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16. Implement mobile-responsive layout
  - Add the mobile-first CSS from design.md: single-column stacked Day layout by default, a `768px` min-width media query switching to the desktop layout, `min-width`/`min-height: 44px` on all interactive controls, and `box-sizing: border-box` plus `max-width: 100%` on the root container to prevent horizontal overflow.
  - Manually verify at 375px, 768px, and a desktop width using browser dev-tools device toolbar: no clipped/overlapping content, no horizontal scroll, and all controls remain at least 44x44px on narrow widths.
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 17. Run the full manual verification checklist and fix any issues found
  - Work through the manual checklist from design.md's Testing Strategy: empty submit, max-length submit, normal submit; kill network mid-request and confirm error + retry; force an empty-days response and confirm the empty-result state is distinct from the error state; rapid double-submit and confirm only the latest itinerary is displayed; expand/collapse, remove, move-up/down including first/last boundary no-ops; keyboard-only pass through the entire page.
  - Fix any defects found before proceeding.
  - _Requirements: 4.4, 5.4, 6.6, 7.5, 9.3_

- [x] 18. Write the project README
  - Document prerequisites and step-by-step setup/startup instructions for the frontend and backend proxy sufficient for `npm install && npm start` to produce a working local instance, including the exact `GEMINI_API_KEY` environment variable name and how to set it (referencing `.env.example`).
  - Add an AI-usage note describing which AI tools were used during development and what they were used for.
  - Add a "known limitations" section describing gaps, edge cases, or unimplemented stretch goals.
  - Add a statement of the approximate time spent building the project.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

---

## Optional Stretch Tasks (Time-Permitting)

**Do not start any task in this section until all core tasks above (1-18) are complete, committed, and verified.** These correspond to Requirements 13-17, which are explicitly optional stretch goals.

- [x] 19. Add multiple AI-driven block types
  - Extend `StopSchema` to a Zod discriminated union on a `type` field (`"stop" | "cost" | "checklist" | "chart"`), documenting the finite set of recognized types.
  - Turn `StopItem` into a dispatcher that renders a type-specific component (`CostCard`, `ChecklistCard`, etc.) for recognized types, falling back to the default Stop rendering for missing/unrecognized types, and treating blocks missing required base fields as invalid per the existing parse pipeline (no fallback rendering for those).
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 20. Add streaming itinerary responses
  - Swap the backend's single Gemini `fetch` for its streaming endpoint, forwarding chunks to the frontend via Server-Sent Events.
  - Swap the frontend's `fetch().then()` in `useItineraryRequest` for an `EventSource`/`ReadableStream` reader feeding into a new `"streaming"` status, rendering Day/Stop entries incrementally with an in-progress indicator, applying the same stale-request handling to in-progress streams, and validating the fully-assembled response with `ItinerarySchema.safeParse` before treating it as final.
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 21. Add the refinement loop
  - Add a `POST /api/itinerary/refine` endpoint accepting `{ currentItinerary, instruction }`, reusing the existing prompt-builder/schema/validation pipeline.
  - Add a follow-up instruction input (up to 1000 characters) shown while a valid itinerary is displayed, blocking empty/whitespace-only submissions, reusing `useItineraryRequest`'s request-id/abort mechanism for staleness handling, replacing the displayed itinerary only on successful validation, and retaining the previous itinerary unchanged on failure.
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 22. Add save/reload session persistence
  - Create a `useLocalStorage`-style hook that writes the current itinerary to `localStorage` on successful fetch and reads it back on mount, guarding anything read back out with `ItinerarySchema.safeParse` and discarding corrupted/invalid stored data without crashing.
  - Show a restore-or-discard prompt on load when a valid stored itinerary exists, before showing the initial empty state; wire "restore" to render it like a fresh result and "decline" to delete it from storage.
  - Ensure the app continues operating normally (no crash, no blocked functionality) if storage is unavailable or a write fails.
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

- [x] 23. Add UI polish: animations, dark mode, keyboard shortcuts
  - Add CSS transitions (≤500ms) for expand/collapse and reorder state changes, gated behind a `prefers-reduced-motion` media query that disables or instantly completes them.
  - Add a dark mode toggle using a second CSS custom-property block behind a `[data-theme="dark"]` attribute, persisting the choice in `localStorage` and defaulting to light theme when no preference is stored.
  - Add a `keydown` listener on `window` for common action shortcuts (e.g. expand all days, submit) that early-returns when focus is within a text input or textarea.
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

## Task Dependency Graph

```
1 (scaffold)
└─▶ 2 (shared schema) ──▶ 2.1 (schema tests)
    └─▶ 3 (server skeleton) ──▶ 3.1 (request validation + key guard)
        └─▶ 4 (Gemini integration) ──▶ 5 (backend response validation)
    └─▶ 6 (input form)
    └─▶ 7 (frontend parse/validate) ──▶ 7.1 (parse/validate tests)
        └─▶ 8 (useItineraryRequest hook) ──▶ 8.1 (race-condition test)
            └─▶ 9 (wire form to hook)   [depends on 5, 6, 8 all being done]
                └─▶ 10 (loading/error/empty states)
                    └─▶ 11 (ItineraryView Day/Stop rendering)
                        └─▶ 12 (remove/reorder controls)
                        └─▶ 13 (retry/regenerate flows)   [depends on 9, 10]
                            └─▶ 14 (timeout handling end-to-end)
                                └─▶ 15 (design tokens + accessibility)
                                    └─▶ 16 (mobile responsiveness)
                                        └─▶ 17 (manual verification checklist)
                                            └─▶ 18 (README)

Stretch (all depend on 1-18 being complete):
18 ──▶ 19 (block types)
18 ──▶ 20 (streaming)
18 ──▶ 21 (refinement loop)
18 ──▶ 22 (save/reload sessions)
18 ──▶ 23 (UI polish: animation, dark mode, shortcuts)
```

Tasks 19-23 are independent of each other and may be done in any order or skipped entirely, since none of the mandatory Requirements 1-12 depend on them.

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "6", "7"] },
    { "wave": 3, "tasks": ["2.1", "3.1", "7.1", "8"] },
    { "wave": 4, "tasks": ["4", "8.1"] },
    { "wave": 5, "tasks": ["5"] },
    { "wave": 6, "tasks": ["9"] },
    { "wave": 7, "tasks": ["10"] },
    { "wave": 8, "tasks": ["11"] },
    { "wave": 9, "tasks": ["12", "13"] },
    { "wave": 10, "tasks": ["14"] },
    { "wave": 11, "tasks": ["15"] },
    { "wave": 12, "tasks": ["16"] },
    { "wave": 13, "tasks": ["17"] },
    { "wave": 14, "tasks": ["18"] },
    { "wave": 15, "tasks": ["19", "20", "21", "22", "23"] }
  ]
}
```

## Notes

- Every task ends with a `_Requirements: X.Y_` reference back to requirements.md; consult design.md for the exact code shapes (types, function signatures, CSS tokens) referenced in each task's description.
- Tasks 1-18 are scoped to fit the assignment's ~8-hour budget for the mandatory core; tasks 19-23 are optional and should only be attempted if time remains after 1-18 are complete and verified.
- Each top-level task (and each `.1` sub-task) is sized to correspond to roughly one meaningful, independently committable unit of work, consistent with Requirement 12's incremental git history expectation.
