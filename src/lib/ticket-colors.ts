import type { TicketStatus, TicketPriority } from "@/lib/tickets"

// --- Color Token Type ---
export type ColorToken =
  | "gray"
  | "slate"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "purple"
  | "pink"

export const ALL_COLOR_TOKENS: ColorToken[] = [
  "gray",
  "slate",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "pink",
]

// --- Color Token Labels (German) ---
export const COLOR_TOKEN_LABELS: Record<ColorToken, string> = {
  gray: "Grau",
  slate: "Schiefergrau",
  red: "Rot",
  orange: "Orange",
  yellow: "Gelb",
  green: "Gruen",
  teal: "Teal",
  blue: "Blau",
  indigo: "Indigo",
  purple: "Lila",
  pink: "Pink",
}

// --- Static lookup: token -> full Tailwind class strings ---
// These must be statically present so Tailwind doesn't purge them.

export const COLOR_BADGE_CLASSES: Record<ColorToken, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
}

// Swatch preview colors (the background for the palette picker)
export const COLOR_SWATCH_CLASSES: Record<ColorToken, string> = {
  gray: "bg-gray-400 dark:bg-gray-500",
  slate: "bg-slate-400 dark:bg-slate-500",
  red: "bg-red-500 dark:bg-red-400",
  orange: "bg-orange-500 dark:bg-orange-400",
  yellow: "bg-yellow-400 dark:bg-yellow-500",
  green: "bg-green-500 dark:bg-green-400",
  teal: "bg-teal-500 dark:bg-teal-400",
  blue: "bg-blue-500 dark:bg-blue-400",
  indigo: "bg-indigo-500 dark:bg-indigo-400",
  purple: "bg-purple-500 dark:bg-purple-400",
  pink: "bg-pink-500 dark:bg-pink-400",
}

// --- Default color assignments ---

export const DEFAULT_STATUS_COLORS: Record<TicketStatus, ColorToken> = {
  open: "green",
  in_progress: "blue",
  resolved: "purple",
  closed: "gray",
  on_hold: "yellow",
}

export const DEFAULT_PRIORITY_COLORS: Record<TicketPriority, ColorToken> = {
  low: "slate",
  medium: "blue",
  high: "orange",
  critical: "red",
}

// --- Helper to get badge classes from a token ---

export function getBadgeClasses(token: ColorToken | string): string {
  const mapped = COLOR_BADGE_CLASSES[token as ColorToken]
  return mapped ?? COLOR_BADGE_CLASSES.gray
}

// --- Settings key helpers ---

export function statusColorKey(status: TicketStatus): string {
  return `ticket_status_color_${status}`
}

export function priorityColorKey(priority: TicketPriority): string {
  return `ticket_priority_color_${priority}`
}
