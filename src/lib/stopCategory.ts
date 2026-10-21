import {
  BedDouble,
  ChartColumn,
  Landmark,
  ListChecks,
  MapPin,
  Martini,
  Palette,
  ShoppingBag,
  Ticket,
  TrainFront,
  Trees,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Stop } from "@shared/itinerarySchema";

export interface CategoryStyle {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Accent color for the timeline dot and chips. */
  color: string;
}

const CATEGORIES: Record<string, CategoryStyle> = {
  sight: { key: "sight", label: "Sight", icon: Landmark, color: "#4f46e5" },
  culture: { key: "culture", label: "Culture", icon: Palette, color: "#9333ea" },
  food: { key: "food", label: "Food & drink", icon: UtensilsCrossed, color: "#ea580c" },
  nature: { key: "nature", label: "Nature", icon: Trees, color: "#16a34a" },
  activity: { key: "activity", label: "Activity", icon: Ticket, color: "#db2777" },
  shopping: { key: "shopping", label: "Shopping", icon: ShoppingBag, color: "#0891b2" },
  nightlife: { key: "nightlife", label: "Nightlife", icon: Martini, color: "#7c3aed" },
  transport: { key: "transport", label: "Transport", icon: TrainFront, color: "#475569" },
  lodging: { key: "lodging", label: "Stay", icon: BedDouble, color: "#0d9488" },
  other: { key: "other", label: "Stop", icon: MapPin, color: "#64748b" },
  cost: { key: "cost", label: "Budget", icon: Wallet, color: "#ca8a04" },
  checklist: { key: "checklist", label: "Checklist", icon: ListChecks, color: "#0284c7" },
  chart: { key: "chart", label: "Chart", icon: ChartColumn, color: "#c026d3" },
};

/** Keyword hints used when the AI didn't supply a category (older data). */
const KEYWORDS: Array<[RegExp, string]> = [
  [/breakfast|brunch|lunch|dinner|caf[eé]|coffee|food|market|restaurant|tasting|bakery|street food|eat/i, "food"],
  [/hike|trek|park|garden|beach|lake|waterfall|forest|mountain|trail|island/i, "nature"],
  [/museum|gallery|temple|shrine|church|cathedral|palace|castle|mosque|art/i, "culture"],
  [/hotel|check[- ]?in|check[- ]?out|hostel|resort|stay/i, "lodging"],
  [/flight|airport|train|transfer|bus|ferry|drive|taxi/i, "transport"],
  [/bar|club|nightlife|pub|show|concert/i, "nightlife"],
  [/shop|souk|mall|boutique/i, "shopping"],
  [/tour|cruise|class|lesson|ride|dive|snorkel/i, "activity"],
];

/**
 * Picks the visual style for a stop: its block type for cost/checklist/
 * chart blocks, then the AI-provided `category`, then a keyword guess from
 * the title, falling back to a generic pin.
 */
export function categoryFor(stop: Stop): CategoryStyle {
  if (stop.type && CATEGORIES[stop.type] && stop.type !== "stop") return CATEGORIES[stop.type];
  const explicit = stop.category?.toLowerCase();
  if (explicit && CATEGORIES[explicit]) return CATEGORIES[explicit];
  const match = KEYWORDS.find(([pattern]) => pattern.test(stop.title));
  return CATEGORIES[match ? match[1] : "other"];
}

/** True when the category came from the data itself (so it's safe to show as a label). */
export function hasExplicitCategory(stop: Stop): boolean {
  const explicit = stop.category?.toLowerCase();
  return Boolean(explicit && CATEGORIES[explicit]);
}

/** Google Maps search URL for a free-form location string. */
export function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/** "USD 1,250" style amount, matching how cost blocks have always been shown. */
export function formatAmount(amount: number, currency?: string): string {
  const value = amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return currency ? `${currency} ${value}` : value;
}
