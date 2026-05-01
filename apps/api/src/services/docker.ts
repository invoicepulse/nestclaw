import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const SCRIPTS_PATH = process.env['HOST_SCRIPTS_PATH'] ?? '/opt/nestclaw/scripts';

interface ProvisionResult {
  terminal_port: number;
  webui_port: number | null;
  container_name: string;
}

export async function provisionContainer(
  userId: string,
  subdomain: string,
  agentType: string
): Promise<ProvisionResult> {
  const { stdout, stderr } = await execAsync(
    `sudo ${SCRIPTS_PATH}/provision.sh ${userId} ${subdomain} ${agentType}`,
    { timeout: 60000 }
  );
  if (!stdout.trim()) throw new Error(`Provision failed: ${stderr}`);
  return JSON.parse(stdout.trim()) as ProvisionResult;
}

export async function deprovisionContainer(subdomain: string, force = false): Promise<void> {
  const flag = force ? ' --force' : '';
  await execAsync(`sudo ${SCRIPTS_PATH}/deprovision.sh ${subdomain}${flag}`, { timeout: 30000 });
}

export async function getContainerStatus(containerName: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `sudo docker inspect --format='{{.State.Status}}' ${containerName}`,
      { timeout: 10000 }
    );
    return stdout.trim();
  } catch {
    return 'not_found';
  }
}
