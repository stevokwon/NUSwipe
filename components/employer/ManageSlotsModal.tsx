"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Calendar } from "lucide-react";

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ManageSlotsModal({ open, onClose }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchSlots();
  }, [open]);

  async function fetchSlots() {
    setLoading(true);
    const res = await fetch("/api/interview-slots");
    const data = await res.json();
    setSlots(data.slots ?? []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!date || !startTime || !endTime) {
      toast.error("Please fill in all fields");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/interview-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_time: `${date}T${startTime}:00+08:00`,
        end_time: `${date}T${endTime}:00+08:00`,
      }),
    });
    if (res.ok) {
      toast.success("Slot added");
      setDate(""); setStartTime(""); setEndTime("");
      fetchSlots();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Failed to add slot");
    }
    setSaving(false);
  }

  async function handleDelete(slotId: string) {
    setDeleting(slotId);
    const res = await fetch(`/api/interview-slots?slotId=${slotId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Slot removed");
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } else {
      toast.error("Failed to remove slot");
    }
    setDeleting(null);
  }

  function formatSlot(slot: Slot) {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return {
      date: start.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      time: `${start.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`,
    };
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            Manage Availability Slots
          </DialogTitle>
        </DialogHeader>

        {/* Add slot form */}
        <div className="space-y-3 border border-white/10 rounded-xl p-4 bg-slate-800/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Add New Slot</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 space-y-1">
              <label className="text-xs text-slate-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">End</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAdd}
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Slots list */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No slots defined yet.</p>
          ) : (
            slots.map(slot => {
              const { date, time } = formatSlot(slot);
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{date}</p>
                    <p className="text-xs text-slate-400">{time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {slot.is_booked && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                        Booked
                      </span>
                    )}
                    {!slot.is_booked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(slot.id)}
                        disabled={deleting === slot.id}
                        className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        {deleting === slot.id
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}