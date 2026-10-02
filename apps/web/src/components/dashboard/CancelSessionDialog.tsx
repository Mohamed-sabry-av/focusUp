"use client";

import { toast } from "sonner";
import type { UpcomingSession } from "@focusUp/shared-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@focusUp/ui/components/alert-dialog";

import { useCancelSession } from "@/hooks/useSessionRoom";
import { cancelCopy } from "@/lib/cancel-text";

interface CancelSessionDialogProps {
  /** The session to cancel, or null when the dialog is closed. */
  session: UpcomingSession | null;
  onClose: () => void;
  onCancelled: (sessionId: string) => void;
}

/** Asks before cancelling, and says plainly whether it is free or costs a strike. */
export function CancelSessionDialog({ session, onClose, onCancelled }: CancelSessionDialogProps) {
  const cancel = useCancelSession();
  const copy = session ? cancelCopy(session.scheduledAt, new Date(), session.partner?.displayName) : null;

  const confirm = () => {
    if (!session || !copy) return;
    if (!session.bookingId) {
      toast.error("Could not find this booking. Refresh the page and try again.");
      return;
    }
    cancel.mutate(session.bookingId, {
      onSuccess: () => {
        toast.success(copy.free ? "Session cancelled" : "Session cancelled. A late-cancellation strike was added.");
        onCancelled(session.id);
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <AlertDialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="rounded-2xl bg-white p-6 text-slate-800 ring-slate-200 sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-slate-900">{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-slate-600">{copy?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50">Keep session</AlertDialogCancel>
          <AlertDialogAction
            className={copy?.free === false ? "h-10 rounded-xl bg-red-600 px-4 text-sm text-white hover:bg-red-700" : "h-10 rounded-xl bg-[#0245A3] px-4 text-sm text-white hover:brightness-110"}
            disabled={cancel.isPending}
            onClick={confirm}
          >
            {cancel.isPending ? "Cancelling..." : copy?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
