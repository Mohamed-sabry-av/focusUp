import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { prisma } from "../lib/prisma";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "../services/email.service";

export interface ExpiryJobData {
  bookingRequestId: string;
}

export async function processExpiryJob(job: Job<ExpiryJobData>): Promise<void> {
  const { bookingRequestId } = job.data;

  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingRequestId },
    include: { user: true },
  });

  if (!booking) {
    console.log(
      `[expiry] BookingRequest ${bookingRequestId} not found, skipping`,
    );
    return;
  }

  // Only expire PENDING bookings
  if (booking.status !== "PENDING") {
    console.log(
      `[expiry] BookingRequest ${bookingRequestId} is ${booking.status}, skipping`,
    );
    return;
  }

  await prisma.bookingRequest.update({
    where: { id: bookingRequestId },
    data: { status: "EXPIRED" },
  });

  await NotificationService.notifyBookingExpired(
    booking.userId,
    booking.slotTime,
  );

  await EmailService.sendBookingExpired({
    to: booking.user.email,
    slotTime: booking.slotTime,
  });
}

export const expiryWorker = new Worker<ExpiryJobData>(
  "booking-expiry",
  processExpiryJob,
  { connection },
);
