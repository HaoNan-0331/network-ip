import { Telnet } from 'telnet-client';

export interface TelnetConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
  loginPrompt?: string;
  passwordPrompt?: string;
  shellPrompt?: string;
}

export class TelnetService {
  private config: Required<TelnetConfig>;

  constructor(config: TelnetConfig) {
    this.config = {
      timeout: config.timeout ?? 10000,
      loginPrompt: config.loginPrompt ?? 'Username:',
      passwordPrompt: config.passwordPrompt ?? 'Password:',
      shellPrompt: config.shellPrompt ?? '#',
      ...config,
    };
  }

  async connect(): Promise<Telnet> {
    const connection = new Telnet();

    await connection.connect({
      host: this.config.host,
      port: this.config.port,
      timeout: this.config.timeout,
      username: this.config.username,
      password: this.config.password,
      loginPrompt: this.config.loginPrompt,
      passwordPrompt: this.config.passwordPrompt,
      shellPrompt: this.config.shellPrompt,
      echoLines: 0,
      stripShellPrompt: true,
      execTimeout: this.config.timeout,
    });

    return connection;
  }

  async executeCommand(connection: Telnet, command: string): Promise<string> {
    const result = await connection.exec(command);
    return result;
  }

  async disconnect(connection: Telnet): Promise<void> {
    await connection.end();
    await connection.destroy();
  }
}
