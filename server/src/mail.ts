import { env } from './env';

const RESET_SUBJECT = 'Reset your Team Task Manager password';

export type PasswordResetSendResult =
  | { ok: true; channel: 'resend' }
  | { ok: true; channel: 'none_dev' }
  | { ok: false; channel: 'resend_failed'; status: number; detail: string };

/**
 * Sends password reset email via Resend when RESEND_API_KEY is set.
 * Without a key in development: does not send (caller may return a one-time link to the user).
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<PasswordResetSendResult> {
  const from = env.EMAIL_FROM?.trim() || 'Team Task Manager <onboarding@resend.dev>';

  if (env.RESEND_API_KEY?.trim()) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: RESET_SUBJECT,
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a> (expires in 1 hour).</p><p>If you did not request this, you can ignore this email.</p>`,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[mail] Resend failed:', res.status, detail);
      return { ok: false, channel: 'resend_failed', status: res.status, detail };
    }
    return { ok: true, channel: 'resend' };
  }

  if (env.NODE_ENV !== 'production') {
    console.info('[password-reset] No email provider configured. Reset link (dev):\n', resetUrl);
    return { ok: true, channel: 'none_dev' };
  }

  console.warn('[password-reset] RESEND_API_KEY is not set — cannot send email in production.');
  return { ok: true, channel: 'none_dev' };
}
