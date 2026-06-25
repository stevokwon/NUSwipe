// components/calendar/utils.ts

import type { CalendarEvent, InterviewSlot } from "./types";

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatSlot(slot: InterviewSlot) {
  return `${slot.date} · ${slot.start}–${slot.end}`;
}

export function formatDateLabel(val: string) {
  if (!val) return "Select date";
  const [y, m, d] = val.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-SG", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function parseTimeParts(val: string): { h: string; m: string } {
  if (!val) return { h: "", m: "" };
  const [h, m] = val.split(":");
  return { h: h ?? "", m: m ?? "" };
}

export function parseEventDate(event: CalendarEvent): string {
  if (event.start.date) return event.start.date;
  if (event.start.dateTime) {
    const d = new Date(event.start.dateTime);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

export function parseEventTime(dateTime?: string): string {
  if (!dateTime) return "";
  const d = new Date(dateTime);
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function getEventBarColor(colorId?: string) {
  const colors: Record<string, string> = {
    "1":  "bg-sky-500/30 text-sky-200",
    "2":  "bg-emerald-500/30 text-emerald-200",
    "3":  "bg-violet-500/30 text-violet-200",
    "4":  "bg-rose-500/30 text-rose-200",
    "5":  "bg-amber-500/30 text-amber-200",
    "6":  "bg-orange-500/30 text-orange-200",
    "7":  "bg-cyan-500/30 text-cyan-200",
    "8":  "bg-slate-500/30 text-slate-200",
    "9":  "bg-blue-500/30 text-blue-200",
    "10": "bg-green-500/30 text-green-200",
    "11": "bg-red-500/30 text-red-200",
  };
  return colors[colorId ?? ""] ?? "bg-indigo-500/30 text-indigo-200";
}

export function getEventColor(colorId?: string) {
  const colors: Record<string, string> = {
    "1":  "bg-sky-500/20 text-sky-300 border-sky-500/30",
    "2":  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "3":  "bg-violet-500/20 text-violet-300 border-violet-500/30",
    "4":  "bg-rose-500/20 text-rose-300 border-rose-500/30",
    "5":  "bg-amber-500/20 text-amber-300 border-amber-500/30",
    "6":  "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "7":  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "8":  "bg-slate-500/20 text-slate-300 border-slate-500/30",
    "9":  "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "10": "bg-green-500/20 text-green-300 border-green-500/30",
    "11": "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return colors[colorId ?? ""] ?? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
}

/** Build a map of dateStr → events for the calendar grid. */
export function buildEventsByDate(events: CalendarEvent[]) {
  const map: Record<string, { event: CalendarEvent; isStart: boolean; isEnd: boolean }[]> = {};

  function addDay(ds: string) {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }
  function subDay(ds: string) {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  }

  for (const event of events) {
    const startRaw = event.start.dateTime ?? event.start.date ?? "";
    const endRaw   = event.end.dateTime   ?? event.end.date   ?? "";
    const startDate = startRaw.slice(0, 10);
    let endDate = endRaw.slice(0, 10);
    if (!event.end.dateTime && endDate > startDate) endDate = subDay(endDate);
    let cursor = startDate;
    while (cursor <= endDate) {
      if (!map[cursor]) map[cursor] = [];
      map[cursor].push({ event, isStart: cursor === startDate, isEnd: cursor === endDate });
      cursor = addDay(cursor);
    }
  }
  return map;
}