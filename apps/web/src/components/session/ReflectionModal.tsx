'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface ReflectionModalProps {
  sessionId: string;
  onSaveConfig: (data: { sessionId: string; text: string; rating?: number }) => Promise<boolean>;
  onSkip: () => void;
  onSaveSuccess: () => void;
}

export function ReflectionModal({ sessionId, onSaveConfig, onSkip, onSaveSuccess }: ReflectionModalProps) {
  const [text, setText] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!text.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = await onSaveConfig({
        sessionId,
        text: text.trim(),
        rating,
      });

      if (success) {
        toast.success('Reflection saved!');
        setTimeout(() => {
          onSaveSuccess();
        }, 1000);
      } else {
        setIsSubmitting(false);
      }
    } catch {
      setIsSubmitting(false);
      toast.error('Failed to save reflection');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
        <h2 className="mb-2 text-2xl font-bold text-white">
          Session Complete! How did it go?
        </h2>
        <p className="mb-6 text-sm text-zinc-400">
          Take a moment to reflect on what you accomplished.
        </p>

        {/* Star Rating */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Rating (Optional)
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`transition-transform hover:scale-110 focus:outline-none ${
                  rating && star <= rating ? 'text-amber-400' : 'text-zinc-600'
                }`}
              >
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Reflection Text */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            What did you accomplish?
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            className="h-32 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="I finished writing the API handlers and tests..."
          />
          <div className="mt-2 text-right text-xs text-zinc-500">
            {text.length}/1000
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={!text.trim() || isSubmitting}
            className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Reflection'}
          </button>
          <button
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full rounded-lg py-3 text-sm font-medium text-zinc-400 transition-colors hover:text-white disabled:pointer-events-none"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
