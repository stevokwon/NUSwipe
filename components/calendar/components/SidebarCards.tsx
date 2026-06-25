// components/calendar/components/SidebarCards.tsx

import { RefreshCw, ExternalLink, Video, Sparkles } from "lucide-react";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderBadge } from "./ConnectionCard";
import { formatSlot, parseEventDate, parseEventTime, getEventColor } from "../utils";
import type { CalendarEvent, InterviewSlot } from "../types";

// ─── Next interview ───────────────────────────────────────────────────────────

export function NextInterviewCard({ nextSlot }: { nextSlot: InterviewSlot | null }) {
  return (
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
  );
}

// ─── Upcoming events ──────────────────────────────────────────────────────────

export function UpcomingEventsCard({
  events,
  loading,
}: {
  events: CalendarEvent[];
  loading: boolean;
}) {
  return (
    <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-400" />
          Upcoming this month
        </CardTitle>
        <CardDescription>Events from your connected calendars.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
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
            <div
              key={event.id}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${getEventColor(event.colorId)}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{event.summary}</p>
                  {event._provider === "microsoft" && (
                    <span className="text-[9px] shrink-0 opacity-50 font-medium">MS</span>
                  )}
                </div>
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
  );
}

// ─── Future providers ─────────────────────────────────────────────────────────

const FUTURE_PROVIDERS = [
  { name: "Apple Calendar", note: "Planned" },
  { name: "ICS / file-based calendars", note: "Planned" },
];

export function FutureProvidersCard() {
  return (
    <Card className="border-white/10 bg-slate-900/40 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          Future calendar support
        </CardTitle>
        <CardDescription>More providers coming soon.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {FUTURE_PROVIDERS.map(p => (
          <div key={p.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{p.name}</p>
              <p className="text-xs text-slate-400">Provider slot reserved</p>
            </div>
            <Badge variant="secondary" className="border-white/10 bg-white/5 text-slate-400">
              {p.note}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}