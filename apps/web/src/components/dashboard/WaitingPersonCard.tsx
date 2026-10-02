"use client";

import { PersonStanding, Star, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@focusUp/ui/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";

import { useAddFavorite, useRemoveFavorite } from "@/hooks/useFavorites";
import type { AvailableBooking } from "@/hooks/useBookings";
import { optionBadges } from "@/lib/booking-options";

interface WaitingPersonProps {
  booking: AvailableBooking;
  /** Distance from the top of the day column, in pixels. */
  top: number;
  /** Adds this person's slot to the selection. */
  onSelect: (booking: AvailableBooking) => void;
}

/**
 * Someone who is waiting for a partner, shown on the calendar at their start time.
 * Small badges show Quiet and Moving; a gold ring and star mean a favorite; initials
 * replace the photo when the person hides it. Hovering or focusing opens a card with
 * their options and a star to favorite them. Clicking adds the slot to the selection.
 */
export function WaitingPerson({ booking, top, onSelect }: WaitingPersonProps) {
  const { user } = booking;
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const badges = optionBadges(booking);
  const busy = addFavorite.isPending || removeFavorite.isPending;

  const toggleFavorite = () => {
    const mutation = booking.isFavorite ? removeFavorite : addFavorite;
    mutation.mutate(user.id, {
      onSuccess: () =>
        toast.success(booking.isFavorite ? `${user.displayName} removed from favorites` : `${user.displayName} added to favorites`),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="absolute z-30 group right-1.5" style={{ top: top - 16 }}>
      <button
        type="button"
        onClick={() => onSelect(booking)}
        aria-label={`${user.displayName}, ${booking.durationMin} minutes${badges.length ? `, ${badges.join(", ")}` : ""}${booking.isFavorite ? ", favorite" : ""}. Add this time to my sessions`}
        className="relative block focus:outline-none"
      >
        <span
          className={cn(
            "block w-9 h-9 rounded-xl overflow-hidden border-2 border-white shadow-md group-hover:scale-110 group-focus-within:scale-110 transition-transform",
            booking.isFavorite && "ring-2 ring-amber-400",
          )}
        >
          <Avatar className="w-full h-full rounded-xl">
            <AvatarImage src={user.avatarUrl ?? undefined} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-[#8FBAF3]/40 text-[#0245A3] text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </span>

        {booking.isFavorite && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
            <Star className="w-2.5 h-2.5 text-white fill-white" aria-hidden />
          </span>
        )}

        {(booking.quiet || booking.taskType === "WALK") && (
          <span className="absolute -bottom-1 -left-1 flex gap-0.5">
            {booking.quiet && (
              <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center shadow" title="Quiet mode">
                <VolumeX className="w-2.5 h-2.5 text-white" aria-hidden />
              </span>
            )}
            {booking.taskType === "WALK" && (
              <span className="w-4 h-4 rounded-full bg-[#0245A3] flex items-center justify-center shadow" title="Moving">
                <PersonStanding className="w-2.5 h-2.5 text-white" aria-hidden />
              </span>
            )}
          </span>
        )}
      </button>

      {/* Hover / focus card */}
      <div className="absolute right-full top-0 pr-2 hidden group-hover:block group-focus-within:block">
      <div className="w-56 rounded-xl bg-white border border-slate-200 shadow-xl p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-800 truncate">{user.displayName}</div>
            <div className="text-xs text-slate-500">{booking.durationMin} min · waiting for a partner</div>
          </div>
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={busy}
            aria-pressed={booking.isFavorite}
            aria-label={booking.isFavorite ? `Remove ${user.displayName} from favorites` : `Add ${user.displayName} to favorites`}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            <Star className={cn("w-4 h-4", booking.isFavorite ? "text-amber-400 fill-amber-400" : "text-slate-400")} />
          </button>
        </div>

        {badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {badges.map((badge) => (
              <span key={badge} className="px-2 py-0.5 rounded-full bg-[#BDF1F6]/50 text-[10px] font-bold text-[#0245A3]">
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 text-[11px] font-medium text-[#0245A3]">Click to add this time to your sessions</div>
      </div>
      </div>
    </div>
  );
}
