/**
 * Builds the prompt payload sent to Gemini's `generateContent` REST endpoint:
 * a system instruction, a `responseSchema` mirroring `shared/itinerarySchema.ts`'s
 * Zod shape (expressed in Gemini's OpenAPI-subset JSON Schema dialect), and the
 * user's Trip_Description as the user content turn.
 *
 * See design.md's "Data Models" and "Backend Proxy Design" sections.
 */

const SYSTEM_INSTRUCTION = `Return ONLY a JSON object matching the provided schema. Do not include any
prose, markdown, or explanation outside the JSON. "days" must be an array,
ordered by day number, of at most 30 entries. Each day's "stops" must be an
array of at most 20 entries. Every stop must have a non-empty "title".`;

/**
 * Gemini's structured-output schema dialect (a subset of OpenAPI/JSON Schema).
 * Mirrors `StopSchema`/`DaySchema`/`ItinerarySchema` from `shared/itinerarySchema.ts`.
 */
const ITINERARY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    days: {
      type: "ARRAY",
      maxItems: 30,
      items: {
        type: "OBJECT",
        properties: {
          id: {
            type: "STRING",
            description: "Day identifier, e.g. 1 or \"Day 1\".",
          },
          stops: {
            type: "ARRAY",
            maxItems: 20,
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                time: { type: "STRING" },
                description: { type: "STRING" },
                location: { type: "STRING" },
                notes: { type: "STRING" },
              },
              required: ["title"],
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
