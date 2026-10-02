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

export interface StrikeWarningParams {
  to: string;
  strikeCount: number;
}

export interface BanNotificationParams {
  to: string;
}

export interface PartnerNoShowParams {
  to: string;
  sessionId: string;
}

export interface BookingExpiredParams {
  to: string;
  slotTime: Date;
}

export class EmailService {
  /**
   * Send booking confirmation email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendBookingConfirmation(params: BookingConfirmationParams) {
    console.log("[EmailService] sendBookingConfirmation:", params);
  }

  /**
   * Send session reminder email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendSessionReminder(params: SessionReminderParams) {
    console.log("[EmailService] sendSessionReminder:", params);
  }

  /**
   * Send no-show notification email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendNoShowNotification(params: NoShowNotificationParams) {
    console.log("[EmailService] sendNoShowNotification:", params);
  }

  /**
   * Send strike warning email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendStrikeWarning(params: StrikeWarningParams): Promise<void> {
    console.log("[EmailService] sendStrikeWarning:", params);
  }

  /**
   * Send ban notification email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendBanNotification(
    params: BanNotificationParams,
  ): Promise<void> {
    console.log("[EmailService] sendBanNotification:", params);
  }

  /**
   * Send partner no-show notification email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendPartnerNoShowNotification(
    params: PartnerNoShowParams,
  ): Promise<void> {
    console.log("[EmailService] sendPartnerNoShowNotification:", params);
  }

  /**
   * Send booking expired notification email.
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendBookingExpired(params: BookingExpiredParams): Promise<void> {
    console.log("[EmailService] sendBookingExpired:", params);
  }
}
