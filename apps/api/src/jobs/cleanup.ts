import { lt, eq, and } from 'drizzle-orm';
import { db, containers } from '../db';
import { deprovisionContainer } from '../services/docker';
import { removeContainerRoutes } from '../services/caddy';
import { deleteDnsRecord } from '../services/cloudflare';

export function startCleanupJob(): void {
  const INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    try {
      const expired = await db.select().from(containers).where(
        and(
          eq(containers.subscription_status, 'grace_period'),
          lt(containers.deletion_scheduled_at, new Date())
        )
      );

      for (const container of expired) {
        try {
          await deprovisionContainer(container.subdomain, true);
          await removeContainerRoutes(container.subdomain);
          await deleteDnsRecord(container.subdomain);
          await db.update(containers).set({ subscription_status: 'deleted' }).where(eq(containers.id, container.id));
          console.log(JSON.stringify({ level: 'info', message: 'Container deprovisioned', subdomain: container.subdomain }));
        } catch (err) {
          console.log(JSON.stringify({ level: 'error', message: 'Cleanup failed for container', subdomain: container.subdomain, error: String(err) }));
        }
      }
    } catch (err) {
      console.log(JSON.stringify({ level: 'error', message: 'Cleanup job failed', error: String(err) }));
    }
  }, INTERVAL);

  console.log(JSON.stringify({ level: 'info', message: 'Cleanup job started (24h interval)' }));
}
