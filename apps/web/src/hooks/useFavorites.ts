"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@focusUp/env/web";

export interface FavoriteUser {
  id: string;
  displayName: string;
  username: string;
  /** Null when the person hides their photo. */
  avatarUrl: string | null;
  favoritedAt: string;
}

async function readError(res: Response, fallback: string): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(body.error || fallback);
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/favorites`, {
        credentials: "include",
      });
      if (!res.ok) throw await readError(res, "Failed to load favorites");
      return (await res.json()) as { data: { favorites: FavoriteUser[] } };
    },
  });
}

/** Adding or removing a favorite also refreshes the calendar, so the stars update at once. */
function useInvalidateFavorites() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["favorites"] });
    queryClient.invalidateQueries({ queryKey: ["bookings", "available"] });
    queryClient.invalidateQueries({ queryKey: ["upcomingSessions"] });
  };
}

export function useAddFavorite() {
  const invalidate = useInvalidateFavorites();
  return useMutation({
    mutationFn: async (favoriteId: string) => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ favoriteId }),
      });
      if (!res.ok) throw await readError(res, "Could not add this favorite");
    },
    onSuccess: invalidate,
  });
}

export function useRemoveFavorite() {
  const invalidate = useInvalidateFavorites();
  return useMutation({
    mutationFn: async (favoriteId: string) => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/favorites/${favoriteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw await readError(res, "Could not remove this favorite");
    },
    onSuccess: invalidate,
  });
}
