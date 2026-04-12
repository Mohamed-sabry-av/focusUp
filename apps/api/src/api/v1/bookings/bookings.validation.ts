import { z } from 'zod';

export const CreateBookingInput = z.object({
  slotTime: z.string().datetime(),
  durationMin: z.union([z.literal(25), z.literal(50), z.literal(75)]),
});

export type CreateBookingInputType = z.infer<typeof CreateBookingInput>;
