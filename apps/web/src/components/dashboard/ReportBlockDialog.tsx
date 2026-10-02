"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ReportReason, type UpcomingSession } from "@focusUp/shared-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@focusUp/ui/components/dialog";
import { Button } from "@focusUp/ui/components/button";

import { useReportAndBlock } from "@/hooks/useSessionRoom";

const REASONS: ReadonlyArray<{ id: ReportReason; label: string }> = [
  { id: ReportReason.INAPPROPRIATE, label: "Inappropriate behaviour" },
  { id: ReportReason.HARASSMENT, label: "Harassment" },
  { id: ReportReason.SPAM, label: "Spam" },
  { id: ReportReason.OTHER, label: "Something else" },
];

interface ReportBlockDialogProps {
  /** The session whose partner is reported, or null when the dialog is closed. */
  session: UpcomingSession | null;
  onClose: () => void;
  onDone: (sessionId: string) => void;
}

/** Report and block the partner before the session. The session is cancelled with no strike. */
export function ReportBlockDialog({ session, onClose, onDone }: ReportBlockDialogProps) {
  const [reason, setReason] = useState<ReportReason>(ReportReason.INAPPROPRIATE);
  const [description, setDescription] = useState("");
  const reportAndBlock = useReportAndBlock();
  const partner = session?.partner;

  const submit = () => {
    if (!session || !partner) return;
    reportAndBlock.mutate(
      { sessionId: session.id, partnerId: partner.id, reason, description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${partner.displayName} was reported and blocked. Your session was cancelled with no strike.`);
          onDone(session.id);
          setDescription("");
          onClose();
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl bg-white p-6 text-slate-800 ring-slate-200 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Report and block {partner?.displayName}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            You will never be matched with each other again, and this session is cancelled with no strike for you.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-semibold text-slate-600">Why are you reporting?</legend>
          {REASONS.map(({ id, label }) => (
            <label key={id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="report-reason"
                checked={reason === id}
                onChange={() => setReason(id)}
                className="h-4 w-4 accent-[#0245A3]"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="block text-xs font-semibold text-slate-600">
          Tell us more (optional)
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 p-2 text-sm font-normal text-slate-800 outline-none focus:border-[#0245A3]"
          />
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50">
            Keep session
          </Button>
          <Button disabled={reportAndBlock.isPending} onClick={submit} className="h-10 rounded-xl bg-red-600 px-4 text-sm text-white hover:bg-red-700">
            {reportAndBlock.isPending ? "Reporting..." : "Report and block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
