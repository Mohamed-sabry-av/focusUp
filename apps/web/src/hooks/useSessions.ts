import { useQuery } from '@tanstack/react-query';
import { env } from '@focusUp/env/web';
import { UpcomingSession } from '@focusUp/shared-types';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';

/** My upcoming sessions (the next 7 days, plus one in progress). The partner is a first name and last initial only. */
export function useUpcomingSessions() {
  return useQuery({
    queryKey: ['upcomingSessions'],
    queryFn: async () => ({
      data: await apiRequest('/sessions/upcoming', { schema: z.array(UpcomingSession) }),
    }),
    refetchInterval: 30000, // 30 seconds
  });
}

export function useSessionHistory(page: number) {
  return useQuery({
    queryKey: ['sessionHistory', page],
    queryFn: async () => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/sessions/history?page=${page}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch session history');
      }
      return res.json();
    },
  });
}
