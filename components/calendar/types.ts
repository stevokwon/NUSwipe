// components/calendar/types.ts

export type Provider = "google" | "microsoft";

export type InterviewSlot = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  provider: Provider;
  htmlLink?: string | null;
};

export type CalendarStatus = {
  connected: boolean;
  providerAccountEmail?: string | null;
  calendarId?: string | null;
  lastSyncedAt: string | null;
};

export type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string | null;
  colorId?: string;
  _provider?: Provider;
};