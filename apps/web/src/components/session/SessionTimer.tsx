'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SessionTimerProps {
  durationMin: number;
  startedAt: string | null;
  onTimeUp: () => void;
}

export function SessionTimer({ durationMin, startedAt, onTimeUp }: SessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setTimeLeft(null);
      return;
    }

    const startMs = new Date(startedAt).getTime();
    const durationMs = durationMin * 60 * 1000;
    const endMs = startMs + durationMs;

    const calculateTimeLeft = () => {
      const now = Date.now();
      const remainingMs = endMs - now;
      return Math.max(0, Math.floor(remainingMs / 1000)); // remaining seconds
    };

    // Initial calculation
    const initialTimeLeft = calculateTimeLeft();
    setTimeLeft(initialTimeLeft);

    let hasShown5MinWarning = initialTimeLeft <= 300 && initialTimeLeft > 298;
    let hasShown1MinWarning = initialTimeLeft <= 60 && initialTimeLeft > 58;

    const timer = setInterval(() => {
      const secondsLeft = calculateTimeLeft();
      setTimeLeft(secondsLeft);

      // Warning at exactly 5 minutes (300 seconds)
      if (secondsLeft === 300 && !hasShown5MinWarning) {
        toast.info('5 minutes remaining');
        hasShown5MinWarning = true;
      }

      // Warning at exactly 1 minute (60 seconds)
      if (secondsLeft === 60 && !hasShown1MinWarning) {
        toast.warning('1 minute remaining');
        hasShown1MinWarning = true;
      }

      // Time up
      if (secondsLeft <= 0) {
        clearInterval(timer);
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, durationMin, onTimeUp]);

  if (!startedAt || timeLeft === null) {
    return <span className="font-mono tabular-nums">--:--</span>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Time-based styling
  let colorClass = 'text-white';
  let pulseClass = '';

  if (timeLeft <= 60) {
    colorClass = 'text-red-500 font-bold';
    pulseClass = 'animate-pulse';
  } else if (timeLeft <= 300) {
    colorClass = 'text-amber-400';
  }

  return (
    <span className={`font-mono tabular-nums ${colorClass} ${pulseClass}`}>
      {formattedTime}
    </span>
  );
}
