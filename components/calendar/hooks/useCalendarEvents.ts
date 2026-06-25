// components/calendar/hooks/useCalendarEvents.ts

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { CalendarEvent, Provider } from "../../types";

type Options = {
  googleConnected: boolean;
  msConnected: boolean;
  viewYear: number;
  viewMonth: number;
};

export function useCalendarEvents({ googleConnected, msConnected, viewYear, viewMonth }: Options) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!googleConnected && !msConnected) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const monthStart = new Date(viewYear, viewMonth, 1);
      const todayNow = new Date();
      todayNow.setHours(0, 0, 0, 0);
      const timeMin =
        viewYear === todayNow.getFullYear() && viewMonth === todayNow.getMonth()
          ? todayNow.toISOString()
          : monthStart.toISOString();
      const timeMax = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();
      const qs = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

      const fetches: Promise<CalendarEvent[]>[] = [];

      if (googleConnected) {
        fetches.push(
          fetch(`/api/google-calendar/events?${qs}`)
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d =>
              (d.items ?? []).map((e: CalendarEvent) => ({ ...e, _provider: "google" as Provider }))
            )
        );
      }
      if (msConnected) {
        fetches.push(
          fetch(`/api/ms-calendar/events?${qs}`)
            .then(r => (r.ok ? r.json() : { items: [] }))
            .then(d =>
              (d.items ?? []).map((e: CalendarEvent) => ({ ...e, _provider: "microsoft" as Provider }))
            )
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
      setLoading(false);
    }
  }, [googleConnected, msConnected, viewYear, viewMonth]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { events, loading, refetch: fetchAll };
}