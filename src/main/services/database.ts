import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = path.join(app.getPath('userData'), 'network-ip.db');
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create devices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT NOT NULL UNIQUE,
      vendor TEXT NOT NULL CHECK(vendor IN ('huawei', 'h3c', 'ruijie', 'cisco')),
      protocol TEXT NOT NULL CHECK(protocol IN ('ssh', 'telnet')),
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unknown' CHECK(status IN ('online', 'offline', 'unknown')),
      last_checked DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

    -- ARP entries table
    CREATE TABLE IF NOT EXISTS arp_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL,
      vlan TEXT,
      interface TEXT,
      collected_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_arp_entries_ip ON arp_entries(ip);
    CREATE INDEX IF NOT EXISTS idx_arp_entries_mac ON arp_entries(mac);
    CREATE INDEX IF NOT EXISTS idx_arp_entries_device ON arp_entries(device_id);
    CREATE INDEX IF NOT EXISTS idx_arp_entries_collected ON arp_entries(collected_at);

    -- Network segments table
    CREATE TABLE IF NOT EXISTS network_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      network TEXT NOT NULL,
      mask TEXT NOT NULL,
      cidr INTEGER NOT NULL,
      gateway TEXT,
      description TEXT,
      is_auto_discovered INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_network_segments_network ON network_segments(network);
    CREATE INDEX IF NOT EXISTS idx_network_segments_cidr ON network_segments(cidr);

    -- IP-MAC binding history (for change detection)
    CREATE TABLE IF NOT EXISTS ip_mac_bindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL,
      first_seen DATETIME NOT NULL,
      last_seen DATETIME NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(ip, mac)
    );

    CREATE INDEX IF NOT EXISTS idx_ip_mac_bindings_ip ON ip_mac_bindings(ip);
    CREATE INDEX IF NOT EXISTS idx_ip_mac_bindings_mac ON ip_mac_bindings(mac);
    CREATE INDEX IF NOT EXISTS idx_ip_mac_bindings_active ON ip_mac_bindings(is_active);

    -- IP-MAC change events
    CREATE TABLE IF NOT EXISTS ip_mac_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      old_mac TEXT,
      new_mac TEXT,
      change_type TEXT NOT NULL CHECK(change_type IN ('mac_changed', 'new_ip', 'ip_reused')),
      detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      acknowledged_at DATETIME,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ip_mac_changes_ip ON ip_mac_changes(ip);
    CREATE INDEX IF NOT EXISTS idx_ip_mac_changes_detected ON ip_mac_changes(detected_at);
    CREATE INDEX IF NOT EXISTS idx_ip_mac_changes_ack ON ip_mac_changes(acknowledged);

    -- Excluded IPs (skip anomaly detection)
    CREATE TABLE IF NOT EXISTS excluded_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_or_cidr TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_excluded_ips_ip ON excluded_ips(ip_or_cidr);

    -- OUI (MAC vendor) database
    CREATE TABLE IF NOT EXISTS oui_database (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oui_prefix TEXT NOT NULL UNIQUE,
      vendor_name TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_oui_prefix ON oui_database(oui_prefix);
    CREATE INDEX IF NOT EXISTS idx_oui_vendor ON oui_database(vendor_name);

    -- IP status table (tracks current status of each IP)
    CREATE TABLE IF NOT EXISTS ip_status (
      ip TEXT PRIMARY KEY,
      mac TEXT,
      status TEXT NOT NULL DEFAULT 'used' CHECK(status IN ('used', 'deprecated')),
      first_seen DATETIME NOT NULL,
      last_seen DATETIME NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ip_status_status ON ip_status(status);
  `);

  // Initialize default OUI data if empty
  initDefaultOUIData(db);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 重置数据库 - 删除所有数据并重新初始化
 */
export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
  // 下次调用initDatabase()时会重新创建所有表
}

/**
 * Initialize default OUI data from common network device vendors
 */
function initDefaultOUIData(database: Database.Database): void {
  const count = database.prepare('SELECT COUNT(*) as count FROM oui_database').get() as { count: number };
  if (count.count > 0) return;

  // Common network device vendors
  const defaultOUIs: [string, string][] = [
    // Huawei
    ['00E0FC', 'Huawei'], ['002568', 'Huawei'], ['00E0F6', 'Huawei'], ['001E10', 'Huawei'],
    ['001C0E', 'Huawei'], ['00259C', 'Huawei'], ['7C6097', 'Huawei'], ['7CA23E', 'Huawei'],
    ['94772B', 'Huawei'], ['A0A33B', 'Huawei'], ['B4FBE4', 'Huawei'], ['C4B8B4', 'Huawei'],
    ['CC08FB', 'Huawei'], ['D0DFC6', 'Huawei'], ['E0247F', 'Huawei'], ['F0DA60', 'Huawei'],
    ['FC8CC1', 'Huawei'], ['00259B', 'Huawei'],

    // H3C
    ['000FE2', 'H3C'], ['001EC1', 'H3C'], ['001FD5', 'H3C'], ['001FD4', 'H3C'],
    ['001FC9', 'H3C'], ['00259E', 'H3C'], ['C4CAD9', 'H3C'], ['D4E6B7', 'H3C'],

    // Cisco
    ['00000C', 'Cisco'], ['000163', 'Cisco'], ['0001C7', 'Cisco'], ['0001C9', 'Cisco'],
    ['00022B', 'Cisco'], ['000430', 'Cisco'], ['0004C1', 'Cisco'], ['000530', 'Cisco'],
    ['0005DC', 'Cisco'], ['000608', 'Cisco'], ['00070D', 'Cisco'], ['0007EB', 'Cisco'],
    ['00085A', 'Cisco'], ['0008E4', 'Cisco'], ['000943', 'Cisco'], ['000B46', 'Cisco'],
    ['000C30', 'Cisco'], ['000D28', 'Cisco'], ['000D65', 'Cisco'], ['000F23', 'Cisco'],
    ['001217', 'Cisco'], ['001340', 'Cisco'], ['0013C4', 'Cisco'], ['0014A2', 'Cisco'],
    ['00159B', 'Cisco'], ['0016C9', 'Cisco'], ['00179A', 'Cisco'], ['0018BA', 'Cisco'],
    ['001902', 'Cisco'], ['0019AA', 'Cisco'], ['001A2F', 'Cisco'], ['001B54', 'Cisco'],
    ['001C0E', 'Cisco'], ['001C58', 'Cisco'], ['001D45', 'Cisco'], ['001D70', 'Cisco'],
    ['001E10', 'Cisco'], ['001E49', 'Cisco'], ['001EE5', 'Cisco'], ['001F14', 'Cisco'],
    ['00214B', 'Cisco'], ['002290', 'Cisco'], ['00234E', 'Cisco'], ['0024F7', 'Cisco'],
    ['6073B2', 'Cisco'],

    // Ruijie
    ['001AA9', 'Ruijie'], ['001422', 'Ruijie'], ['002496', 'Ruijie'],
    ['002662', 'Ruijie'], ['C076AD', 'Ruijie'],

    // VMware
    ['000569', 'VMware'], ['000C29', 'VMware'], ['001C14', 'VMware'], ['005056', 'VMware'],

    // VirtualBox
    ['0A0027', 'VirtualBox'],

    // Intel
    ['001111', 'Intel'], ['0012F0', 'Intel'], ['001517', 'Intel'], ['00166F', 'Intel'],
    ['0018DE', 'Intel'], ['001E64', 'Intel'], ['0050F1', 'Intel'], ['00A0C9', 'Intel'],

    // Realtek
    ['000E35', 'Realtek'], ['0014A5', 'Realtek'], ['001860', 'Realtek'], ['00E04C', 'Realtek'],

    // Broadcom
    ['000D54', 'Broadcom'], ['001018', 'Broadcom'], ['0020ED', 'Broadcom'], ['00E06E', 'Broadcom'],

    // Apple
    ['000393', 'Apple'], ['001124', 'Apple'], ['0017F2', 'Apple'], ['001E52', 'Apple'],
    ['002312', 'Apple'], ['0050E4', 'Apple'], ['041E64', 'Apple'], ['109ADD', 'Apple'],

    // Samsung
    ['000BEE', 'Samsung'], ['0011F6', 'Samsung'], ['0017C3', 'Samsung'], ['00E09B', 'Samsung'],

    // TP-Link
    ['00310E', 'TP-Link'], ['0C8039', 'TP-Link'], ['14CC20', 'TP-Link'], ['188B45', 'TP-Link'],
    ['1C3BF3', 'TP-Link'], ['200A0D', 'TP-Link'], ['50BD5F', 'TP-Link'], ['9C2169', 'TP-Link'],

    // ZTE
    ['001CC3', 'ZTE'], ['001E73', 'ZTE'], ['002276', 'ZTE'], ['002655', 'ZTE'],
    ['081F71', 'ZTE'], ['2013E0', 'ZTE'], ['68DBCA', 'ZTE'],

    // Juniper
    ['0017CB', 'Juniper'], ['001F12', 'Juniper'], ['00223E', 'Juniper'], ['00E04F', 'Juniper'],

    // Aruba
    ['001A1E', 'Aruba'], ['24DE9F', 'Aruba'], ['94B400', 'Aruba'], ['D4E6B7', 'Aruba'],

    // Fortinet
    ['001709', 'Fortinet'], ['00E06B', 'Fortinet'], ['906E3E', 'Fortinet'],

    // Dell
    ['0018F8', 'Dell'], ['00248C', 'Dell'], ['18FB7B', 'Dell'], ['5C266A', 'Dell'],

    // HP
    ['001708', 'HP'], ['0018FE', 'HP'], ['001E0B', 'HP'], ['00E07C', 'HP'],

    // Hikvision
    ['282C02', 'Hikvision'], ['44F920', 'Hikvision'], ['4C1117', 'Hikvision'],
    ['54C4AF', 'Hikvision'], ['685498', 'Hikvision'], ['80D443', 'Hikvision'],

    // Dahua
    ['3C8BE6', 'Dahua'], ['4C11AE', 'Dahua'], ['90F0EB', 'Dahua'], ['C06128', 'Dahua'],
  ];

  const insert = database.prepare('INSERT OR IGNORE INTO oui_database (oui_prefix, vendor_name) VALUES (?, ?)');
  for (const [prefix, vendor] of defaultOUIs) {
    insert.run(prefix, vendor);
  }

  console.log(`[Database] Initialized ${defaultOUIs.length} default OUI entries`);
}
