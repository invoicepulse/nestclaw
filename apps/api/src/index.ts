import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';
import { authMiddleware } from './middleware/auth';
import { usersRouter } from './routes/users';
import { containersRouter } from './routes/containers';
import { webhooksRouter } from './routes/webhooks';
import { startCleanupJob } from './jobs/cleanup';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env['NODE_ENV'] === 'production'
      ? [`https://${process.env['DOMAIN'] ?? 'nestclaw.io'}`]
      : ['http://localhost:1111'],
    credentials: true,
  })
);

// Public routes
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.route('/api/webhooks', webhooksRouter);

// Protected routes
app.use('/api/users/*', authMiddleware);
app.use('/api/containers/*', authMiddleware);
app.route('/api/users', usersRouter);
app.route('/api/containers', containersRouter);

// Start cleanup job
startCleanupJob();

const port = Number(process.env['PORT'] ?? 2222);
serve({ fetch: app.fetch, port }, () => {
  console.log(JSON.stringify({ level: 'info', message: `API running on port ${port}`, timestamp: new Date().toISOString() }));
});

export default app;
