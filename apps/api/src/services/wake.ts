import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const SCRIPTS_PATH = process.env['HOST_SCRIPTS_PATH'] ?? '/opt/nestclaw/scripts';

export async function wakeContainer(subdomain: string): Promise<{ status: string; wake_time_ms: number }> {
  try {
    const { stdout } = await execAsync(`${SCRIPTS_PATH}/wake-container.sh ${subdomain}`, { timeout: 15000 });
    return JSON.parse(stdout.trim()) as { status: string; wake_time_ms: number };
  } catch {
    return { status: 'error', wake_time_ms: 0 };
  }
}

export async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`docker inspect --format='{{.State.Status}}' ${containerName}`, { timeout: 5000 });
    return stdout.trim() === 'running';
  } catch {
    return false;
  }
}
