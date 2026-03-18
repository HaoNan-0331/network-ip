import { SshPromiseClient } from 'ssh2-promise';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
  retries?: number;
}

export class SSHService {
  private config: Required<SSHConfig>;

  constructor(config: SSHConfig) {
    this.config = {
      timeout: config.timeout ?? 10000,
      retries: config.retries ?? 3,
      ...config,
    };
  }

  async connect(): Promise<SshPromiseClient> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        const ssh = new SshPromiseClient({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: this.config.timeout,
        });

        await ssh.connect();
        return ssh;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async executeCommand(ssh: SshPromiseClient, command: string): Promise<string> {
    const result = await ssh.exec(command);
    return result;
  }

  async disconnect(ssh: SshPromiseClient): Promise<void> {
    await ssh.close();
  }
}
