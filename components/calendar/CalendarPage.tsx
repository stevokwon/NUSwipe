"use client";

// components/calendar/CalendarPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useCalendarEvents } from "./hooks/useCalendarEvents";
import { ConnectionCard, GoogleIcon, MicrosoftIcon } from "./components/ConnectionCard";
import { CalendarGrid } from "./components/CalendarGrid";
import { ScheduleForm } from "./components/ScheduleForm";
import { NextInterviewCard, UpcomingEventsCard, FutureProvidersCard } from "./components/SidebarCards";

import type { CalendarStatus, InterviewSlot, Provider } from "./types";

type Props = { role: "employer" | "candidate" };

export default function CalendarPage({ role }: Props) {
  const searchParams = useSearchParams();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // ── Provider connection state ──────────────────────────────────────────────
  const [googleStatus, setGoogleStatus] = useState<CalendarStatus>({
    connected: false, providerAccountEmail: null, calendarId: null, lastSyncedAt: null,
  });
  const [msStatus, setMsStatus] = useState<CalendarStatus>({
    connected: false, lastSyncedAt: null,
  });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connectingGoogle, setConnectingGoogle]     = useState(false);
  const [connectingMs, setConnectingMs]             = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);
  const [disconnectingMs, setDisconnectingMs]         = useState(false);

  const anyConnected = googleStatus.connected || msStatus.connected;

  // ── Calendar view ──────────────────────────────────────────────────────────
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Slot / form state ──────────────────────────────────────────────────────
  const [slots, setSlots]               = useState<InterviewSlot[]>([]);
  const [savingSlot, setSavingSlot]     = useState(false);
  const [createProvider, setCreateProvider] = useState<Provider | null>(null);
  const [form, setForm] = useState({ title: "", date: "", start: "", end: "" });

  // ── Picker visibility (lifted so CalendarGrid can pre-fill date) ───────────
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const [pickerYear, setPickerYear]   = useState(today.getFullYear());

  // ── Events from hook ───────────────────────────────────────────────────────
  const { events, loading: loadingEvents, refetch } = useCalendarEvents({
    googleConnected: googleStatus.connected,
    msConnected: msStatus.connected,
    viewYear,
    viewMonth,
  });

  // ── Next slot ──────────────────────────────────────────────────────────────
  const nextSlot = useMemo(() => (
    [...slots].sort((a, b) =>
      `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
    )[0] ?? null
  ), [slots]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "1") toast.success("Calendar connected successfully");
    if (error) toast.error(error);
  }, [searchParams]);

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

  // Auto-select provider when only one is connected
  useEffect(() => {
    if (createProvider) return;
    if (googleStatus.connected) setCreateProvider("google");
    else if (msStatus.connected) setCreateProvider("microsoft");
  }, [googleStatus.connected, msStatus.connected, createProvider]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }
  function handleDayClick(day: number) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(ds);
    setForm(prev => ({ ...prev, date: ds }));
  }

  async function disconnectCalendar(provider: Provider) {
    if (provider === "google") setDisconnectingGoogle(true);
    else setDisconnectingMs(true);
    try {
      const res = await fetch(
        provider === "google" ? "/api/google-calendar/disconnect" : "/api/ms-calendar/disconnect",
        { method: "DELETE" }
      );
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
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSavingSlot(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const heading = role === "employer" ? "Interview scheduling" : "My interviews";
  const subheading = role === "employer"
    ? "Connect Google or Microsoft Calendar, view your schedule, and push interview slots directly from NUSwipe."
    : "Connect your calendar to view and manage your scheduled interviews.";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Calendar</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{heading}</h1>
        <p className="max-w-2xl text-sm text-slate-400">{subheading}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">

          {/* Connection cards */}
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

          {/* Calendar grid */}
          <CalendarGrid
            viewYear={viewYear}
            viewMonth={viewMonth}
            todayStr={todayStr}
            selectedDate={selectedDate}
            events={events}
            loadingEvents={loadingEvents}
            anyConnected={anyConnected}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onDayClick={handleDayClick}
            onScheduleClick={date => setForm(prev => ({ ...prev, date }))}
          />

          {/* Schedule form */}
          <ScheduleForm
            form={form}
            setForm={setForm}
            slots={slots}
            events={events}
            anyConnected={anyConnected}
            googleConnected={googleStatus.connected}
            msConnected={msStatus.connected}
            createProvider={createProvider}
            setCreateProvider={setCreateProvider}
            savingSlot={savingSlot}
            todayStr={todayStr}
            viewMonth={viewMonth}
            viewYear={viewYear}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            showStartPicker={showStartPicker}
            setShowStartPicker={setShowStartPicker}
            showEndPicker={showEndPicker}
            setShowEndPicker={setShowEndPicker}
            pickerMonth={pickerMonth}
            setPickerMonth={setPickerMonth}
            pickerYear={pickerYear}
            setPickerYear={setPickerYear}
            onAddSlot={addSlot}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <NextInterviewCard nextSlot={nextSlot} />
          {anyConnected && (
            <UpcomingEventsCard events={events} loading={loadingEvents} />
          )}
          <FutureProvidersCard />
        </div>
      </div>
    </div>
  );
}