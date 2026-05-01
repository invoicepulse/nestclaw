const CF_API_TOKEN = process.env['CLOUDFLARE_API_TOKEN'] ?? '';
const CF_ZONE_ID = process.env['CLOUDFLARE_ZONE_ID'] ?? '';
const SERVER_IP = process.env['SERVER_IP'] ?? '';
const DOMAIN = process.env['DOMAIN'] ?? 'nestclaw.io';
const CF_BASE = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`;

async function cfFetch(url: string, options: RequestInit): Promise<Response> {
  for (let i = 0; i < 3; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json', ...options.headers },
      });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (i === 2) throw new Error(`Cloudflare API error: ${res.status}`);
    } catch (err) {
      if (i === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
    }
  }
  throw new Error('Cloudflare unreachable');
}

export async function createDnsRecord(subdomain: string): Promise<void> {
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    console.log(JSON.stringify({ level: 'warn', message: 'Cloudflare not configured, skipping DNS' }));
    return;
  }
  await cfFetch(CF_BASE, {
    method: 'POST',
    body: JSON.stringify({ type: 'A', name: `${subdomain}.${DOMAIN}`, content: SERVER_IP, ttl: 60, proxied: false }),
  });
}

export async function deleteDnsRecord(subdomain: string): Promise<void> {
  if (!CF_API_TOKEN || !CF_ZONE_ID) return;
  try {
    const res = await cfFetch(`${CF_BASE}?name=${subdomain}.${DOMAIN}`, { method: 'GET' });
    const data = (await res.json()) as { result: Array<{ id: string }> };
    for (const record of data.result) {
      await cfFetch(`${CF_BASE}/${record.id}`, { method: 'DELETE' });
    }
  } catch (err) {
    console.log(JSON.stringify({ level: 'error', message: 'Failed to delete DNS', error: String(err) }));
  }
}
