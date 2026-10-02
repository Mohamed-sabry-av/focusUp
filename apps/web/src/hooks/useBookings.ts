'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { env } from '@focusUp/env/web';

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { slotTime: string; durationMin: number }) => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create booking');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

export function useUserBookings(status?: string) {
  return useQuery({
    queryKey: ['bookings', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : '';
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/bookings${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/bookings/${bookingId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });
}

export function useAvailableBookings(date: string, days: number) {
  return useQuery({
    queryKey: ['bookings', 'available', date, days],
    queryFn: async () => {
      const res = await fetch(
        `${env.NEXT_PUBLIC_SERVER_URL}/api/v1/bookings/available?date=${date}&days=${days}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch available bookings');
      return res.json();
    },
    refetchInterval: 30000, // refresh every 30s to see new bookings
  });
}
