"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Clock, RefreshCw, Check } from "lucide-react";

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
};

type Invitation = {
  id: string;
  status: string;
  employers: { company_name: string };
  candidates: { first_name: string; last_name: string; email: string };
};

type Props = {
  invitationId: string;
  onClose: () => void;
  onConfirmed: () => void;
};

export function BookInterviewModal({ invitationId, onClose, onConfirmed }: Props) {
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitation();
  }, [invitationId]);

  async function fetchInvitation() {
    setLoading(true);
    const res = await fetch(`/api/interview-invitations?invitationId=${invitationId}`);
    const data = await res.json();
    if (res.ok) {
      setInvitation(data.invitation);
      setSlots(data.slots ?? []);
    } else {
      toast.error(data.error ?? "Failed to load invitation");
      onClose();
    }
    setLoading(false);
  }

  async function handleConfirm() {
    if (!selectedSlotId) {
      toast.error("Please select a time slot");
      return;
    }
    setConfirming(true);
    const res = await fetch("/api/interview-invitations/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitation_id: invitationId, slot_id: selectedSlotId }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Interview booked! Check your calendar.");
      onConfirmed();
    } else {
      toast.error(data.error ?? "Failed to confirm slot");
    }
    setConfirming(false);
  }

  function formatSlot(slot: Slot) {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return {
      date: start.toLocaleDateString("en-SG", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }),
      time: `${start.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}`,
    };
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            Book Interview
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : !invitation ? null : invitation.status === "accepted" ? (
          <div className="text-center py-8 space-y-2">
            <Check className="h-10 w-10 text-emerald-400 mx-auto" />
            <p className="text-white font-semibold">Already booked</p>
            <p className="text-sm text-slate-400">You have already confirmed an interview slot.</p>
            <Button variant="ghost" onClick={onClose} className="text-slate-400 mt-2">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Company info */}
            <div className="rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3">
              <p className="text-xs text-slate-400">Interview with</p>
              <p className="text-base font-semibold text-white">{invitation.employers.company_name}</p>
            </div>

            {/* Slot selection */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select a time slot
              </p>
              {slots.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                  <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No slots available yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Check back later or contact the employer.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {slots.map(slot => {
                    const { date, time } = formatSlot(slot);
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-white/10 bg-slate-800/50 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-white">{date}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{time}</p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-indigo-400 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={!selectedSlotId || confirming}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {confirming
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Confirming...</>
                  : <><Check className="h-4 w-4" /> Confirm Slot</>
                }
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-white border border-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}