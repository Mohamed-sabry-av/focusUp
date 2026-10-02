'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { toast } from 'sonner';

export function useMatchNotifications() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    socket.on('match:found', (data) => {
      toast.success(`Partner found! ${data.partnerName} will join your ${data.durationMin}min session`, {
        action: {
          label: 'View Session',
          onClick: () => window.location.href = '/dashboard',
        },
      });
      // Invalidate queries so dashboard updates
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    });

    socket.on('session:reminder', (data) => {
      toast.info('Session reminder: Your focus session is coming up!', {
        action: {
          label: 'View',
          onClick: () => window.location.href = '/dashboard',
        },
      });
    });

    socket.on('session:reminder-urgent', (data) => {
      toast.warning('Your session starts in 5 minutes!', {
        action: {
          label: 'Join Now',
          onClick: () => window.location.href = data.joinUrl,
        },
        duration: 15000,
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    });

    socket.on('session:noshow', (data) => {
      toast.error(data.message);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    });

    socket.on('booking:expired', (data) => {
      toast.info(data.message);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    });

    return () => {
      socket.off('match:found');
      socket.off('session:reminder');
      socket.off('session:reminder-urgent');
      socket.off('session:noshow');
      socket.off('booking:expired');
      disconnectSocket();
    };
  }, [queryClient]);
}
