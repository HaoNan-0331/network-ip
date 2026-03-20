import type { ARPEntry } from '../../shared/types/arp';

/**
 * ARP 表解析器
 * 支持华为、华三(H3C)、锐捷、思科设备
 */
export class ARPParser {
  /**
   * 解析华三(H3C)设备 ARP 表
   * 格式:
   * IP address      MAC address    VLAN/VSI name Interface                Aging Type
   * 192.168.56.1    0a00-2700-0019 1             GE1/0/5                  1200  D
   */
  /**
   * 解析华三(H3C)设备 ARP 表
   * 格式与华为类似:
   * IP address      MAC address    VLAN/VSI name Interface                Aging Type
   * 192.168.56.1    0a00-2700-0019 1             GE1/0/5                  1200  D
   */
  static parseH3C(output: string): ARPEntry[] {
    // 预处理：移除多余的 "true" 字符串，处理各种换行符
    let cleanOutput = output
      .replace(/true/g, '\n')  // 将 "true" 替换为换行
      .replace(/\r\n/g, '\n')  // 统一换行符
      .replace(/\r/g, '\n');   // 处理旧 Mac 换行符

    const lines = cleanOutput.split('\n');
    const entries: ARPEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过空行、表头、分隔线、类型说明
      if (!line || /IP\s*address/i.test(line) || /Type:/i.test(line) || /^[-=]+$/.test(line)) {
        continue;
      }

      // 检查是否是数据行（以 IP 地址开头）
      const parts = line.split(/\s+/);
      if (parts.length >= 2 && this.isValidIP(parts[0])) {
        const ip = parts[0];
        const mac = parts[1];

        // 验证 MAC 地址
        if (this.isValidMAC(mac)) {
          // 华三/华为格式 - 智能检测各字段
          let interfaceName: string | undefined;
          let type: string | undefined;
          let vlan: string | undefined;
          let aging: number | undefined;

          // 遍历剩余部分
          for (let j = 2; j < parts.length; j++) {
            // VLAN 字段 - 纯数字，1-4094
            if (/^\d{1,4}$/.test(parts[j]) && vlan === undefined && parseInt(parts[j]) <= 4094) {
              vlan = parts[j];
              continue;
            }
            // Aging 字段 - 数字（老化时间）
            if (/^\d+$/.test(parts[j]) && aging === undefined && parseInt(parts[j]) > 4094) {
              aging = parseInt(parts[j]);
              continue;
            }
            // TYPE 字段 - D, S, I, D-0, S-0 等
            if (/^[DSI]-?\d*$/i.test(parts[j]) && type === undefined) {
              type = parts[j];
              continue;
            }
            // INTERFACE 字段 - 包含 GE, Vlanif, Eth, BAG 等关键字
            if (/^(GE|XG|Eth|Vlanif|Loop|NULL|BAG|Gig|Ten)/i.test(parts[j])) {
              interfaceName = parts[j];
              continue;
            }
          }

          // 检查下一行是否是 VLAN 信息（单独的数字行）
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (/^\d{1,4}$/.test(nextLine) && parseInt(nextLine) <= 4094 && !vlan) {
              vlan = nextLine;
              i++; // 跳过下一行
            }
          }

          entries.push({
            ip,
            mac: this.normalizeMAC(mac),
            interface: interfaceName,
            vlan,
            aging,
            type,
          });
        }
      }
    }

    return entries;
  }

  /**
   * 解析华为设备 ARP 表
   * 格式（跨行）:
   * IP ADDRESS      MAC ADDRESS     EXPIRE(M) TYPE INTERFACE      VPN-INSTANCE
   *                                           VLAN
   * 222.222.222.2   c4b8-b454-a170            I -  Vlanif222
   * 10.7.8.250      a0a3-3b45-6b5c  14        D-0  GE0/0/23
   *                                           1008
   */
  static parseHuawei(output: string): ARPEntry[] {
    // 预处理：移除多余的 "true" 字符串，处理各种换行符
    let cleanOutput = output
      .replace(/true/g, '\n')  // 将 "true" 替换为换行
      .replace(/\r\n/g, '\n')  // 统一换行符
      .replace(/\r/g, '\n');   // 处理旧 Mac 换行符

    const lines = cleanOutput.split('\n');
    const entries: ARPEntry[] = [];

    console.log(`[HuaweiParser] Total lines after preprocessing: ${lines.length}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过空行、表头、分隔线
      if (!line || /IP\s*ADDRESS/i.test(line) || /VLAN/i.test(line) || /^[-=]+$/.test(line)) {
        continue;
      }

      // 检查是否是数据行（以 IP 地址开头）
      const parts = line.split(/\s+/);
      console.log(`[HuaweiParser] Line ${i}: parts=${JSON.stringify(parts.slice(0, 6))}`);

      if (parts.length >= 2 && this.isValidIP(parts[0])) {
        const ip = parts[0];
        const mac = parts[1];

        console.log(`[HuaweiParser] Found IP: ${ip}, MAC: ${mac}, isValidMAC: ${this.isValidMAC(mac)}`);

        // 验证 MAC 地址
        if (this.isValidMAC(mac)) {
          // 华为格式分析:
          // parts[0]: IP
          // parts[1]: MAC
          // parts[2]: EXPIRE(M) - 可能是数字或空
          // parts[3]: TYPE 第1部分 (I 或 D-0)
          // parts[4]: TYPE 第2部分 (- 或 空) 或 INTERFACE
          // parts[5]或更后: INTERFACE

          // 找到 INTERFACE 字段 - 通常是 GE0/0/X 或 VlanifXXX 格式
          let interfaceName: string | undefined;
          let type: string | undefined;
          let aging: number | undefined;

          // 遍历剩余部分找接口名
          for (let j = 2; j < parts.length; j++) {
            // EXPIRE 字段 - 数字
            if (/^\d+$/.test(parts[j]) && aging === undefined) {
              aging = parseInt(parts[j]);
              continue;
            }
            // TYPE 字段 - I, D-0, S 等
            if (/^[IDS]-?\d*$/i.test(parts[j]) && type === undefined) {
              type = parts[j];
              continue;
            }
            // INTERFACE 字段 - 包含 GE, Vlanif, Eth 等关键字
            if (/^(GE|XG|Eth|Vlanif|Loop|NULL)/i.test(parts[j])) {
              interfaceName = parts[j];
              break;
            }
          }

          // 检查下一行是否是 VLAN 信息（以数字开头，只有一列）
          let vlan: string | undefined;
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // 如果下一行只是数字（VLAN ID），则读取
            if (/^\d+$/.test(nextLine) && nextLine.length <= 4) {
              vlan = nextLine;
              i++; // 跳过下一行
            }
          }

          console.log(`[HuaweiParser] Adding entry: ip=${ip}, mac=${mac}, interface=${interfaceName}`);

          entries.push({
            ip,
            mac: this.normalizeMAC(mac),
            interface: interfaceName,
            vlan,
            aging,
            type,
          });
        } else {
          console.log(`[HuaweiParser] Invalid MAC format: ${mac}`);
        }
      }
    }

    console.log(`[HuaweiParser] Total entries parsed: ${entries.length}`);
    return entries;
  }

  /**
   * 解析思科设备 ARP 表
   * 格式:
   * Protocol  Address          Age (min)  Hardware Addr   Type   Interface
   * Internet  192.168.1.1           0     0001.0203.0405  ARPA   GigabitEthernet0/0
   */
  static parseCisco(output: string): ARPEntry[] {
    const lines = output.split('\n');
    const entries: ARPEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过空行和表头
      if (!trimmed || /Protocol|Address/i.test(trimmed)) {
        continue;
      }

      // 思科格式: Protocol IP Age MAC Type Interface
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4 && parts[0] === 'Internet' && this.isValidIP(parts[1])) {
        const mac = parts[3];
        if (this.isValidMAC(mac)) {
          entries.push({
            ip: parts[1],
            mac: this.normalizeMAC(mac),
            interface: parts[5] || undefined,
            aging: parts[2] !== '-' ? parseInt(parts[2]) || undefined : undefined,
          });
        }
      }
    }

    return entries;
  }

  /**
   * 解析锐捷设备 ARP 表
   * 格式与思科类似
   */
  static parseRuijie(output: string): ARPEntry[] {
    // 锐捷格式通常与思科类似
    return this.parseCisco(output);
  }

  /**
   * 通用解析器
   */
  private static parseGeneric(
    output: string,
    columns: { ip: number; mac: number; vlan?: number; interface?: number; aging?: number; type?: number }
  ): ARPEntry[] {
    const lines = output.split('\n');
    const entries: ARPEntry[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过空行和表头
      if (!trimmed || /IP\s*address/i.test(trimmed) || /Type:/i.test(trimmed)) {
        continue;
      }

      const parts = trimmed.split(/\s+/);
      if (parts.length > Math.max(columns.ip, columns.mac)) {
        const ip = parts[columns.ip];
        const mac = parts[columns.mac];

        if (this.isValidIP(ip) && this.isValidMAC(mac)) {
          entries.push({
            ip,
            mac: this.normalizeMAC(mac),
            vlan: columns.vlan !== undefined ? parts[columns.vlan] : undefined,
            interface: columns.interface !== undefined ? parts[columns.interface] : undefined,
            aging: columns.aging !== undefined ? parseInt(parts[columns.aging]) || undefined : undefined,
            type: columns.type !== undefined ? parts[columns.type] : undefined,
          });
        }
      }
    }

    return entries;
  }

  /**
   * 根据厂商类型解析
   */
  static parse(output: string, vendor: string): ARPEntry[] {
    console.log(`[ARPParser] Parsing for vendor: ${vendor}`);
    console.log(`[ARPParser] Output preview: ${output.substring(0, 300)}`);

    let entries: ARPEntry[];
    switch (vendor.toLowerCase()) {
      case 'h3c':
        entries = this.parseH3C(output);
        break;
      case 'huawei':
        entries = this.parseHuawei(output);
        break;
      case 'cisco':
        entries = this.parseCisco(output);
        break;
      case 'ruijie':
        entries = this.parseRuijie(output);
        break;
      default:
        console.warn(`[ARPParser] Unknown vendor: ${vendor}, trying H3C format`);
        entries = this.parseH3C(output);
    }

    console.log(`[ARPParser] Parsed ${entries.length} entries for ${vendor}`);
    return entries;
  }

  /**
   * 验证 IP 地址格式
   */
  private static isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  /**
   * 验证 MAC 地址格式
   */
  private static isValidMAC(mac: string): boolean {
    // 支持格式:
    // 00:01:02:03:04:05 (冒号分隔)
    // 00-01-02-03-04-05 (连字符分隔，每2个字符)
    // 0a00-2700-0019 (华三格式，连字符分隔，每4个字符)
    // 0001.0203.0405 (思科格式，点分隔)
    // 000102030405 (无分隔符)
    const macPatterns = [
      /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/,      // 00:01:02:03:04:05 或 00-01-02-03-04-05
      /^([0-9A-Fa-f]{4}[-]){2}[0-9A-Fa-f]{4}$/,       // 0a00-2700-0019 (华三)
      /^([0-9A-Fa-f]{4}[.]){2}[0-9A-Fa-f]{4}$/,       // 0001.0203.0405 (思科)
      /^[0-9A-Fa-f]{12}$/,                             // 000102030405
    ];
    return macPatterns.some((pattern) => pattern.test(mac));
  }

  /**
   * 标准化 MAC 地址为冒号分隔的小写格式
   */
  private static normalizeMAC(mac: string): string {
    // 移除所有分隔符
    const clean = mac.replace(/[-.:]/g, '').toLowerCase();

    // 每2个字符插入冒号
    return clean.match(/.{2}/g)?.join(':') || mac;
  }
}
