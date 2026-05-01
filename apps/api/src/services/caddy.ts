const CADDY_ADMIN_URL = process.env['CADDY_ADMIN_URL'] ?? 'http://localhost:2019';
const DOMAIN = process.env['DOMAIN'] ?? 'nestclaw.io';

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (i === retries - 1) throw new Error(`Caddy API error: ${res.status} ${await res.text()}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw new Error('Caddy API unreachable');
}

function makeRoute(host: string, port: number) {
  return {
    match: [{ host: [host] }],
    handle: [{
      handler: 'reverse_proxy',
      upstreams: [{ dial: `localhost:${port}` }],
    }],
  };
}

export async function addContainerRoutes(subdomain: string, terminalPort: number, webuiPort?: number): Promise<void> {
  const routesUrl = `${CADDY_ADMIN_URL}/config/apps/http/servers/srv0/routes`;
  const headers = { 'Content-Type': 'application/json' };

  await fetchWithRetry(routesUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(makeRoute(`terminal.${subdomain}.${DOMAIN}`, terminalPort)),
  });

  if (webuiPort) {
    await fetchWithRetry(routesUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(makeRoute(`ui.${subdomain}.${DOMAIN}`, webuiPort)),
    });
  }
}

export async function removeContainerRoutes(subdomain: string): Promise<void> {
  try {
    const res = await fetch(`${CADDY_ADMIN_URL}/config/apps/http/servers/srv0/routes`);
    if (!res.ok) return;
    const routes = (await res.json()) as Array<{ match?: Array<{ host?: string[] }> }>;
    for (let i = routes.length - 1; i >= 0; i--) {
      const hosts = routes[i]?.match?.[0]?.host ?? [];
      if (hosts.some((h) => h.includes(`${subdomain}.${DOMAIN}`))) {
        await fetch(`${CADDY_ADMIN_URL}/config/apps/http/servers/srv0/routes/${i}`, { method: 'DELETE' });
      }
    }
  } catch (err) {
    console.log(JSON.stringify({ level: 'error', message: 'Failed to remove Caddy routes', error: String(err) }));
  }
}
