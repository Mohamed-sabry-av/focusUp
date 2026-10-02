import { env } from "@focusUp/env/server";
import { Resend } from "resend";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Sends an email through Resend. With no API key (development and test only:
 * the env schema requires a key in production) the email is printed instead,
 * so sign-up and reset flows can be tried locally.
 */
export async function deliverEmail(email: OutgoingEmail): Promise<void> {
  if (!resend) {
    console.log(
      `[email:not-sent] to=${email.to} subject="${email.subject}"\n${email.text}`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (error) {
    throw new Error(`Resend failed to send "${email.subject}": ${error.message}`);
  }
}
