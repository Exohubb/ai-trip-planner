import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Itinerary } from "@shared/itinerarySchema";
import { fetchAndValidateItinerary, type ParseResult } from "../lib/fetchAndValidateItinerary";

// Mirrors the backend's own 30s timeout on its Gemini call (server/gemini.ts),
// so the frontend never waits indefinitely on a hung backend request (Req 2.8, 4.6).
const REQUEST_TIMEOUT_MS = 30_000;

export type RequestStatus = "idle" | "loading" | "success" | "error";

export interface RequestState {
  status: RequestStatus;
  itinerary: Itinerary | null; // last successfully validated itinerary; NOT cleared on new loading/error
  errorMessage: string | null;
  isBackground: boolean; // true when status is loading/error but itinerary is non-null
  tripDescription: string;
  // id of the request whose itinerary is currently loaded (0 = none yet). Consumers
  // (e.g. ItineraryView) key off this so a new successful fetch resets local edit
  // state, while background loading/error cycles that retain the old itinerary do not.
  requestId: number;
}

export type Action =
  | { type: "SUBMIT"; description: string; requestId: number }
  | { type: "SUCCESS"; requestId: number; itinerary: Itinerary }
  | { type: "FAILURE"; requestId: number; message: string };

const initialState: RequestState = {
  status: "idle",
  itinerary: null,
  errorMessage: null,
  isBackground: false,
  tripDescription: "",
  requestId: 0,
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
      };
    case "SUCCESS":
      return {
        ...state,
        status: "success",
        itinerary: action.itinerary,
        errorMessage: null,
        isBackground: false,
        requestId: action.requestId,
      };
    case "FAILURE":
      return {
        ...state,
        status: "error",
        errorMessage: action.message,
        // previous itinerary (if any) is left untouched and drives isBackground here too
        isBackground: state.itinerary !== null,
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

export interface UseItineraryRequestResult extends RequestState {
  submit: (description: string) => void;
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

  // Abort any in-flight request if the hook's consumer unmounts.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { ...state, submit };
}
