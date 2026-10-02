'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { env } from '@focusUp/env/web';

import { WaitingBooking } from '@focusUp/shared-types';
import { z } from 'zod';

import { apiRequest } from '@/lib/api-client';
import { BookingRequestError } from '@/lib/booking-errors';
import type { BookingOptions, TaskType } from '@/lib/booking-options';

export interface CreateBookingVariables extends Partial<BookingOptions> {
  slotTime: string;
  durationMin: number;
}

/** What POST /bookings answers. `session` is null while the person waits for a partner. */
export interface CreateBookingResult {
  data: {
    bookingRequest: { id: string; status: string };
    session: {
      id: string;
      user1Id: string;
      user2Id: string | null;
      user1: { id: string; displayName: string };
      user2: { id: string; displayName: string } | null;
    } | null;
  };
}

/** A person waiting for a partner, as the calendar receives them (GET /bookings/available). */
export interface AvailableBooking {
  id: string;
  slotTime: string;
  durationMin: number;
  quiet: boolean;
  taskType: TaskType;
  isFavorite: boolean;
  user: {
    id: string;
    displayName: string;
    username: string;
    /** Null when the person hides their photo: show the initials instead. */
    avatarUrl: string | null;
    initials: string;
  };
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<CreateBookingResult, BookingRequestError, CreateBookingVariables>({
    mutationFn: async (variables) => {
      // The camera is chosen when joining, so a booking never sends cameraOn (the API defaults it on).
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(variables),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new BookingRequestError(err.error || 'Failed to create booking', res.status);
      }
      return res.json() as Promise<CreateBookingResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingSessions'] });
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

/**
 * My bookings that are still waiting for a partner and have not ended. The calendar draws them as
 * "Matching..." cards and the Upcoming list shows them, so a booking never seems to vanish.
 */
export function useWaitingBookings() {
  return useQuery({
    queryKey: ['bookings', 'waiting'],
    queryFn: async () => {
      const bookings = await apiRequest('/bookings?status=PENDING&limit=50', { schema: z.array(WaitingBooking) });
      const now = Date.now();
      return bookings.filter((b) => new Date(b.slotTime).getTime() + b.durationMin * 60_000 > now);
    },
    refetchInterval: 30_000,
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
      queryClient.invalidateQueries({ queryKey: ['upcomingSessions'] });
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
      return res.json() as Promise<{ data: { bookings: AvailableBooking[] } }>;
    },
    refetchInterval: 30000, // refresh every 30s to see new bookings
  });
}
