import { Hono } from 'hono';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, users, containers } from '../db';
import { provisionContainer } from '../services/docker';
import { addContainerRoutes } from '../services/caddy';
import { createDnsRecord } from '../services/cloudflare';
import { sendWelcomeEmail, sendCancellationEmail } from '../services/email';

export const webhooksRouter = new Hono();

const DOMAIN = process.env['DOMAIN'] ?? 'nestclaw.io';
const WEBHOOK_SECRET = process.env['POLAR_WEBHOOK_SECRET'] ?? '';

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true; // skip in dev
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function generateSubdomain(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

webhooksRouter.post('/polar', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('webhook-signature') ?? '';

  if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  const payload = JSON.parse(rawBody) as {
    type: string;
    data: {
      id: string;
      customer: { email: string; id: string };
      metadata?: { agent_type?: string };
    };
  };

  try {
    if (payload.type === 'subscription.created') {
      const { customer, id: subscriptionId, metadata } = payload.data;

      // Upsert user
      let [user] = await db.select().from(users).where(eq(users.email, customer.email));
      if (!user) {
        const [newUser] = await db.insert(users).values({
          email: customer.email,
          supabase_id: customer.id,
          polar_customer_id: customer.id,
          agent_type: metadata?.agent_type ?? 'openclaw',
        }).returning();
        user = newUser!;
      } else {
        await db.update(users).set({ polar_customer_id: customer.id }).where(eq(users.id, user.id));
      }

      const agentType = user.agent_type ?? 'openclaw';

      // Generate unique subdomain
      let subdomain = generateSubdomain();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await db.select().from(containers).where(eq(containers.subdomain, subdomain));
        if (existing.length === 0) break;
        subdomain = generateSubdomain();
        attempts++;
      }

      // Insert container record as provisioning
      const [container] = await db.insert(containers).values({
        user_id: user.id,
        subdomain,
        container_name: `nestclaw_${subdomain}`,
        agent_type: agentType,
        terminal_port: 0,
        webui_port: null,
        subscription_status: 'provisioning',
        polar_subscription_id: subscriptionId,
      }).returning();

      // Provision
      const result = await provisionContainer(user.id, subdomain, agentType);

      // Update with real ports
      await db.update(containers).set({
        terminal_port: result.terminal_port,
        webui_port: result.webui_port,
        container_name: result.container_name,
        subscription_status: 'active',
      }).where(eq(containers.id, container!.id));

      // Register routes + DNS
      await addContainerRoutes(subdomain, result.terminal_port, result.webui_port ?? undefined);
      await createDnsRecord(subdomain);

      // Send welcome email
      const terminalUrl = `https://terminal.${subdomain}.${DOMAIN}`;
      const webuiUrl = agentType === 'hermes' ? `https://ui.${subdomain}.${DOMAIN}` : undefined;
      await sendWelcomeEmail(customer.email, subdomain, agentType, terminalUrl, webuiUrl);

      console.log(JSON.stringify({ level: 'info', message: 'Container provisioned', subdomain, agentType }));
    } else if (payload.type === 'subscription.cancelled') {
      const { id: subscriptionId } = payload.data;
      const [container] = await db.select().from(containers).where(eq(containers.polar_subscription_id, subscriptionId));
      if (container) {
        const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.update(containers).set({
          subscription_status: 'grace_period',
          deletion_scheduled_at: deletionDate,
        }).where(eq(containers.id, container.id));

        const [user] = await db.select().from(users).where(eq(users.id, container.user_id));
        if (user) await sendCancellationEmail(user.email, deletionDate);
      }
    }
    // Return 200 for all valid webhooks
    return c.json({ received: true });
  } catch (err) {
    console.log(JSON.stringify({ level: 'error', message: 'Webhook processing failed', error: String(err) }));
    return c.json({ error: 'Processing failed' }, 500);
  }
});
