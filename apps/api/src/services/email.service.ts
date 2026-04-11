export interface BookingConfirmationParams {
  to: string;
  partnerName: string;
  sessionTime: Date;
  durationMin: number;
  sessionId: string;
  timezone: string;
}

export interface SessionReminderParams {
  to: string;
  partnerName: string;
  sessionTime: Date;
  sessionId: string;
}

export interface NoShowNotificationParams {
  to: string;
  sessionId: string;
}

export class EmailService {
  /**
   * Send booking confirmation email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendBookingConfirmation(params: BookingConfirmationParams) {
    console.log('[EmailService] sendBookingConfirmation:', params);
  }

  /**
   * Send session reminder email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendSessionReminder(params: SessionReminderParams) {
    console.log('[EmailService] sendSessionReminder:', params);
  }

  /**
   * Send no-show notification email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendNoShowNotification(params: NoShowNotificationParams) {
    console.log('[EmailService] sendNoShowNotification:', params);
  }
}
