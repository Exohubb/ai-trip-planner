/**
 * Builds the prompt payload sent to Gemini's `generateContent` REST endpoint:
 * a system instruction, a `responseSchema` mirroring `shared/itinerarySchema.ts`'s
 * Zod shape (expressed in Gemini's OpenAPI-subset JSON Schema dialect), and the
 * user's Trip_Description as the user content turn.
 *
 * See design.md's "Data Models" and "Backend Proxy Design" sections.
 */

import type { Itinerary } from "../shared/itinerarySchema.ts";

const SYSTEM_INSTRUCTION = `Return ONLY a JSON object matching the provided schema. Do not include any
prose, markdown, or explanation outside the JSON. "days" must be an array,
ordered by day number, of at most 30 entries. Each day's "stops" must be an
array of at most 20 entries. Every stop must have a unique, non-empty "id"
string and a non-empty "title".`;

/**
 * Gemini's structured-output schema dialect (a subset of OpenAPI/JSON Schema).
 * Mirrors `StopSchema`/`DaySchema`/`ItinerarySchema` from `shared/itinerarySchema.ts`.
 */
const ITINERARY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: {
            type: "STRING",
            description: "Day identifier, e.g. 1 or \"Day 1\".",
          },
          stops: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: {
                  type: "STRING",
                  description: "A unique identifier for this stop, e.g. \"stop-1\".",
                },
                title: { type: "STRING" },
                time: { type: "STRING" },
                description: { type: "STRING" },
                location: { type: "STRING" },
                notes: { type: "STRING" },
              },
              required: ["id", "title"],
            },
          },
        },
        required: ["id", "stops"],
      },
    },
  },
  required: ["days"],
} as const;

export interface GeminiPromptPayload {
  contents: Array<{
    role: "user";
    parts: Array<{ text: string }>;
  }>;
  systemInstruction: {
    parts: Array<{ text: string }>;
  };
  generationConfig: {
    responseMimeType: "application/json";
    responseSchema: typeof ITINERARY_RESPONSE_SCHEMA;
  };
}

/**
 * Builds the full request body for Gemini's `generateContent` endpoint from a
 * user's Trip_Description.
 */
export function buildItineraryPrompt(tripDescription: string): GeminiPromptPayload {
  return {
    contents: [
      {
        role: "user",
        parts: [{ text: tripDescription }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ITINERARY_RESPONSE_SCHEMA,
    },
  };
}

/**
 * System instruction for the refinement loop (Requirement 15). Reuses the
 * same JSON-only/schema constraints as `SYSTEM_INSTRUCTION`, plus explicit
 * guidance that the model is editing an existing itinerary rather than
 * generating one from scratch: it should apply the follow-up instruction
 * while leaving everything else about the itinerary intact.
 */
const REFINEMENT_SYSTEM_INSTRUCTION = `You are updating an existing trip itinerary based on a follow-up
instruction from the user. You will be given the current itinerary as JSON,
followed by the user's follow-up instruction. Return ONLY a JSON object
matching the provided schema representing the FULL, UPDATED itinerary —
apply the follow-up instruction's requested changes, and otherwise preserve
the existing days and stops as they are. Do not include any prose, markdown,
or explanation outside the JSON. "days" must be an array, ordered by day
number, of at most 30 entries. Each day's "stops" must be an array of at
most 20 entries. Every stop must have a unique, non-empty "id" string and a
non-empty "title".`;

/**
 * Builds the full request body for Gemini's `generateContent` endpoint for a
 * refinement request (Requirement 15.2): the user turn contains both the
 * current, validated `Itinerary` (serialized as JSON) and the user's
 * follow-up instruction, so the model can return an updated itinerary that
 * reflects the instruction. Reuses the same `responseSchema`/JSON-mode
 * constraints as `buildItineraryPrompt` so the result goes through the
 * identical callLLM → JSON.parse → ItinerarySchema.safeParse pipeline.
 */
export function buildRefinementPrompt(currentItinerary: Itinerary, instruction: string): GeminiPromptPayload {
  const userTurnText = `Current itinerary (JSON):\n${JSON.stringify(currentItinerary)}\n\nFollow-up instruction:\n${instruction}`;

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: userTurnText }],
      },
    ],
    systemInstruction: {
      parts: [{ text: REFINEMENT_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ITINERARY_RESPONSE_SCHEMA,
    },
  };
}
