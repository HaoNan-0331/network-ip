import { Telnet } from 'telnet-client';

export interface TelnetConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
  loginPrompt?: string | RegExp;
  passwordPrompt?: string | RegExp;
  shellPrompt?: string | RegExp;
}

export class TelnetService {
  private config: Required<TelnetConfig>;

  constructor(config: TelnetConfig) {
    this.config = {
      timeout: config.timeout ?? 10000,
      // 华三设备可能用 Username: 或 login:
      loginPrompt: config.loginPrompt ?? /Username:|login:/i,
      passwordPrompt: config.passwordPrompt ?? /Password:/i,
      // 华三设备普通模式提示符是 <xxx>，特权模式是 #
      shellPrompt: config.shellPrompt ?? /[>#]/,
      ...config,
    };
  }

  async connect(): Promise<Telnet> {
    const connection = new Telnet();

    try {
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
        // 添加换行符处理
        newlineReplace: true,
      });

      return connection;
    } catch (error) {
      console.error('[Telnet] Connection error:', error);
      throw error;
    }
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
