import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { env } from "@focusUp/env/web";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      return res.json();
    },
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me/stats`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) {
        throw new Error("Failed to fetch user stats");
      }
      return res.json();
    },
  });
}

export function usePreviousPartners(page: number = 1) {
  return useQuery({
    queryKey: ["previousPartners", page],
    queryFn: async () => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me/partners?page=${page}&limit=10`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch partners");
      return res.json() as Promise<{
        data: {
          partners: Array<{
            id: string;
            displayName: string;
            username: string;
            avatarUrl: string | null;
            lastSessionDate: string;
            totalSessionsTogether: number;
          }>;
        };
        total: number;
        page: number;
        totalPages: number;
      }>;
    },
  });
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ["userPreferences"],
    queryFn: async () => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me/preferences`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json() as Promise<{
        data: {
          preferences: {
            googleCalendarSync: boolean;
            emailCalendarInvites: boolean;
            performanceReports: boolean;
            desktopNotifications: boolean;
            quietMode: boolean;
            preferFavorites: boolean;
            timeFormat: string;
            weekStartsOn: string;
            autoRematch: boolean;
            mutedOnJoin: boolean;
            availability: string;
          };
        };
      }>;
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me/preferences`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Failed to update preferences");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      displayName?: string;
      username?: string;
      timezone?: string;
      hidePhoto?: boolean;
      dataSaver?: boolean;
    }) => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}
