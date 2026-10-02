"use client";

import { useState } from "react";
import { Badge } from "@focusUp/ui/components/badge";
import { cn } from "@focusUp/ui/lib/utils";
import { Clock, X, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@focusUp/ui/components/alert-dialog";
import { useCancelBooking } from "@/hooks/useBookings";
import { toast } from "sonner";

interface PendingBookingCardProps {
  booking: {
    id: string;
    slotTime: string;
    durationMin: number;
    status: string;
  };
}

export default function PendingBookingCard({
  booking,
}: PendingBookingCardProps) {
  const cancelBooking = useCancelBooking();
  const [dialogOpen, setDialogOpen] = useState(false);

  const scheduledDate = new Date(booking.slotTime);
  const timeStr = scheduledDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = scheduledDate.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  const handleCancel = async () => {
    try {
      await cancelBooking.mutateAsync(booking.id);
      toast.success("Booking cancelled");
      setDialogOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      toast.error(message);
    }
  };

  return (
    <div
      className={cn(
        "group bg-white rounded-2xl border-2 border-dashed border-amber-200 p-5",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        "relative overflow-hidden",
      )}
    >
      {/* Subtle animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-50/50 to-transparent animate-shimmer pointer-events-none" />

      {/* Top Row: Status badge */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className="flex items-center gap-3">
          {/* Pulsing waiting indicator */}
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
            <div className="relative">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <div className="font-bold text-sm text-slate-700">
              Waiting for partner…
            </div>
            <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Searching
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-700"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 inline-block animate-pulse" />
          Pending
        </Badge>
      </div>

      {/* Detail Row */}
      <div className="flex flex-wrap items-center gap-3 mb-4 relative">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {dateStr}, {timeStr}
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] font-bold bg-slate-100 text-slate-600 border-0"
        >
          {booking.durationMin} min
        </Badge>
      </div>

      {/* Cancel Button */}
      <div className="relative">
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
            Cancel booking
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-bold text-slate-800">
                Cancel this booking?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-500">
                Your booking for {dateStr} at {timeStr} ({booking.durationMin}{" "}
                min) will be cancelled. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl font-semibold">
                Keep Booking
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={cancelBooking.isPending}
                className="rounded-xl bg-red-500 hover:bg-red-600 font-semibold text-white"
              >
                {cancelBooking.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Yes, Cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
