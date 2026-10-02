"use client";

import { Ban, Link2, MoreHorizontal, Star, X } from "lucide-react";
import { toast } from "sonner";
import type { UpcomingSession } from "@focusUp/shared-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@focusUp/ui/components/dropdown-menu";

import { useAddFavorite, useRemoveFavorite } from "@/hooks/useFavorites";

interface SessionMenuProps {
  session: UpcomingSession;
  onCancel: (session: UpcomingSession) => void;
  onReportBlock: (session: UpcomingSession) => void;
}

/** The "more options" menu of a session: cancel, favorite the partner, report or block, copy the link. */
export function SessionMenu({ session, onCancel, onReportBlock }: SessionMenuProps) {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const partner = session.partner;

  const toggleFavorite = () => {
    if (!partner) return;
    const mutation = partner.isFavorite ? removeFavorite : addFavorite;
    mutation.mutate(partner.id, {
      onSuccess: () =>
        toast.success(partner.isFavorite ? `${partner.displayName} removed from favorites` : `${partner.displayName} added to favorites`),
      onError: (error) => toast.error(error.message),
    });
  };

  const copyLink = () => {
    const link = `${window.location.origin}/session/${session.id}`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success("Session link copied"))
      .catch(() => toast.error("Could not copy the link"));
  };

  return (
    // Clicks inside the menu (it renders in a portal, but React events still bubble) must not open the card behind it.
    <span onClick={(event) => event.stopPropagation()} className="inline-flex">
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="More options"
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-white/70 hover:text-slate-800"
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border border-slate-200 bg-white p-1 text-slate-800 shadow-lg">
        <DropdownMenuItem onClick={() => onCancel(session)} className="rounded-lg focus:bg-slate-100 focus:text-slate-900">
          <X aria-hidden /> Cancel session
        </DropdownMenuItem>
        {partner && (
          <DropdownMenuItem onClick={toggleFavorite} className="rounded-lg focus:bg-slate-100 focus:text-slate-900">
            <Star aria-hidden /> {partner.isFavorite ? "Remove from favorites" : "Add partner to favorites"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={copyLink} className="rounded-lg focus:bg-slate-100 focus:text-slate-900">
          <Link2 aria-hidden /> Copy session link
        </DropdownMenuItem>
        {partner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onReportBlock(session)} className="rounded-lg">
              <Ban aria-hidden /> Report / Block
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    </span>
  );
}
