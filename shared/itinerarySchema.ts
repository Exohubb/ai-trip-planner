import { z } from "zod";

export const StopSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(200),
  time: z.string().max(500).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

export const DaySchema = z.object({
  id: z.union([z.string(), z.number()]),
  stops: z.array(StopSchema).max(20).default([]),
});

export const ItinerarySchema = z.object({
  days: z.array(DaySchema).max(30).default([]),
});

export type Stop = z.infer<typeof StopSchema>;
export type Day = z.infer<typeof DaySchema>;
export type Itinerary = z.infer<typeof ItinerarySchema>;
