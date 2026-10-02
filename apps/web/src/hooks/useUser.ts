import { useQuery } from "@tanstack/react-query";
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
