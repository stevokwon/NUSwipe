// components/calendar/components/ScheduleForm.tsx

"use client";

import { useRef, useEffect } from "react";
import { RefreshCw, Plus, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DAYS, MONTHS, formatDateLabel, parseTimeParts, parseEventTime, buildEventsByDate, formatSlot } from "../utils";
import { ProviderBadge } from "./ConnectionCard";
import type { Provider, InterviewSlot, CalendarEvent } from "../types";

type FormState = { title: string; date: string; start: string; end: string };

type ScheduleFormProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  slots: InterviewSlot[];
  events: CalendarEvent[];
  anyConnected: boolean;
  googleConnected: boolean;
  msConnected: boolean;
  createProvider: Provider | null;
  setCreateProvider: (p: Provider) => void;
  savingSlot: boolean;
  todayStr: string;
  viewMonth: number;
  viewYear: number;
  // Picker visibility — lifted so CalendarGrid day-click can pre-fill date
  showDatePicker: boolean;
  setShowDatePicker: React.Dispatch<React.SetStateAction<boolean>>;
  showStartPicker: boolean;
  setShowStartPicker: React.Dispatch<React.SetStateAction<boolean>>;
  showEndPicker: boolean;
  setShowEndPicker: React.Dispatch<React.SetStateAction<boolean>>;
  pickerMonth: number;
  setPickerMonth: React.Dispatch<React.SetStateAction<number>>;
  pickerYear: number;
  setPickerYear: React.Dispatch<React.SetStateAction<number>>;
  onAddSlot: () => void;
};

const hours24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function ScheduleForm({
  form, setForm, slots, events, anyConnected, googleConnected, msConnected,
  createProvider, setCreateProvider, savingSlot, todayStr, viewMonth, viewYear,
  showDatePicker, setShowDatePicker, showStartPicker, setShowStartPicker,
  showEndPicker, setShowEndPicker, pickerMonth, setPickerMonth,
  pickerYear, setPickerYear, onAddSlot,
}: ScheduleFormProps) {
  // Click-outside refs
  const datePickerRef  = useRef<HTMLDivElement>(null);
  const startPickerRef = useRef<HTMLDivElement>(null);
  const endPickerRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
      if (startPickerRef.current && !startPickerRef.current.contains(e.target as Node))
        setShowStartPicker(false);
      if (endPickerRef.current && !endPickerRef.current.contains(e.target as Node))
        setShowEndPicker(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowDatePicker, setShowStartPicker, setShowEndPicker]);

  // Clash detection
  const eventsByDate = buildEventsByDate(events);
  const clashingEvents = (() => {
    if (!form.date || !form.start || !form.end) return [];
    const dayEntries = eventsByDate[form.date] ?? [];
    const propStart = `${form.date}T${form.start}:00`;
    const propEnd   = `${form.date}T${form.end}:00`;
    return dayEntries
      .map(e => e.event)
      .filter(e => {
        if (!e.start.dateTime || !e.end.dateTime) return false;
        const eStart = e.start.dateTime.replace("Z", "");
        const eEnd   = e.end.dateTime.replace("Z", "");
        return propStart < eEnd && propEnd > eStart;
      });
  })();

  return (
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

        {/* Provider selector — only when both connected */}
        {googleConnected && msConnected && (
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
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                disabled={!anyConnected}
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
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => <div key={d} className="text-center text-[10px] text-slate-500 py-0.5">{d}</div>)}
                  </div>
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
                            key={d} type="button" disabled={isPast}
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
                </div>
              )}
            </div>
          </Field>

          {/* Start time */}
          <Field label="Start time">
            <div className="relative" ref={startPickerRef}>
              <button
                type="button"
                disabled={!anyConnected}
                onClick={() => { setShowStartPicker(p => !p); setShowEndPicker(false); setShowDatePicker(false); }}
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
                            onClick={() => {
                              const m = parseTimeParts(form.start).m || "00";
                              setForm(prev => ({ ...prev, start: `${h}:${m}`, end: "" }));
                            }}
                            className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.start).h === h ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
                          >{h}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">MM</div>
                      <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                        {minutes.map(m => (
                          <button key={m} type="button"
                            onClick={() => {
                              const h = parseTimeParts(form.start).h || "09";
                              setForm(prev => ({ ...prev, start: `${h}:${m}`, end: "" }));
                              setShowStartPicker(false);
                            }}
                            className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.start).m === m ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
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
            <div className="relative" ref={endPickerRef}>
              <button
                type="button"
                disabled={!anyConnected}
                onClick={() => { setShowEndPicker(p => !p); setShowStartPicker(false); setShowDatePicker(false); }}
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
                        {hours24
                          .filter(h => !form.start || h >= parseTimeParts(form.start).h)
                          .map(h => (
                            <button key={h} type="button"
                              onClick={() => {
                                const m = parseTimeParts(form.end).m || "00";
                                setForm(prev => ({ ...prev, end: `${h}:${m}` }));
                              }}
                              className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.end).h === h ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
                            >{h}</button>
                          ))}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="text-[10px] text-slate-500 text-center px-3 py-1.5 border-b border-white/10 font-medium">MM</div>
                      <div className="h-44 overflow-y-auto py-1 w-16 picker-scroll">
                        {minutes
                          .filter(m => {
                            if (!form.start || !form.end) return true;
                            const { h: sh, m: sm } = parseTimeParts(form.start);
                            const { h: eh } = parseTimeParts(form.end);
                            return eh !== sh || m > (sm || "00");
                          })
                          .map(m => (
                            <button key={m} type="button"
                              onClick={() => {
                                const h = parseTimeParts(form.end).h || "10";
                                setForm(prev => ({ ...prev, end: `${h}:${m}` }));
                                setShowEndPicker(false);
                              }}
                              className={`w-full text-center py-1.5 text-sm transition-colors ${parseTimeParts(form.end).m === m ? "bg-indigo-500/20 text-indigo-300 font-medium" : "text-slate-300 hover:bg-white/10"}`}
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

        <Button type="button" onClick={onAddSlot} disabled={!anyConnected || savingSlot}>
          {savingSlot ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {anyConnected
            ? `Sync to ${createProvider === "microsoft" ? "Microsoft" : "Google"} Calendar`
            : "Connect a calendar first"}
        </Button>

        {/* Saved slots list */}
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
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</Label>
      {children}
    </div>
  );
}