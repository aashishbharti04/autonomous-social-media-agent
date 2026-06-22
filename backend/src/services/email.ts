import { config } from '../config.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email via Resend when RESEND_API_KEY is configured; otherwise logs
 * the message (and any link) to the server console so the flow is fully usable
 * in development / before an email provider is set up.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ delivered: boolean }> {
  if (!config.email.resendApiKey) {
    // eslint-disable-next-line no-console
    console.log(
      `\n📧 [email:console] To: ${msg.to}\n   Subject: ${msg.subject}\n   ${msg.text}\n`,
    );
    return { delivered: false };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.email.resendApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: config.email.from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
    });
    if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`);
    return { delivered: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Email send failed:', (err as Error).message);
    return { delivered: false };
  }
}

const wrap = (heading: string, body: string, cta: { label: string; url: string }): EmailMessage['html'] =>
  `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#4f46e5">${heading}</h2>
    <p style="color:#334155">${body}</p>
    <p><a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${cta.label}</a></p>
    <p style="color:#94a3b8;font-size:12px">Or paste this link: ${cta.url}</p>
  </div>`;

export function verificationEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Verify your email — Autonomous Social Media Agent',
    text: `Verify your email by opening: ${link}`,
    html: wrap('Verify your email', 'Confirm your email to finish setting up your account.', {
      label: 'Verify email',
      url: link,
    }),
  };
}

export function resetEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: 'Reset your password — Autonomous Social Media Agent',
    text: `Reset your password by opening: ${link} (expires in 1 hour)`,
    html: wrap('Reset your password', 'Click below to choose a new password. This link expires in 1 hour.', {
      label: 'Reset password',
      url: link,
    }),
  };
}
