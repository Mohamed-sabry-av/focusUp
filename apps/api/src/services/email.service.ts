import { deliverEmail } from "./email.transport";

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

export interface SuspensionNotificationParams {
  to: string;
  until: Date;
}

export interface PartnerNoShowParams {
  to: string;
  sessionId: string;
}

export interface BookingExpiredParams {
  to: string;
  slotTime: Date;
}

export interface AuthLinkEmailParams {
  to: string;
  name: string;
  url: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function actionEmail(
  heading: string,
  intro: string,
  buttonLabel: string,
  url: string,
  outro: string,
): { text: string; html: string } {
  const text = `${heading}\n\n${intro}\n\n${buttonLabel}: ${url}\n\n${outro}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
<h2>${escapeHtml(heading)}</h2>
<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#0b3d91;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${escapeHtml(buttonLabel)}</a></p>
<p style="color:#666;font-size:13px">${escapeHtml(outro)}</p>
</div>`;
  return { text, html };
}

export class EmailService {
  /** Send the "verify your email" link (sign-up and resend). */
  static async sendVerificationEmail(params: AuthLinkEmailParams): Promise<void> {
    const body = actionEmail(
      "Verify your email",
      `Hi ${params.name}, confirm your email address to start booking focus sessions.`,
      "Verify email",
      params.url,
      "If you did not create a FocusUp account, you can ignore this email.",
    );
    await deliverEmail({ to: params.to, subject: "Verify your FocusUp email", ...body });
  }

  /** Send the password reset link. */
  static async sendPasswordReset(params: AuthLinkEmailParams): Promise<void> {
    const body = actionEmail(
      "Reset your password",
      `Hi ${params.name}, use the button below to choose a new password. The link expires in 1 hour.`,
      "Reset password",
      params.url,
      "If you did not ask for this, you can ignore this email. Your password stays the same.",
    );
    await deliverEmail({ to: params.to, subject: "Reset your FocusUp password", ...body });
  }

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
   * Send suspension notification email (5 strikes in 30 days).
   * TODO: Implement Resend SDK in Phase 3.
   */
  static async sendSuspensionNotification(
    params: SuspensionNotificationParams,
  ): Promise<void> {
    console.log("[EmailService] sendSuspensionNotification:", params);
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
