import { Resend } from 'resend';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');
const EMAIL_FROM = process.env['EMAIL_FROM'] ?? 'hello@nestclaw.io';

export async function sendWelcomeEmail(
  email: string,
  subdomain: string,
  agentType: string,
  terminalUrl: string,
  webuiUrl?: string
): Promise<void> {
  try {
    const webuiSection = webuiUrl ? `<p><a href="${webuiUrl}">Open Web UI</a></p>` : '';
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your NestClaw agent is ready 🚀',
      html: `<h1>Welcome to NestClaw!</h1>
<p>Your <strong>${agentType}</strong> agent is live at <strong>${subdomain}.nestclaw.io</strong></p>
<p><a href="${terminalUrl}">Open Terminal</a></p>${webuiSection}
<p>Quick start: Open the terminal and start using your agent immediately.</p>`,
    });
  } catch (err) {
    console.log(JSON.stringify({ level: 'error', message: 'Failed to send welcome email', error: String(err) }));
  }
}

export async function sendCancellationEmail(email: string, deletionDate: Date): Promise<void> {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Your NestClaw agent will be deleted in 7 days',
      html: `<h1>Subscription Cancelled</h1>
<p>Your agent will be deleted on <strong>${deletionDate.toLocaleDateString()}</strong>.</p>
<p>Resubscribe before then to keep your data.</p>`,
    });
  } catch (err) {
    console.log(JSON.stringify({ level: 'error', message: 'Failed to send cancellation email', error: String(err) }));
  }
}
