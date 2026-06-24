"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Clock3,
  Link2,
  RefreshCw,
  Sparkles,
  Video,
  Unplug,
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

type InterviewSlot = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  timezone: string;
  provider: "google";
  htmlLink?: string | null;
};

type CalendarStatus = {
  connected: boolean;
  providerAccountEmail: string | null;
  calendarId: string | null;
  lastSyncedAt: string | null;
};

type GoogleCalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  colorId?: string;
};

const FUTURE_PROVIDERS = [
  { name: "Microsoft Calendar / Teams", note: "Planned" },
  { name: "Apple Calendar", note: "Planned" },
  { name: "ICS / file-based calendars", note: "Planned" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatSlot(slot: InterviewSlot) {
  return `${slot.date} · ${slot.start}–${slot.end} · ${slot.timezone}`;
}

// Solid bar colors for iOS-style event bars inside calendar cells
function getEventBarColor(colorId?: string) {
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

function getEventColor(colorId?: string) {
  const colors: Record<string, string> = {
    "1": "bg-sky-500/20 text-sky-300 border-sky-500/30",
    "2": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "3": "bg-violet-500/20 text-violet-300 border-violet-500/30",
    "4": "bg-rose-500/20 text-rose-300 border-rose-500/30",
    "5": "bg-amber-500/20 text-amber-300 border-amber-500/30",
    "6": "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "7": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "8": "bg-slate-500/20 text-slate-300 border-slate-500/30",
    "9": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "10": "bg-green-500/20 text-green-300 border-green-500/30",
    "11": "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return colors[colorId ?? ""] ?? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
}

function parseEventDate(event: GoogleCalendarEvent): string {
  if (event.start.date) return event.start.date;
  if (event.start.dateTime) {
    const d = new Date(event.start.dateTime);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

function parseEventTime(dateTime?: string): string {
  if (!dateTime) return "";
  const d = new Date(dateTime);
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function EmployerCalendarPage() {
  const searchParams = useSearchParams();
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [connection, setConnection] = useState<CalendarStatus>({
    connected: false,
    providerAccountEmail: null,
    calendarId: null,
    lastSyncedAt: null,
  });
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    date: "",
    start: "",
    end: "",
    timezone: "Asia/Singapore",
  });

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // 24hr hour and minute columns
  const hours24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  function formatTimeLabel(val: string) {
    if (!val) return "Select time";
    return val; // already HH:MM in 24hr
  }

  function parseTimeParts(val: string): { h: string; m: string } {
    if (!val) return { h: "", m: "" };
    const [h, m] = val.split(":");
    return { h: h ?? "", m: m ?? "" };
  }

  function formatDateLabel(val: string) {
    if (!val) return "Select date";
    const [y, m, d] = val.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-SG", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "1") toast.success("Google Calendar connected");
    if (error) toast.error(error);
  }, [searchParams]);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/google-calendar/status");
        if (!res.ok) throw new Error("Failed to load calendar status");
        const data = (await res.json()) as CalendarStatus;
        setConnection(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load calendar status");
      } finally {
        setLoadingStatus(false);
      }
    }
    void loadStatus();
  }, []);

  const fetchGoogleEvents = useCallback(async () => {
    if (!connection.connected) return;
    setLoadingEvents(true);
    try {
      const todayNow = new Date();
      todayNow.setHours(0, 0, 0, 0);
      const monthStart = new Date(viewYear, viewMonth, 1);
      const timeMin =
        viewYear === todayNow.getFullYear() && viewMonth === todayNow.getMonth()
          ? todayNow.toISOString()
          : monthStart.toISOString();
      const timeMax = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(
        `/api/google-calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      );
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setGoogleEvents(data.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load calendar events");
    } finally {
      setLoadingEvents(false);
    }
  }, [connection.connected, viewYear, viewMonth]);

  useEffect(() => {
    void fetchGoogleEvents();
  }, [fetchGoogleEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, { event: GoogleCalendarEvent; isStart: boolean; isEnd: boolean }[]> = {};

    function addDay(dateStr: string): string {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + 1));
      return dt.toISOString().slice(0, 10);
    }
    function subDay(dateStr: string): string {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d - 1));
      return dt.toISOString().slice(0, 10);
    }

    for (const event of googleEvents) {
      const startRaw = event.start.dateTime ?? event.start.date ?? "";
      const endRaw = event.end.dateTime ?? event.end.date ?? "";
      const startDate = startRaw.slice(0, 10);
      let endDate = endRaw.slice(0, 10);
      if (!event.end.dateTime && endDate > startDate) {
        endDate = subDay(endDate);
      }
      let cursor = startDate;
      while (cursor <= endDate) {
        if (!map[cursor]) map[cursor] = [];
        map[cursor].push({ event, isStart: cursor === startDate, isEnd: cursor === endDate });
        cursor = addDay(cursor);
      }
    }
    return map;
  }, [googleEvents]);

  // Clash detection
  const clashingEvents = useMemo(() => {
    if (!form.date || !form.start || !form.end) return [];
    const dayEntries = eventsByDate[form.date] ?? [];
    const propStart = form.date + "T" + form.start + ":00";
    const propEnd = form.date + "T" + form.end + ":00";
    return dayEntries
      .map(e => e.event)
      .filter(e => {
        if (!e.start.dateTime || !e.end.dateTime) return false;
        return propStart < e.end.dateTime && propEnd > e.start.dateTime;
      });
  }, [form.date, form.start, form.end, eventsByDate]);

  const nextSlot = useMemo(() => {
    return [...slots].sort((a, b) =>
      `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
    )[0] ?? null;
  }, [slots]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(day: number) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setForm(prev => ({ ...prev, date: dateStr }));
  }

  function connectGoogleCalendar() {
    setConnecting(true);
    window.location.href = "/api/google-calendar/connect";
  }

  async function disconnectGoogleCalendar() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/google-calendar/disconnect", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect Google Calendar");
      }
      setConnection({ connected: false, providerAccountEmail: null, calendarId: null, lastSyncedAt: null });
      setSlots([]);
      setGoogleEvents([]);
      toast.success("Google Calendar disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect Google Calendar");
    } finally {
      setDisconnecting(false);
    }
  }

  async function addSlot() {
    if (!connection.connected) { toast.error("Connect Google Calendar first."); return; }
    if (!form.title || !form.date || !form.start || !form.end) {
      toast.error("Fill in the interview title, date, start time, and end time.");
      return;
    }
    setSavingSlot(true);
    try {
      const res = await fetch("/api/google-calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create Google Calendar event");
      }
      const data = (await res.json()) as { id: string; htmlLink?: string };
      setSlots(prev => [{
        id: data.id,
        title: form.title,
        date: form.date,
        start: form.start,
        end: form.end,
        timezone: form.timezone,
        provider: "google",
        htmlLink: data.htmlLink ?? null,
      }, ...prev]);
      setForm({ title: "", date: "", start: "", end: "", timezone: "Asia/Singapore" });
      toast.success("Interview slot synced to Google Calendar");
      void fetchGoogleEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create Google Calendar event");
    } finally {
      setSavingSlot(false);
    }
  }

  async function refreshStatus() {
    const res = await fetch("/api/google-calendar/status");
    if (!res.ok) return;
    const data = (await res.json()) as CalendarStatus;
    setConnection(data);
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []).map(e => e.event) : [];
  const connectedLabel = loadingStatus
    ? "Checking connection..."
    : connection.connected
      ? `Connected · ${connection.providerAccountEmail ?? ""}`
      : "Google Calendar not connected";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Calendar</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Interview scheduling</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Connect Google Calendar, view your schedule, and push interview slots directly from NUSwipe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">

          {/* Connection card */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-indigo-400" />
                Google Calendar sync
              </CardTitle>
              <CardDescription>
                Google Calendar is the only supported provider for now.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${connection.connected ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/15 text-indigo-300"}`}>
                    <Link2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{connectedLabel}</p>
                    <p className="text-xs text-slate-400">
                      {connection.connected
                        ? "Your Google Calendar events are synced below."
                        : "Connect a Google account to view and create interview events."}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={`border-white/10 ${connection.connected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-300"}`}
                >
                  {connection.connected ? "Connected" : "Google only"}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={connectGoogleCalendar} disabled={connecting}>
                  {connecting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {connection.connected ? "Reconnect" : "Connect Google Calendar"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void refreshStatus()} disabled={loadingStatus}>
                  Refresh status
                </Button>
                {connection.connected && (
                  <Button type="button" variant="outline" onClick={disconnectGoogleCalendar} disabled={disconnecting}>
                    <Unplug className="mr-2 h-4 w-4" />
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendar grid */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-400" />
                  {MONTHS[viewMonth]} {viewYear}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {connection.connected && loadingEvents && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500 mr-2" />
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 text-slate-400 hover:text-white">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 text-slate-400 hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!connection.connected && (
                <CardDescription>Connect Google Calendar to see your events.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const dayEntries = eventsByDate[dateStr] ?? [];
                  const hasEvents = dayEntries.length > 0;
                  const isFirstOfWeek = new Date(dateStr + "T00:00:00").getDay() === 0;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`
                        relative flex flex-col items-start rounded-xl px-0.5 pt-1 pb-1.5 min-h-[72px] w-full transition-all
                        ${isSelected ? "bg-indigo-500/25 ring-1 ring-indigo-500/50" : "hover:bg-white/5"}
                        ${isToday && !isSelected ? "ring-1 ring-indigo-500/30" : ""}
                      `}
                    >
                      <span className={`
                        text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 mx-auto
                        ${isToday ? "bg-indigo-500 text-white" : "text-slate-300"}
                      `}>
                        {day}
                      </span>
                      {hasEvents && connection.connected && (
                        <div className="flex flex-col gap-[3px] w-full">
                          {dayEntries.slice(0, 2).map(({ event: e, isStart, isEnd }, idx) => {
                            const colorClass = getEventBarColor(e.colorId);
                            const roundedL = isStart || isFirstOfWeek ? "rounded-l-[3px]" : "rounded-l-none -ml-0.5 pl-0";
                            const roundedR = isEnd ? "rounded-r-[3px]" : "rounded-r-none -mr-0.5 pr-0";
                            return (
                              <span
                                key={e.id + idx}
                                title={e.summary}
                                className={`h-[14px] text-[9px] font-medium leading-[14px] truncate ${colorClass} ${roundedL} ${roundedR} ${isStart || isFirstOfWeek ? "px-1" : "px-0"}`}
                              >
                                {(isStart || isFirstOfWeek) ? e.summary : "\u00A0"}
                              </span>
                            );
                          })}
                          {dayEntries.length > 2 && (
                            <span className="text-[9px] text-slate-500 px-1 leading-tight">
                              +{dayEntries.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected day events */}
              {selectedDate && (
                <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-SG", {
                      weekday: "long", month: "long", day: "numeric"
                    })}
                  </p>
                  {!connection.connected ? (
                    <p className="text-sm text-slate-500">Connect Google Calendar to see events.</p>
                  ) : selectedEvents.length === 0 ? (
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3">
                      <p className="text-sm text-slate-500">No events — click "Schedule interview" to add one.</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                        onClick={() => setForm(prev => ({ ...prev, date: selectedDate }))}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  ) : (
                    selectedEvents.map(event => (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${getEventColor(event.colorId)}`}
                      >
                        <div>
                          <p className="text-sm font-medium">{event.summary}</p>
                          {event.start.dateTime && (
                            <p className="text-xs opacity-70 mt-0.5">
                              {parseEventTime(event.start.dateTime)} – {parseEventTime(event.end.dateTime)}
                            </p>
                          )}
                        </div>
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule interview slot */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-emerald-400" />
                Schedule interview
              </CardTitle>
              <CardDescription>
                Add an interview window and push it straight to Google Calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title */}
                <Field label="Interview title">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Hiring manager interview"
                    disabled={!connection.connected}
                  />
                </Field>

                {/* Timezone */}
                <Field label="Timezone">
                  <Input
                    value={form.timezone}
                    onChange={(e) => setForm(prev => ({ ...prev, timezone: e.target.value }))}
                    placeholder="Asia/Singapore"
                    disabled={!connection.connected}
                  />
                </Field>

                {/* Date picker dropdown */}
                <Field label="Date">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!connection.connected}
                      onClick={() => {
                        setShowDatePicker(p => !p);
                        setShowStartPicker(false);
                        setShowEndPicker(false);
                        setPickerMonth(viewMonth);
                        setPickerYear(viewYear);
                      }}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                      <span className={form.date ? "text-white" : "text-slate-400"}>{formatDateLabel(form.date)}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showDatePicker && (
                      <div className="absolute z-[100] mt-1 w-72 rounded-xl border border-white/10 bg-slate-900 shadow-2xl p-3">
                        {/* Mini calendar header */}
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y => y - 1); } else setPickerMonth(m => m - 1); }}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="text-sm font-medium text-white">{MONTHS[pickerMonth]} {pickerYear}</span>
                          <button
                            type="button"
                            onClick={() => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(y => y + 1); } else setPickerMonth(m => m + 1); }}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-1">
                          {DAYS.map(d => <div key={d} className="text-center text-[10px] text-slate-500 py-0.5">{d}</div>)}
                        </div>
                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-0.5">
                          {(() => {
                            const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
                            const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
                            const cells: (number | null)[] = [];
                            for (let i = 0; i < firstDay; i++) cells.push(null);
                            for (let i = 1; i <= daysInMonth; i++) cells.push(i);
                            return cells.map((d, i) => {
                              if (!d) return <div key={`ep-${i}`} />;
                              const ds = `${pickerYear}-${String(pickerMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                              const isSel = ds === form.date;
                              const isT = ds === todayStr;
                              const isPast = ds < todayStr;
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() => { setForm(prev => ({ ...prev, date: ds })); setShowDatePicker(false); }}
                                  className={`rounded-lg text-xs py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                                    ${isSel ? "bg-indigo-500 text-white font-semibold" : isT ? "ring-1 ring-indigo-500/50 text-indigo-300 hover:bg-white/10" : "text-slate-300 hover:bg-white/10"}`}
                                >
                                  {d}
                                </button>
                              );
                            });
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(false)}
                          className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300 text-center py-1"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </Field>

                {/* Start time — 24hr hour + minute columns */}
                <Field label="Start time">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!connection.connected}
                      onClick={() => { setShowStartPicker(p => !p); setShowEndPicker(false); setShowDatePicker(false); }}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                      <span className={form.start ? "text-white" : "text-slate-400"}>{form.start || "HH : MM"}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showStartPicker && (
                      <div className="absolute z-[100] mt-1 left-0 rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                        <div className="flex">
                          {/* Hour column */}
                          <div className="flex flex-col border-r border-white/10">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">HH</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {hours24.map(h => (
                                <button key={h} type="button"
                                  onClick={() => {
                                    const m = parseTimeParts(form.start).m || "00";
                                    const val = `${h}:${m}`;
                                    setForm(prev => ({ ...prev, start: val, end: "" }));
                                  }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors
                                    ${parseTimeParts(form.start).h === h ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
                                >{h}</button>
                              ))}
                            </div>
                          </div>
                          {/* Minute column */}
                          <div className="flex flex-col">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">MM</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {minutes.map(m => (
                                <button key={m} type="button"
                                  onClick={() => {
                                    const h = parseTimeParts(form.start).h || "09";
                                    const val = `${h}:${m}`;
                                    setForm(prev => ({ ...prev, start: val, end: "" }));
                                    setShowStartPicker(false);
                                  }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors
                                    ${parseTimeParts(form.start).m === m ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
                                >{m}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Field>

                {/* End time — 24hr hour + minute columns */}
                <Field label="End time">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!connection.connected}
                      onClick={() => { setShowEndPicker(p => !p); setShowStartPicker(false); setShowDatePicker(false); }}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                      <span className={form.end ? "text-white" : "text-slate-400"}>{form.end || "HH : MM"}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showEndPicker && (
                      <div className="absolute z-[100] mt-1 left-0 rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                        <div className="flex">
                          {/* Hour column — only hours >= start hour */}
                          <div className="flex flex-col border-r border-white/10">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">HH</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {hours24.filter(h => !form.start || h >= parseTimeParts(form.start).h).map(h => (
                                <button key={h} type="button"
                                  onClick={() => {
                                    const m = parseTimeParts(form.end).m || "00";
                                    setForm(prev => ({ ...prev, end: `${h}:${m}` }));
                                  }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors
                                    ${parseTimeParts(form.end).h === h ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
                                >{h}</button>
                              ))}
                            </div>
                          </div>
                          {/* Minute column */}
                          <div className="flex flex-col">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">MM</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {minutes.filter(m => {
                                if (!form.start || !form.end) return true;
                                const { h: sh, m: sm } = parseTimeParts(form.start);
                                const { h: eh } = parseTimeParts(form.end);
                                // if same hour as start, only allow minutes > start minute
                                return eh !== sh || m > (sm || "00");
                              }).map(m => (
                                <button key={m} type="button"
                                  onClick={() => {
                                    const h = parseTimeParts(form.end).h || "10";
                                    setForm(prev => ({ ...prev, end: `${h}:${m}` }));
                                    setShowEndPicker(false);
                                  }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors
                                    ${parseTimeParts(form.end).m === m ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
                                >{m}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Field>
              </div>

              {/* Clash warning */}
              {clashingEvents.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Time clash detected</p>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      This slot overlaps with {clashingEvents.length === 1 ? "an existing event" : `${clashingEvents.length} existing events`}:
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {clashingEvents.map(e => (
                        <li key={e.id} className="text-xs text-amber-300 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                          {e.summary}
                          {e.start.dateTime && (
                            <span className="text-amber-400/60">· {parseEventTime(e.start.dateTime)}–{parseEventTime(e.end.dateTime)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <Button type="button" onClick={addSlot} disabled={!connection.connected || savingSlot}>
                {savingSlot ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {connection.connected ? "Sync to Google Calendar" : "Connect Google Calendar first"}
              </Button>

              {slots.length > 0 && (
                <div className="space-y-3 pt-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{slot.title}</p>
                        <p className="text-xs text-slate-400">{formatSlot(slot)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="border-white/10 bg-white/5 text-slate-300">
                          Google Calendar
                        </Badge>
                        {slot.htmlLink && (
                          <a
                            href={slot.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline"
                          >
                            Open event
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Next interview */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-sky-400" />
                Next interview
              </CardTitle>
              <CardDescription>Your next scheduled interview slot.</CardDescription>
            </CardHeader>
            <CardContent>
              {nextSlot ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-medium text-white">{nextSlot.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatSlot(nextSlot)}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                  No interview slots yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming from Google Calendar */}
          {connection.connected && (
            <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-400" />
                  Upcoming this month
                </CardTitle>
                <CardDescription>Events pulled from your Google Calendar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingEvents ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Loading events...
                  </div>
                ) : googleEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                    No events this month.
                  </div>
                ) : (
                  googleEvents.slice(0, 6).map(event => (
                    <div
                      key={event.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${getEventColor(event.colorId)}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{event.summary}</p>
                        <p className="text-xs opacity-70">
                          {parseEventDate(event).slice(5).replace("-", "/")}
                          {event.start.dateTime ? ` · ${parseEventTime(event.start.dateTime)}` : ""}
                        </p>
                      </div>
                      {event.htmlLink && (
                        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="ml-2 opacity-60 hover:opacity-100 shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Future providers */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Future calendar support
              </CardTitle>
              <CardDescription>More providers coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FUTURE_PROVIDERS.map((provider) => (
                <div
                  key={provider.name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{provider.name}</p>
                    <p className="text-xs text-slate-400">Provider slot reserved</p>
                  </div>
                  <Badge variant="secondary" className="border-white/10 bg-white/5 text-slate-400">
                    {provider.note}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</Label>
      {children}
    </div>
  );
}