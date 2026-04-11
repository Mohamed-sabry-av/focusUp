import { useQuery } from '@tanstack/react-query';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users/me', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const res = await fetch('/api/v1/users/me/stats', {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch user stats');
      }
      return res.json();
    },
  });
}
