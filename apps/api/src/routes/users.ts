import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import type { AuthEnv } from '../middleware/auth';

export const usersRouter = new Hono<AuthEnv>();

usersRouter.get('/me', async (c) => {
  const authUser = c.get('user');
  const [user] = await db.select().from(users).where(eq(users.supabase_id, authUser.supabase_id));
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ data: user });
});

const agentTypeSchema = z.object({ agent_type: z.enum(['openclaw', 'hermes']) });

usersRouter.post('/me/agent-type', async (c) => {
  const authUser = c.get('user');
  const body = await c.req.json();
  const parsed = agentTypeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid agent_type' }, 400);

  const existing = await db.select().from(users).where(eq(users.supabase_id, authUser.supabase_id));
  if (existing.length > 0) {
    await db.update(users).set({ agent_type: parsed.data.agent_type }).where(eq(users.supabase_id, authUser.supabase_id));
  } else {
    await db.insert(users).values({
      email: authUser.email,
      supabase_id: authUser.supabase_id,
      agent_type: parsed.data.agent_type,
    });
  }
  return c.json({ data: { agent_type: parsed.data.agent_type } });
});
