import { Client } from 'ssh2';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
}

export class SSHService {
  private config: Required<SSHConfig>;

  constructor(config: SSHConfig) {
    this.config = {
      timeout: config.timeout ?? 10000,
      ...config,
    };
  }

  async connect(): Promise<Client> {
    console.log(`[SSH] Starting connection to ${this.config.host}:${this.config.port}`);

    return new Promise((resolve, reject) => {
      const client = new Client();

      const timeoutId = setTimeout(() => {
        console.error(`[SSH] Connection timeout after ${this.config.timeout}ms`);
        client.destroy();
        reject(new Error(`SSH connection timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      client.on('ready', () => {
        clearTimeout(timeoutId);
        console.log(`[SSH] Connected successfully to ${this.config.host}`);
        resolve(client);
      });

      client.on('error', (err) => {
        clearTimeout(timeoutId);
        console.error(`[SSH] Connection error:`, err.message);
        reject(err);
      });

      console.log(`[SSH] Connecting...`);
      client.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: this.config.timeout,
      });
    });
  }

  async executeCommand(client: Client, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        stream.on('data', (data: Buffer) => {
          output += data.toString();
        });
        stream.stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });
        stream.on('close', () => {
          resolve(output);
        });
        stream.on('error', reject);
      });
    });
  }

  async disconnect(client: Client): Promise<void> {
    console.log(`[SSH] Disconnecting...`);
    return new Promise((resolve) => {
      client.on('end', () => {
        console.log(`[SSH] Disconnected successfully`);
        resolve();
      });
      client.end();
    });
  }
}
