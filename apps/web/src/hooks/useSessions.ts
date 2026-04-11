import { useQuery } from '@tanstack/react-query';

export function useUpcomingSessions() {
  return useQuery({
    queryKey: ['upcomingSessions'],
    queryFn: async () => {
      const res = await fetch('/api/v1/sessions/upcoming', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch upcoming sessions');
      }
      return res.json();
    },
    refetchInterval: 30000, // 30 seconds
  });
}

export function useSessionHistory(page: number) {
  return useQuery({
    queryKey: ['sessionHistory', page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/sessions/history?page=${page}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch session history');
      }
      return res.json();
    },
  });
}
