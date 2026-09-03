import { z } from "zod";

/**
 * Base fields shared by every block within a Day's `stops` array, regardless
 * of its declared `type` (Requirement 3.4/3.6). A block missing any of these
 * required fields (namely a non-empty `title`) is invalid no matter its
 * `type`, and invalidates the whole Itinerary_Response per the existing
 * parse-then-validate pipeline — no per-block fallback rendering is ever
 * attempted for a block that fails this base validation (Requirement 13.4).
 */
const baseBlockFields = {
  id: z.string(),
  title: z.string().trim().min(1).max(200),
  time: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
};

/**
 * Plain Stop block — the default/most common block, and the only block
 * shape that existed before Requirement 13 (multiple AI-driven block types)
 * was introduced.
 */
export const StopBlockSchema = z.object({
  type: z.literal("stop"),
  ...baseBlockFields,
});

/** Cost-summary block: a list of cost line items plus an optional total. */
export const CostBlockSchema = z.object({
  type: z.literal("cost"),
  ...baseBlockFields,
  costItems: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        amount: z.number(),
      }),
    )
    .max(50)
    .default([]),
  currency: z.string().max(10).optional(),
  total: z.number().optional(),
});

/** Packing-checklist block: a list of checkable items. */
export const ChecklistBlockSchema = z.object({
  type: z.literal("checklist"),
  ...baseBlockFields,
  items: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        checked: z.boolean().default(false),
      }),
    )
    .max(50)
    .default([]),
});

/** Simple chart block: labeled numeric data points rendered as bars. */
export const ChartBlockSchema = z.object({
  type: z.literal("chart"),
  ...baseBlockFields,
  chartData: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(100),
        value: z.number(),
      }),
    )
    .max(50)
    .default([]),
});

/**
 * The finite, documented set of recognized block type identifiers
 * (Requirement 13.1). `StopItem` renders a distinct, type-specific visual
 * representation for each of these (Requirement 13.2); any other `type`
 * value falls back to the default Stop-style rendering (Requirement 13.3).
 */
export const RECOGNIZED_BLOCK_TYPES = ["stop", "cost", "checklist", "chart"] as const;

const KnownBlockSchema = z.discriminatedUnion("type", [
  StopBlockSchema,
  CostBlockSchema,
  ChecklistBlockSchema,
  ChartBlockSchema,
]);

/**
 * A block whose declared `type` is a non-empty string that is NOT one of
 * the recognized identifiers above. It still requires the same base fields
 * as any other block (Requirement 13.4), but carries no type-specific extra
 * fields, since nothing downstream knows what shape to expect from an
 * unrecognized type — it is rendered with the default Stop-style
 * representation instead of being omitted (Requirement 13.3).
 *
 * The `.refine` guard is what keeps this branch scoped to genuinely
 * unrecognized type strings: a block declaring a *recognized* type (e.g.
 * `"cost"`) whose type-specific fields fail validation (e.g. a non-numeric
 * `amount`) must NOT silently fall back to this lenient branch — that would
 * mask a malformed AI response as valid. Instead it should fail the whole
 * union, consistent with how any other malformed nested structure elsewhere
 * in this schema (e.g. a malformed `stops` array) invalidates the response.
 */
const UnrecognizedBlockSchema = z.object({
  ...baseBlockFields,
  type: z.string().refine((type) => !RECOGNIZED_BLOCK_TYPES.includes(type as never)),
});

/**
 * A Stop/block is either a recognized type (validated against its
 * type-specific shape) or a genuinely unrecognized one (validated against
 * only the base fields). Either way, a block missing required base fields
 * fails both branches and is treated as invalid (Requirement 13.4). A block
 * declaring a recognized type with malformed type-specific fields also
 * fails both branches (see `UnrecognizedBlockSchema` above), rather than
 * being masked as a valid unrecognized block.
 */
const BlockSchema = z.union([KnownBlockSchema, UnrecognizedBlockSchema]);

/**
 * Backward compatibility (Requirement 13.1 note): every pre-existing Stop
 * fixture/consumer in this codebase builds a Stop without a `type` field at
 * all — the plain-Stop shape that predates Requirement 13. A missing,
 * non-string, or blank `type` is treated as the default `"stop"` type
 * before the union above ever sees it, so every such Stop continues to
 * validate identically to before this change.
 *
 * This is done via `z.preprocess` rather than `.optional()`/`.default()`
 * directly on the discriminator field, because Zod's discriminated union
 * dispatches on the *raw* input value at the discriminator key — it does
 * not apply a branch's own default before picking a branch — so a
 * genuinely missing key must be filled in ahead of the union, not inside
 * it. A true Zod discriminated union also cannot itself express "any other
 * string" as a branch (each branch's discriminator must be a distinct
 * literal), which is why the unrecognized-type fallback above is a sibling
 * `z.union` branch rather than part of the discriminated union itself.
 */
export const StopSchema = z.preprocess((value) => {
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  if (typeof record.type !== "string" || record.type.trim().length === 0) {
    return { ...record, type: "stop" };
  }
  return record;
}, BlockSchema);

export const DaySchema = z.object({
  id: z.union([z.string(), z.number()]),
  stops: z.array(StopSchema).max(20).default([]),
});

export const ItinerarySchema = z.object({
  days: z.array(DaySchema).max(30).default([]),
});

export type StopBlock = z.infer<typeof StopBlockSchema>;
export type CostBlock = z.infer<typeof CostBlockSchema>;
export type ChecklistBlock = z.infer<typeof ChecklistBlockSchema>;
export type ChartBlock = z.infer<typeof ChartBlockSchema>;
type UnrecognizedBlock = z.infer<typeof UnrecognizedBlockSchema>;

/**
 * The public `Stop` type intentionally makes `type` optional on the plain
 * Stop variant, even though `StopSchema`'s runtime `.preprocess` step always
 * fills it in with `"stop"` once parsing succeeds (see `StopSchema` above).
 *
 * This is the backward-compatibility decision called for by Requirement
 * 13.1: every Stop object built anywhere in this codebase before block
 * types existed (all existing components, hooks, and tests) constructs a
 * plain `{ id, title, ... }` object with no `type` field at all. Zod's
 * discriminated union requires the branches to have distinct discriminator
 * *values*, but nothing stops the exported TypeScript type from being more
 * lenient than the schema's own inferred output type — so this type is
 * hand-written (as a union, mirroring the schema's branches) instead of
 * using `z.infer<typeof StopSchema>` directly, letting every pre-existing
 * Stop literal keep compiling and behaving identically, while `.type` is
 * still guaranteed to be a real string once a value has actually passed
 * through `StopSchema.safeParse`.
 */
export type Stop =
  | (Omit<StopBlock, "type"> & { type?: "stop" })
  | CostBlock
  | ChecklistBlock
  | ChartBlock
  | UnrecognizedBlock;

export interface Day {
  id: string | number;
  stops: Stop[];
}

export interface Itinerary {
  days: Day[];
}

/**
 * Type-predicate helpers used by the Itinerary_View dispatcher (`StopItem`)
 * to render a type-specific component for each recognized block type
 * (Requirement 13.2), falling back to the default Stop rendering for
 * anything else (Requirement 13.3).
 *
 * These are plain `stop.type === "..."` checks, but written as explicit
 * user-defined type predicates rather than inline comparisons/`switch`,
 * because `Stop`'s inferred type includes the unrecognized-block branch
 * (whose `type` field is a general `string`, not a literal). That branch's
 * `.refine()` guarantees at parse time it can never actually hold a
 * recognized `type` value, but TypeScript's structural discriminated-union
 * narrowing can't see that runtime guarantee — a plain `switch`/`===` check
 * would leave the unrecognized-block member in the narrowed type too
 * (missing e.g. `costItems`). A named type predicate is trusted by the
 * compiler directly, sidestepping that ambiguity.
 */
export function isCostBlock(stop: Stop): stop is CostBlock {
  return stop.type === "cost";
}

export function isChecklistBlock(stop: Stop): stop is ChecklistBlock {
  return stop.type === "checklist";
}

export function isChartBlock(stop: Stop): stop is ChartBlock {
  return stop.type === "chart";
}
