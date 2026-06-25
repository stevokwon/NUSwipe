// components/calendar/components/CalendarGrid.tsx

import { useMemo, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays } from "lucide-react";
import { DAYS, MONTHS, getEventBarColor, getEventColor, parseEventTime, buildEventsByDate } from "../utils";
import type { CalendarEvent } from "../types";

// ─── Edit modal (inline, no extra dependency) ─────────────────────────────────

type EditModalProps = {
  event: CalendarEvent;
  onSave: (id: string, summary: string) => Promise<void>;
  onClose: () => void;
};

function EditModal({ event, onSave, onClose }: EditModalProps) {
  const [title, setTitle] = useState(event.summary);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(event.id, title.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Edit event</h2>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Title</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleSave(); if (e.key === "Escape") onClose(); }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarGridProps = {
  viewYear: number;
  viewMonth: number;
  todayStr: string;
  selectedDate: string | null;
  events: CalendarEvent[];
  loadingEvents: boolean;
  anyConnected: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: number) => void;
  onScheduleClick: (date: string) => void;
  onEditEvent: (id: string, provider: CalendarEvent["_provider"], newTitle: string) => Promise<void>;
  onDeleteEvent: (id: string, provider: CalendarEvent["_provider"]) => Promise<void>;
};

// ─── Main component ───────────────────────────────────────────────────────────

export function CalendarGrid({
  viewYear, viewMonth, todayStr, selectedDate, events,
  loadingEvents, anyConnected, onPrevMonth, onNextMonth,
  onDayClick, onScheduleClick, onEditEvent, onDeleteEvent,
}: CalendarGridProps) {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [viewYear, viewMonth]);

  const eventsByDate = useMemo(() => buildEventsByDate(events), [events]);

  const selectedEvents = selectedDate
    ? (eventsByDate[selectedDate] ?? []).map(e => e.event)
    : [];

  async function handleDelete(event: CalendarEvent) {
    setDeletingId(event.id);
    await onDeleteEvent(event.id, event._provider);
    setDeletingId(null);
  }

  return (
    <>
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
              <Button type="button" variant="ghost" size="icon" onClick={onPrevMonth} className="h-8 w-8 text-slate-400 hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={onNextMonth} className="h-8 w-8 text-slate-400 hover:text-white">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!anyConnected && (
            <CardDescription>Connect a calendar above to see your events.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayEntries = eventsByDate[dateStr] ?? [];
              const isFirstOfWeek = new Date(dateStr + "T00:00:00").getDay() === 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onDayClick(day)}
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
                  {dayEntries.length > 0 && anyConnected && (
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

          {/* Selected day detail */}
          {selectedDate && (
            <div className="mt-4 border-t border-white/10 pt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-SG", {
                  weekday: "long", month: "long", day: "numeric",
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
                    onClick={() => onScheduleClick(selectedDate)}
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
                    {/* Event info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{event.summary}</p>
                        {event._provider && (
                          <span className="text-[10px] opacity-50 shrink-0">
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

                    {/* 3-dot menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100 ml-2"
                          />
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => setEditingEvent(event)}
                          className="gap-2 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDelete(event)}
                          className="gap-2 cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      {editingEvent && (
        <EditModal
          event={editingEvent}
          onSave={(id, newTitle) => onEditEvent(id, editingEvent._provider, newTitle)}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </>
  );
}