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

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = "google" | "microsoft";

type InterviewSlot = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  provider: Provider;
  htmlLink?: string | null;
};

type CalendarStatus = {
  connected: boolean;
  providerAccountEmail?: string | null;
  calendarId?: string | null;
  lastSyncedAt: string | null;
};

// Shared normalised event shape (Google native + MS normalised in the route)
type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string | null;
  colorId?: string;
  _provider?: Provider;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSlot(slot: InterviewSlot) {
  return `${slot.date} · ${slot.start}–${slot.end}`;
}

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

function parseEventDate(event: CalendarEvent): string {
  if (event.start.date) return event.start.date;
  if (event.start.dateTime) {
    const d = new Date(event.start.dateTime);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  return "";
}

function parseEventTime(dateTime?: string): string {
  if (!dateTime) return "";
  const d = new Date(dateTime);
  return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true });
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

// ─── Provider badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: Provider }) {
  return (
    <Badge
      variant="secondary"
      className={`border-white/10 text-xs ${
        provider === "microsoft"
          ? "bg-blue-500/10 text-blue-300"
          : "bg-white/5 text-slate-300"
      }`}
    >
      {provider === "microsoft" ? "Microsoft Calendar" : "Google Calendar"}
    </Badge>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage({ role }: { role: "employer" | "candidate" }) {
  const searchParams = useSearchParams();

  // Per-provider state
  const [googleStatus, setGoogleStatus] = useState<CalendarStatus>({
    connected: false, providerAccountEmail: null, calendarId: null, lastSyncedAt: null,
  });
  const [msStatus, setMsStatus] = useState<CalendarStatus>({
    connected: false, lastSyncedAt: null,
  });

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [connectingMs, setConnectingMs] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [disconnectingMs, setDisconnectingMs] = useState(false);

  const [savingSlot, setSavingSlot] = useState(false);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);

  // Unified event list (from whichever calendars are connected)
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Calendar view
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Form state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", date: "", start: "", end: "" });
  // Which provider to create the event in
  const [createProvider, setCreateProvider] = useState<Provider | null>(null);

  // Dropdown pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const hours24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const anyConnected = googleStatus.connected || msStatus.connected;

  // Auto-select provider for new events
  useEffect(() => {
    if (createProvider) return; // user already chose
    if (googleStatus.connected) setCreateProvider("google");
    else if (msStatus.connected) setCreateProvider("microsoft");
  }, [googleStatus.connected, msStatus.connected, createProvider]);

  // ── Toast on OAuth redirect ──────────────────────────────────────────────
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "1") toast.success("Calendar connected successfully");
    if (error) toast.error(error);
  }, [searchParams]);

  // ── Load statuses ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadStatuses() {
      try {
        const [gRes, mRes] = await Promise.all([
          fetch("/api/google-calendar/status"),
          fetch("/api/ms-calendar/status"),
        ]);
        if (gRes.ok) setGoogleStatus(await gRes.json());
        if (mRes.ok) setMsStatus(await mRes.json());
      } finally {
        setLoadingStatus(false);
      }
    }
    void loadStatuses();
  }, []);

  // ── Fetch events from all connected providers ────────────────────────────
  const fetchAllEvents = useCallback(async () => {
    if (!googleStatus.connected && !msStatus.connected) return;
    setLoadingEvents(true);
    try {
      const monthStart = new Date(viewYear, viewMonth, 1);
      const todayNow = new Date(); todayNow.setHours(0,0,0,0);
      const timeMin = (viewYear === todayNow.getFullYear() && viewMonth === todayNow.getMonth())
        ? todayNow.toISOString()
        : monthStart.toISOString();
      const timeMax = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();
      const qs = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

      const fetches: Promise<CalendarEvent[]>[] = [];

      if (googleStatus.connected) {
        fetches.push(
          fetch(`/api/google-calendar/events?${qs}`)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => (d.items ?? []).map((e: CalendarEvent) => ({ ...e, _provider: "google" as Provider })))
        );
      }
      if (msStatus.connected) {
        fetches.push(
          fetch(`/api/ms-calendar/events?${qs}`)
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => (d.items ?? []).map((e: CalendarEvent) => ({ ...e, _provider: "microsoft" as Provider })))
        );
      }

      const results = await Promise.all(fetches);
      const merged = results
        .flat()
        .sort((a, b) => (a.start.dateTime ?? "").localeCompare(b.start.dateTime ?? ""));
      setEvents(merged);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }, [googleStatus.connected, msStatus.connected, viewYear, viewMonth]);

  useEffect(() => { void fetchAllEvents(); }, [fetchAllEvents]);

  // ── Calendar grid helpers ────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, { event: CalendarEvent; isStart: boolean; isEnd: boolean }[]> = {};
    function addDay(ds: string) {
      const [y,m,d] = ds.split("-").map(Number);
      return new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10);
    }
    function subDay(ds: string) {
      const [y,m,d] = ds.split("-").map(Number);
      return new Date(Date.UTC(y,m-1,d-1)).toISOString().slice(0,10);
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
  }, [events]);

  // Clash detection
  const clashingEvents = useMemo(() => {
    if (!form.date || !form.start || !form.end) return [];
    const dayEntries = eventsByDate[form.date] ?? [];
    const propStart = `${form.date}T${form.start}:00`;
    const propEnd   = `${form.date}T${form.end}:00`;
    return dayEntries
      .map(e => e.event)
      .filter(e => {
        if (!e.start.dateTime || !e.end.dateTime) return false;
        const eStart = e.start.dateTime.replace("Z","");
        const eEnd   = e.end.dateTime.replace("Z","");
        return propStart < eEnd && propEnd > eStart;
      });
  }, [form.date, form.start, form.end, eventsByDate]);

  const nextSlot = useMemo(() => (
    [...slots].sort((a,b) =>
      `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
    )[0] ?? null
  ), [slots]);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []).map(e => e.event) : [];

  // ── Actions ──────────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function handleDayClick(day: number) {
    const ds = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    setSelectedDate(ds);
    setForm(prev => ({ ...prev, date: ds }));
  }

  async function disconnectCalendar(provider: Provider) {
    if (provider === "google") setDisconnectingGoogle(true);
    else setDisconnectingMs(true);
    try {
      const route = provider === "google" ? "/api/google-calendar/disconnect" : "/api/ms-calendar/disconnect";
      const res = await fetch(route, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Disconnect failed");
      }
      if (provider === "google") {
        setGoogleStatus({ connected: false, providerAccountEmail: null, calendarId: null, lastSyncedAt: null });
        if (createProvider === "google") setCreateProvider(msStatus.connected ? "microsoft" : null);
      } else {
        setMsStatus({ connected: false, lastSyncedAt: null });
        if (createProvider === "microsoft") setCreateProvider(googleStatus.connected ? "google" : null);
      }
      setEvents(prev => prev.filter(e => e._provider !== provider));
      toast.success(`${provider === "google" ? "Google" : "Microsoft"} Calendar disconnected`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      if (provider === "google") setDisconnectingGoogle(false);
      else setDisconnectingMs(false);
    }
  }

  async function addSlot() {
    if (!anyConnected) { toast.error("Connect a calendar first."); return; }
    if (!form.title || !form.date || !form.start || !form.end) {
      toast.error("Fill in all fields."); return;
    }
    if (!createProvider) { toast.error("Select which calendar to sync to."); return; }
    setSavingSlot(true);
    try {
      const route = createProvider === "google"
        ? "/api/google-calendar/events"
        : "/api/ms-calendar/events";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create event");
      }
      const data = await res.json() as { id: string; htmlLink?: string };
      setSlots(prev => [{
        id: data.id,
        title: form.title,
        date: form.date,
        start: form.start,
        end: form.end,
        provider: createProvider,
        htmlLink: data.htmlLink ?? null,
      }, ...prev]);
      setForm({ title: "", date: "", start: "", end: "" });
      toast.success(`Interview synced to ${createProvider === "google" ? "Google" : "Microsoft"} Calendar`);
      void fetchAllEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSavingSlot(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
        <h1>{role === "employer" ? "Interview scheduling" : "My interviews"}</h1>
        <p>{role === "employer"
            ? "Connect Google or Microsoft Calendar and push interview slots."
            : "Connect your calendar to view and manage your interviews."
        }</p>
      <div className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Calendar</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Interview scheduling</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Connect Google or Microsoft Calendar, view your schedule, and push interview slots directly from NUSwipe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">

          {/* ── Connection cards ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ConnectionCard
              label="Google Calendar"
              icon={<GoogleIcon />}
              status={googleStatus}
              loading={loadingStatus}
              connecting={connectingGoogle}
              disconnecting={disconnectingGoogle}
              onConnect={() => { setConnectingGoogle(true); window.location.href = "/api/google-calendar/connect"; }}
              onDisconnect={() => void disconnectCalendar("google")}
            />
            <ConnectionCard
              label="Microsoft Calendar"
              icon={<MicrosoftIcon />}
              status={msStatus}
              loading={loadingStatus}
              connecting={connectingMs}
              disconnecting={disconnectingMs}
              onConnect={() => { setConnectingMs(true); window.location.href = "/api/ms-calendar/connect"; }}
              onDisconnect={() => void disconnectCalendar("microsoft")}
              emailless
            />
          </div>

          {/* ── Calendar grid ── */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-400" />
                  {MONTHS[viewMonth]} {viewYear}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {anyConnected && loadingEvents && (
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
              {!anyConnected && (
                <CardDescription>Connect a calendar above to see your events.</CardDescription>
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
                  const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
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
                      {hasEvents && anyConnected && (
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
                  {!anyConnected ? (
                    <p className="text-sm text-slate-500">Connect a calendar to see events.</p>
                  ) : selectedEvents.length === 0 ? (
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3">
                      <p className="text-sm text-slate-500">No events — click "Schedule interview" to add one.</p>
                      <Button
                        type="button" size="sm" variant="ghost"
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                        onClick={() => setForm(prev => ({ ...prev, date: selectedDate }))}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />Schedule
                      </Button>
                    </div>
                  ) : (
                    selectedEvents.map(event => (
                      <div
                        key={event.id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${getEventColor(event.colorId)}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{event.summary}</p>
                            {event._provider && (
                              <span className="text-[10px] opacity-50">
                                {event._provider === "microsoft" ? "MS" : "GCal"}
                              </span>
                            )}
                          </div>
                          {event.start.dateTime && (
                            <p className="text-xs opacity-70 mt-0.5">
                              {parseEventTime(event.start.dateTime)} – {parseEventTime(event.end.dateTime)}
                            </p>
                          )}
                        </div>
                        {event.htmlLink && (
                          <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
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

          {/* ── Schedule interview ── */}
          <Card className="border-white/10 bg-slate-900/40 shadow-2xl overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-emerald-400" />
                Schedule interview
              </CardTitle>
              <CardDescription>
                Add an interview window and push it to your calendar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible">

              {/* Provider selector — only shown when both are connected */}
              {googleStatus.connected && msStatus.connected && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Sync to:</span>
                  {(["google", "microsoft"] as Provider[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCreateProvider(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        createProvider === p
                          ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-300"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                      }`}
                    >
                      {p === "google" ? "Google Calendar" : "Microsoft Calendar"}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title */}
                <Field label="Interview title">
                  <Input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Hiring manager interview"
                    disabled={!anyConnected}
                  />
                </Field>

                {/* Date picker */}
                <Field label="Date">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!anyConnected}
                      onClick={() => { setShowDatePicker(p => !p); setShowStartPicker(false); setShowEndPicker(false); setPickerMonth(viewMonth); setPickerYear(viewYear); }}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                      <span className={form.date ? "text-white" : "text-slate-400"}>{formatDateLabel(form.date)}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showDatePicker && (
                      <div className="absolute z-[100] mt-1 w-72 rounded-xl border border-white/10 bg-slate-900 shadow-2xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <button type="button" onClick={() => { if (pickerMonth===0){setPickerMonth(11);setPickerYear(y=>y-1);}else setPickerMonth(m=>m-1); }} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="h-4 w-4"/></button>
                          <span className="text-sm font-medium text-white">{MONTHS[pickerMonth]} {pickerYear}</span>
                          <button type="button" onClick={() => { if (pickerMonth===11){setPickerMonth(0);setPickerYear(y=>y+1);}else setPickerMonth(m=>m+1); }} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronRight className="h-4 w-4"/></button>
                        </div>
                        <div className="grid grid-cols-7 mb-1">
                          {DAYS.map(d=><div key={d} className="text-center text-[10px] text-slate-500 py-0.5">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {(() => {
                            const firstDay = new Date(pickerYear, pickerMonth, 1).getDay();
                            const daysInMonth = new Date(pickerYear, pickerMonth+1, 0).getDate();
                            const cells: (number|null)[] = [];
                            for(let i=0;i<firstDay;i++) cells.push(null);
                            for(let i=1;i<=daysInMonth;i++) cells.push(i);
                            return cells.map((d,i) => {
                              if(!d) return <div key={`ep-${i}`}/>;
                              const ds=`${pickerYear}-${String(pickerMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                              const isSel=ds===form.date, isT=ds===todayStr, isPast=ds<todayStr;
                              return (
                                <button key={d} type="button" disabled={isPast}
                                  onClick={() => { setForm(prev=>({...prev,date:ds})); setShowDatePicker(false); }}
                                  className={`rounded-lg text-xs py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isSel?"bg-indigo-500 text-white font-semibold":isT?"ring-1 ring-indigo-500/50 text-indigo-300 hover:bg-white/10":"text-slate-300 hover:bg-white/10"}`}
                                >{d}</button>
                              );
                            });
                          })()}
                        </div>
                        <button type="button" onClick={() => setShowDatePicker(false)} className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300 text-center py-1">Close</button>
                      </div>
                    )}
                  </div>
                </Field>

                {/* Start time */}
                <Field label="Start time">
                  <div className="relative">
                    <button type="button" disabled={!anyConnected}
                      onClick={() => { setShowStartPicker(p=>!p); setShowEndPicker(false); setShowDatePicker(false); }}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                      <span className={form.start ? "text-white" : "text-slate-400"}>{form.start || "HH : MM"}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showStartPicker && (
                      <div className="absolute z-[100] mt-1 left-0 rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                        <div className="flex">
                          <div className="flex flex-col border-r border-white/10">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">HH</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {hours24.map(h => (
                                <button key={h} type="button"
                                  onClick={() => { const m=parseTimeParts(form.start).m||"00"; setForm(prev=>({...prev,start:`${h}:${m}`,end:""})); }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.start).h===h?"bg-indigo-500/20 text-indigo-300 font-medium":"text-slate-300 hover:bg-white/10"}`}
                                >{h}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">MM</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {minutes.map(m => (
                                <button key={m} type="button"
                                  onClick={() => { const h=parseTimeParts(form.start).h||"09"; setForm(prev=>({...prev,start:`${h}:${m}`,end:""})); setShowStartPicker(false); }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.start).m===m?"bg-indigo-500/20 text-indigo-300 font-medium":"text-slate-300 hover:bg-white/10"}`}
                                >{m}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Field>

                {/* End time */}
                <Field label="End time">
                  <div className="relative">
                    <button type="button" disabled={!anyConnected}
                      onClick={() => { setShowEndPicker(p=>!p); setShowStartPicker(false); setShowDatePicker(false); }}
                      className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                      <span className={form.end ? "text-white" : "text-slate-400"}>{form.end || "HH : MM"}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                    {showEndPicker && (
                      <div className="absolute z-[100] mt-1 left-0 rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                        <div className="flex">
                          <div className="flex flex-col border-r border-white/10">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">HH</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {hours24.filter(h => !form.start || h >= parseTimeParts(form.start).h).map(h => (
                                <button key={h} type="button"
                                  onClick={() => { const m=parseTimeParts(form.end).m||"00"; setForm(prev=>({...prev,end:`${h}:${m}`})); }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.end).h===h?"bg-indigo-500/20 text-indigo-300 font-medium":"text-slate-300 hover:bg-white/10"}`}
                                >{h}</button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">MM</div>
                            <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                              {minutes.filter(m => {
                                if (!form.start || !form.end) return true;
                                const {h:sh,m:sm}=parseTimeParts(form.start);
                                const {h:eh}=parseTimeParts(form.end);
                                return eh!==sh || m>(sm||"00");
                              }).map(m => (
                                <button key={m} type="button"
                                  onClick={() => { const h=parseTimeParts(form.end).h||"10"; setForm(prev=>({...prev,end:`${h}:${m}`})); setShowEndPicker(false); }}
                                  className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.end).m===m?"bg-indigo-500/20 text-indigo-300 font-medium":"text-slate-300 hover:bg-white/10"}`}
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

              <Button type="button" onClick={addSlot} disabled={!anyConnected || savingSlot}>
                {savingSlot ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {anyConnected
                  ? `Sync to ${createProvider === "microsoft" ? "Microsoft" : "Google"} Calendar`
                  : "Connect a calendar first"}
              </Button>

              {slots.length > 0 && (
                <div className="space-y-3 pt-2">
                  {slots.map(slot => (
                    <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{slot.title}</p>
                        <p className="text-xs text-slate-400">{formatSlot(slot)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProviderBadge provider={slot.provider} />
                        {slot.htmlLink && (
                          <a href={slot.htmlLink} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 underline-offset-4 hover:text-white hover:underline">
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

        {/* ── Right column ── */}
        <div className="space-y-6">
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">{nextSlot.title}</p>
                    <ProviderBadge provider={nextSlot.provider} />
                  </div>
                  <p className="text-xs text-slate-400">{formatSlot(nextSlot)}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                  No interview slots yet.
                </div>
              )}
            </CardContent>
          </Card>

          {anyConnected && (
            <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-indigo-400" />
                  Upcoming this month
                </CardTitle>
                <CardDescription>Events from your connected calendars.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loadingEvents ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Loading events...
                  </div>
                ) : events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                    No events this month.
                  </div>
                ) : (
                  events.slice(0, 8).map(event => (
                    <div key={event.id} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${getEventColor(event.colorId)}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{event.summary}</p>
                          {event._provider === "microsoft" && (
                            <span className="text-[9px] shrink-0 opacity-50 font-medium">MS</span>
                          )}
                        </div>
                        <p className="text-xs opacity-70">
                          {parseEventDate(event).slice(5).replace("-","/")}
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

          <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Future calendar support
              </CardTitle>
              <CardDescription>More providers coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Apple Calendar", note: "Planned" },
                { name: "ICS / file-based calendars", note: "Planned" },
              ].map(p => (
                <div key={p.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-slate-400">Provider slot reserved</p>
                  </div>
                  <Badge variant="secondary" className="border-white/10 bg-white/5 text-slate-400">{p.note}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConnectionCard({
  label, icon, status, loading, connecting, disconnecting,
  onConnect, onDisconnect, emailless,
}: {
  label: string;
  icon: React.ReactNode;
  status: CalendarStatus;
  loading: boolean;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  emailless?: boolean;
}) {
  const connectedLabel = loading
    ? "Checking..."
    : status.connected
      ? emailless ? "Connected" : `Connected · ${status.providerAccountEmail ?? ""}`
      : "Not connected";

  return (
    <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${status.connected ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-slate-400 truncate">{connectedLabel}</p>
          </div>
          <Badge
            variant="secondary"
            className={`ml-auto shrink-0 border-white/10 ${status.connected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-400"}`}
          >
            {status.connected ? "Connected" : "—"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onConnect} disabled={connecting} className="text-xs">
            {connecting && <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />}
            {status.connected ? "Reconnect" : "Connect"}
          </Button>
          {status.connected && (
            <Button type="button" size="sm" variant="outline" onClick={onDisconnect} disabled={disconnecting} className="text-xs">
              <Unplug className="mr-1.5 h-3 w-3" />
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
    </svg>
  );
}