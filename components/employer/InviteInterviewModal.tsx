"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Copy, RefreshCw, Check } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  applicationId: string;
  employerCompany: string;
};

export function InviteInterviewModal({
  open, onClose, candidateId, candidateName,
  candidateEmail, applicationId, employerCompany,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) createInvitation();
  }, [open]);

  async function createInvitation() {
    setLoading(true);
    const res = await fetch("/api/interview-invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidateId, application_id: applicationId }),
    });
    const data = await res.json();
    if (res.ok) setInvitationId(data.invitation.id);
    else toast.error(data.error ?? "Failed to create invitation");
    setLoading(false);
  }

  const bookingLink = invitationId
    ? `${process.env.NEXT_PUBLIC_APP_URL}/calendar?invitationId=${invitationId}`
    : "";

  const emailTemplate = `Subject: Interview Invitation – ${employerCompany}

Dear ${candidateName},

Thank you for applying. We are pleased to invite you to interview with ${employerCompany}.

Please select a convenient time slot using the link below:
${bookingLink}

Once you select a slot, the interview will be automatically added to both of our calendars.

We look forward to speaking with you.

Best regards,
${employerCompany} Recruitment Team`;

  async function handleCopy() {
    await navigator.clipboard.writeText(emailTemplate);
    setCopied(true);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-400" />
            Invite to Interview
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-1">
              <p className="text-xs text-slate-400">Sending to</p>
              <p className="text-sm font-medium text-white">{candidateName}</p>
              <p className="text-xs text-indigo-400">{candidateEmail}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email Template
              </p>
              <p className="text-xs text-slate-500">
                Copy the email below and send it manually to the candidate.
              </p>
              <pre className="whitespace-pre-wrap text-xs text-slate-300 bg-slate-800/50 border border-white/10 rounded-xl p-4 max-h-64 overflow-y-auto font-sans leading-relaxed">
                {emailTemplate}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {copied
                  ? <><Check className="h-4 w-4" /> Copied!</>
                  : <><Copy className="h-4 w-4" /> Copy Email</>
                }
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-white border border-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}