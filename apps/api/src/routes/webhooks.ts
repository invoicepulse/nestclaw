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

function verifySignature(_body: string, _signature: string): boolean {
  if (process.env['NODE_ENV'] !== 'production') return true;
  if (!WEBHOOK_SECRET) return true;
  try {
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(_body).digest('hex');
    const sig = _signature.replace('v1,', '');
    if (expected.length !== sig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

function generateSubdomain(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function log(level: string, message: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, message, ...data, timestamp: new Date().toISOString() }));
}

webhooksRouter.post('/polar', async (c) => {
  try {
    const payload = await c.req.json() as {
      type: string;
      data: {
        id: string;
        customer: { email: string; id: string };
        metadata?: { agent_type?: string };
      };
    };

    log('info', 'Webhook received', { type: payload.type });

    if (payload.type === 'subscription.created') {
      const { customer, id: subscriptionId, metadata } = payload.data;
      log('info', 'Processing subscription.created', { email: customer.email });

      // Upsert user
      let [user] = await db.select().from(users).where(eq(users.email, customer.email));
      if (!user) {
        const [newUser] = await db.insert(users).values({
          email: customer.email,
          supabase_id: customer.id || `test_${Date.now()}`,
          polar_customer_id: customer.id,
          agent_type: metadata?.agent_type ?? 'openclaw',
        }).returning();
        user = newUser!;
        log('info', 'User created', { userId: user.id });
      } else {
        await db.update(users).set({ 
          polar_customer_id: customer.id,
          agent_type: metadata?.agent_type ?? user.agent_type 
        }).where(eq(users.id, user.id));
        log('info', 'User updated', { userId: user.id });
        // Re-fetch to get updated agent_type
        [user] = await db.select().from(users).where(eq(users.id, user.id));
      }

      const agentType = metadata?.agent_type ?? user.agent_type ?? 'openclaw';

      // Generate unique subdomain
      let subdomain = generateSubdomain();
      for (let i = 0; i < 10; i++) {
        const existing = await db.select().from(containers).where(eq(containers.subdomain, subdomain));
        if (existing.length === 0) break;
        subdomain = generateSubdomain();
      }
      log('info', 'Subdomain generated', { subdomain });

      // Insert container record
      const [container] = await db.insert(containers).values({
        user_id: user.id,
        subdomain,
        container_name: `nestclaw_${subdomain}`,
        agent_type: agentType,
        terminal_port: 0,
        subscription_status: 'provisioning',
        polar_subscription_id: subscriptionId,
      }).returning();
      log('info', 'Container record created', { containerId: container!.id });

      // Provision Docker container
      log('info', 'Starting Docker provisioning...');
      const result = await provisionContainer(user.id, subdomain, agentType);
      log('info', 'Container provisioned', { ...result });

      // Update with real ports
      await db.update(containers).set({
        terminal_port: result.terminal_port,
        webui_port: result.webui_port,
        container_name: result.container_name,
        subscription_status: 'active',
      }).where(eq(containers.id, container!.id));

      // Register routes + DNS (non-blocking failures)
      try { await addContainerRoutes(subdomain, result.terminal_port, result.webui_port ?? undefined); } catch (e) { log('warn', 'Caddy route failed', { error: String(e) }); }
      try { await createDnsRecord(subdomain); } catch (e) { log('warn', 'DNS record failed', { error: String(e) }); }

      // Send welcome email
      const terminalUrl = `http://${DOMAIN}:${result.terminal_port}`;
      const webuiUrl = result.webui_port ? `http://${DOMAIN}:${result.webui_port}` : undefined;
      await sendWelcomeEmail(customer.email, subdomain, agentType, terminalUrl, webuiUrl);

      log('info', 'Provisioning complete', { subdomain, terminalUrl, webuiUrl });
      return c.json({ received: true, subdomain, terminalUrl });

    } else if (payload.type === 'subscription.cancelled') {
      const { id: subscriptionId } = payload.data;
      const [container] = await db.select().from(containers).where(eq(containers.polar_subscription_id, subscriptionId));
      if (container) {
        const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.update(containers).set({ subscription_status: 'grace_period', deletion_scheduled_at: deletionDate }).where(eq(containers.id, container.id));
        const [user] = await db.select().from(users).where(eq(users.id, container.user_id));
        if (user) await sendCancellationEmail(user.email, deletionDate);
        log('info', 'Subscription cancelled', { subdomain: container.subdomain });
      }
    }

    return c.json({ received: true });
  } catch (err) {
    log('error', 'Webhook failed', { error: String(err), stack: (err as Error).stack });
    return c.json({ error: 'Processing failed' }, 500);
  }
});
