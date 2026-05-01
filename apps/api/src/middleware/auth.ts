import { createClient } from '@supabase/supabase-js';
import { createMiddleware } from 'hono/factory';

export type AuthUser = { id: string; email: string; supabase_id: string };
export type AuthEnv = { Variables: { user: AuthUser } };

const supabase = createClient(
  process.env['SUPABASE_URL'] ?? '',
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
);

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return c.json({ error: 'Unauthorized' }, 401);

  c.set('user', {
    id: data.user.id,
    email: data.user.email ?? '',
    supabase_id: data.user.id,
  });
  await next();
});
