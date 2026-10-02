"use client";

import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@focusUp/ui/components/avatar";
import { Skeleton } from "@focusUp/ui/components/skeleton";

import { useFavorites, useRemoveFavorite, type FavoriteUser } from "@/hooks/useFavorites";

function initialsOf(displayName: string): string {
  return (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function FavoriteRow({ person }: { person: FavoriteUser }) {
  const remove = useRemoveFavorite();

  return (
    <li className="flex items-center gap-3 px-8 py-3">
      <Avatar className="w-10 h-10 rounded-xl">
        <AvatarImage src={person.avatarUrl ?? undefined} className="object-cover" />
        <AvatarFallback className="rounded-xl bg-[#8FBAF3]/40 text-[#0245A3] text-sm font-bold">
          {initialsOf(person.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-800 truncate">{person.displayName}</div>
        <div className="text-xs text-slate-400 truncate">@{person.username}</div>
      </div>
      <button
        type="button"
        disabled={remove.isPending}
        aria-label={`Remove ${person.displayName} from favorites`}
        onClick={() =>
          remove.mutate(person.id, {
            onSuccess: () => toast.success(`${person.displayName} removed from favorites`),
            onError: (error) => toast.error(error.message),
          })
        }
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

/** The Favorites tab: the people who are matched first when you book. */
export function FavoritesPanel() {
  const { data, isLoading, isError } = useFavorites();
  const favorites = data?.data.favorites ?? [];

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900">Favorites</h1>
        <p className="text-sm text-slate-500 mt-1">
          People you favorite are matched with you first when &ldquo;Prefer Favorites&rdquo; is on.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-8 py-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        )}

        {isError && (
          <p role="alert" className="px-8 py-6 text-sm font-semibold text-red-600">
            Could not load your favorites. Please refresh the page.
          </p>
        )}

        {!isLoading && !isError && favorites.length === 0 && (
          <div className="h-full flex items-center justify-center text-slate-400 px-8">
            <div className="text-center max-w-xs">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" aria-hidden />
              <p className="text-sm font-medium">No favorites yet</p>
              <p className="text-xs mt-1">
                Hover a person who is waiting on the calendar and press the star to add them.
              </p>
            </div>
          </div>
        )}

        {favorites.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {favorites.map((person) => (
              <FavoriteRow key={person.id} person={person} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
