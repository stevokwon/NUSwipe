// components/calendar/components/ConnectionCard.tsx

import { RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CalendarStatus, Provider } from "../types";

// ─── Connection card ──────────────────────────────────────────────────────────

type ConnectionCardProps = {
  label: string;
  icon: React.ReactNode;
  status: CalendarStatus;
  loading: boolean;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  emailless?: boolean;
};

export function ConnectionCard({
  label, icon, status, loading, connecting, disconnecting,
  onConnect, onDisconnect, emailless,
}: ConnectionCardProps) {
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

// ─── Provider badge ───────────────────────────────────────────────────────────

export function ProviderBadge({ provider }: { provider: Provider }) {
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

// ─── Provider icons ───────────────────────────────────────────────────────────

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022"/>
      <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00"/>
      <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF"/>
      <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900"/>
    </svg>
  );
}