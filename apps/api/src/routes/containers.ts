import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, users, containers } from '../db';
import { wakeContainer, isContainerRunning } from '../services/wake';
import type { AuthEnv } from '../middleware/auth';

export const containersRouter = new Hono<AuthEnv>();
const DOMAIN = process.env['DOMAIN'] ?? 'nestclaw.io';

containersRouter.get('/me', async (c) => {
  const authUser = c.get('user');
  const [user] = await db.select().from(users).where(eq(users.supabase_id, authUser.supabase_id));
  if (!user) return c.json({ error: 'User not found' }, 404);

  const [container] = await db.select().from(containers).where(eq(containers.user_id, user.id));
  if (!container) return c.json({ error: 'No container found' }, 404);

  // Auto-wake if container is stopped but subscription is active
  let containerStatus = container.subscription_status;
  if (containerStatus === 'active') {
    const running = await isContainerRunning(container.container_name);
    if (!running) {
      const wake = await wakeContainer(container.subdomain);
      containerStatus = wake.status === 'error' ? 'error' : 'active';
    }
  }

  return c.json({
    data: {
      ...container,
      subscription_status: containerStatus,
      terminal_url: `https://terminal.${container.subdomain}.${DOMAIN}`,
      webui_url: container.agent_type === 'hermes' ? `https://ui.${container.subdomain}.${DOMAIN}` : null,
    },
  });
});
