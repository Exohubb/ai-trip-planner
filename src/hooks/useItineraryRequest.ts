import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Day, Itinerary } from "@shared/itinerarySchema";
import { fetchAndValidateItinerary, type ParseResult } from "../lib/fetchAndValidateItinerary";
import { streamItinerary, type StreamOutcome } from "../lib/streamItinerary";
import { fetchAndValidateRefinement } from "../lib/fetchAndValidateRefinement";

// Mirrors the backend's own 30s timeout on its Gemini call (server/gemini.ts),
// so the frontend never waits indefinitely on a hung backend request (Req 2.8, 4.6).
const REQUEST_TIMEOUT_MS = 30_000;

export type RequestStatus = "idle" | "loading" | "streaming" | "success" | "error";

export interface RequestState {
  status: RequestStatus;
  itinerary: Itinerary | null; // last successfully validated itinerary; NOT cleared on new loading/error
  errorMessage: string | null;
  isBackground: boolean; // true when status is loading/streaming/error but itinerary is non-null
  tripDescription: string;
  // id of the request whose itinerary is currently loaded (0 = none yet). Consumers
  // (e.g. ItineraryView) key off this so a new successful fetch resets local edit
  // state, while background loading/error cycles that retain the old itinerary do not.
  requestId: number;
  // Day objects accumulated so far from an in-progress or interrupted streaming
  // request (Requirement 14.1/14.2). Only meaningful while status is "streaming",
  // or "error" with streamIncomplete true and no full itinerary retained.
  partialDays: Day[];
  // True when the current "error" status originated from an interrupted/failed
  // streaming request rather than the regular non-streaming path (Requirement
  // 14.3), so the UI knows to show `partialDays` alongside an "incomplete
  // itinerary" message instead of the regular full-page ErrorState.
  streamIncomplete: boolean;
  // True while a refinement request (Requirement 15) is in flight. Kept
  // separate from `status` because a refinement failure must never replace
  // the displayed itinerary with a full-page error state (Req 15.5) — it's
  // a non-blocking, additive piece of state layered on top of an already
  // "success" status.
  isRefining: boolean;
  // Plain-language message set when the most recent refinement request
  // failed parsing/validation (Req 15.5). Cleared on the next successful
  // refinement submit/outcome. Does not affect `errorMessage`/`status`.
  refinementError: string | null;
}

export type Action =
  | { type: "SUBMIT"; description: string; requestId: number }
  | { type: "SUBMIT_STREAM"; description: string; requestId: number }
  | { type: "STREAM_CHUNK"; requestId: number; newDays: Day[] }
  | { type: "SUCCESS"; requestId: number; itinerary: Itinerary }
  | { type: "FAILURE"; requestId: number; message: string }
  | { type: "STREAM_FAILURE"; requestId: number; message: string }
  | { type: "SUBMIT_REFINEMENT"; requestId: number }
  | { type: "REFINEMENT_SUCCESS"; requestId: number; itinerary: Itinerary }
  | { type: "REFINEMENT_FAILURE"; requestId: number; message: string };

const initialState: RequestState = {
  status: "idle",
  itinerary: null,
  errorMessage: null,
  isBackground: false,
  tripDescription: "",
  requestId: 0,
  partialDays: [],
  streamIncomplete: false,
  isRefining: false,
  refinementError: null,
};

function reducer(state: RequestState, action: Action): RequestState {
  switch (action.type) {
    case "SUBMIT":
      return {
        ...state,
        status: "loading",
        errorMessage: null,
        tripDescription: action.description,
        // retained itinerary (if any) drives isBackground rather than clearing it
        isBackground: state.itinerary !== null,
        partialDays: [],
        streamIncomplete: false,
      };
    case "SUBMIT_STREAM":
      return {
        ...state,
        status: "streaming",
        errorMessage: null,
        tripDescription: action.description,
        isBackground: state.itinerary !== null,
        partialDays: [],
        streamIncomplete: false,
      };
    case "STREAM_CHUNK":
      return {
        ...state,
        partialDays: [...state.partialDays, ...action.newDays],
      };
    case "SUCCESS":
      return {
        ...state,
        status: "success",
        itinerary: action.itinerary,
        errorMessage: null,
        isBackground: false,
        requestId: action.requestId,
        partialDays: [],
        streamIncomplete: false,
      };
    case "FAILURE":
      return {
        ...state,
        status: "error",
        errorMessage: action.message,
        // previous itinerary (if any) is left untouched and drives isBackground here too
        isBackground: state.itinerary !== null,
        streamIncomplete: false,
      };
    case "STREAM_FAILURE":
      return {
        ...state,
        status: "error",
        errorMessage: action.message,
        isBackground: state.itinerary !== null,
        // `partialDays` accumulated so far is deliberately left untouched so
        // already-rendered Day/Stop entries stay visible (Requirement 14.3).
        streamIncomplete: true,
      };
    case "SUBMIT_REFINEMENT":
      return {
        ...state,
        isRefining: true,
        refinementError: null,
      };
    case "REFINEMENT_SUCCESS":
      // Replaces the displayed itinerary only on successful validation
      // (Req 15.6). `status` stays "success" and `requestId` is bumped so
      // ItineraryView resets its local edit state for the updated itinerary,
      // same as any other successful fetch.
      return {
        ...state,
        status: "success",
        itinerary: action.itinerary,
        requestId: action.requestId,
        isRefining: false,
        refinementError: null,
        errorMessage: null,
        isBackground: false,
      };
    case "REFINEMENT_FAILURE":
      // The previously displayed itinerary is retained unchanged (Req 15.5);
      // only the non-blocking `refinementError` is set.
      return {
        ...state,
        isRefining: false,
        refinementError: action.message,
      };
    default:
      return state;
  }
}

function toUserMessage(reason: Exclude<ParseResult, { ok: true }>["reason"]): string {
  switch (reason) {
    case "malformed_json":
    case "invalid_shape":
      return "The trip planner had trouble understanding the AI's response. Please try again.";
    case "http_error":
      return "The AI is temporarily unavailable. Please try again in a moment.";
    case "timeout":
      return "That took too long. Please try again.";
    case "network":
      return "Couldn't reach the server. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function toStreamUserMessage(reason: Exclude<StreamOutcome, { ok: true }>["reason"]): string {
  switch (reason) {
    case "malformed_json":
    case "invalid_shape":
      return "The itinerary that streamed in wasn't in the format we expected, so it's incomplete. Please try again.";
    case "http_error":
    case "upstream_error":
      return "The AI is temporarily unavailable, so the itinerary is incomplete. Please try again in a moment.";
    case "timeout":
      return "That took too long, so the itinerary is incomplete. Please try again.";
    case "network":
      return "Couldn't reach the server, so the itinerary is incomplete. Check your connection and try again.";
    default:
      return "Something went wrong, so the itinerary is incomplete. Please try again.";
  }
}

export interface UseItineraryRequestResult extends RequestState {
  submit: (description: string) => void;
  /**
   * Streaming counterpart to `submit` (Requirement 14). Subject to the exact
   * same request-id/AbortController staleness handling as `submit`: if a
   * new request (streamed or not) is submitted while this stream is still
   * in progress, this stream's `AbortController` is aborted and any further
   * chunks/outcome it produces are discarded (Requirement 14.4).
   */
  submitStreaming: (description: string) => void;
  /**
   * Submits a follow-up refinement instruction against the currently
   * displayed itinerary (Requirement 15). Goes through the same
   * request-id/AbortController staleness pattern as `submit`/`submitStreaming`
   * (Req 15.3): a subsequent submit/submitStreaming/submitRefinement call
   * marks this one stale, and its outcome is discarded if it arrives late.
   * On success, replaces `itinerary`; on failure, `itinerary` is left
   * untouched and `refinementError` is set instead (Req 15.5/15.6).
   */
  submitRefinement: (instruction: string) => void;
}

/**
 * Request_Manager: owns the request-lifecycle state machine for itinerary fetches.
 * Tracks the latest request id + AbortController so that only the most recently
 * submitted request's outcome is ever reflected in state (Requirements 5.1-5.6).
 */
export function useItineraryRequest(): UseItineraryRequestResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const latestRequestId = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const submit = useCallback((description: string) => {
    const requestId = ++latestRequestId.current; // marks all prior requests stale
    abortControllerRef.current?.abort(); // cancel previous in-flight fetch (Req 5.2)
    const controller = new AbortController();
    abortControllerRef.current = controller;
    dispatch({ type: "SUBMIT", description, requestId });

    // Client-side timeout mirroring the backend's own 30s Gemini timeout (Req 2.8, 4.6):
    // abort this request's fetch if it hasn't settled within 30s, which
    // fetchAndValidateItinerary maps to reason: "timeout".
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    fetchAndValidateItinerary(description, controller.signal).then((result) => {
      clearTimeout(timeoutId);
      if (requestId !== latestRequestId.current) return; // stale outcome discarded (Req 5.3)

      if (result.ok) {
        dispatch({ type: "SUCCESS", requestId, itinerary: result.itinerary });
      } else {
        dispatch({ type: "FAILURE", requestId, message: toUserMessage(result.reason) });
      }
    });
  }, []);

  const submitStreaming = useCallback((description: string) => {
    const requestId = ++latestRequestId.current; // marks all prior requests stale (Req 14.4)
    abortControllerRef.current?.abort(); // cancel previous in-flight fetch/stream (Req 5.2, 14.4)
    const controller = new AbortController();
    abortControllerRef.current = controller;
    dispatch({ type: "SUBMIT_STREAM", description, requestId });

    // Same client-side 30s timeout as the non-streaming path (Req 2.8, 4.6),
    // applied identically to the in-progress stream.
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    streamItinerary(description, controller.signal, {
      onDays: (newDays) => {
        if (requestId !== latestRequestId.current) return; // stale chunk discarded (Req 14.4)
        dispatch({ type: "STREAM_CHUNK", requestId, newDays });
      },
    }).then((result) => {
      clearTimeout(timeoutId);
      if (requestId !== latestRequestId.current) return; // stale outcome discarded (Req 5.3, 14.4)

      if (result.ok) {
        dispatch({ type: "SUCCESS", requestId, itinerary: result.itinerary });
      } else {
        dispatch({ type: "STREAM_FAILURE", requestId, message: toStreamUserMessage(result.reason) });
      }
    });
  }, []);

  const submitRefinement = useCallback(
    (instruction: string) => {
      if (!state.itinerary) return; // nothing to refine against; UI only shows this control when itinerary is non-null

      const requestId = ++latestRequestId.current; // marks all prior requests (incl. any other refinement) stale (Req 15.3)
      abortControllerRef.current?.abort(); // cancel previous in-flight fetch (Req 5.2, 15.3)
      const controller = new AbortController();
      abortControllerRef.current = controller;
      dispatch({ type: "SUBMIT_REFINEMENT", requestId });

      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      fetchAndValidateRefinement(state.itinerary, instruction, controller.signal).then((result) => {
        clearTimeout(timeoutId);
        if (requestId !== latestRequestId.current) return; // stale outcome discarded (Req 15.3)

        if (result.ok) {
          dispatch({ type: "REFINEMENT_SUCCESS", requestId, itinerary: result.itinerary });
        } else {
          dispatch({ type: "REFINEMENT_FAILURE", requestId, message: toUserMessage(result.reason) });
        }
      });
    },
    [state.itinerary]
  );

  // Abort any in-flight request if the hook's consumer unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { ...state, submit, submitStreaming, submitRefinement };
}
