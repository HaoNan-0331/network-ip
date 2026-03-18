# Architecture Research

**Domain:** Network IP/MAC Monitoring Desktop Application
**Researched:** 2026-03-18
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER (WebView)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard   │  │   Device     │  │   Segment    │  │    Alert     │    │
│  │   (Charts)    │  │   Manager    │  │   Viewer     │  │    Panel     │    │
│  └───────┬──────┘  └───────┬──────┘  └───────┬──────┘  └───────┬──────┘    │
│          │                 │                 │                 │            │
│          └─────────────────┴─────────────────┴─────────────────┘            │
│                                      │                                       │
│                          Tauri IPC (invoke/events)                          │
├──────────────────────────────────────┴───────────────────────────────────────┤
│                           APPLICATION LAYER (Rust)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Command Handlers                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Device    │  │    Scan     │  │   Segment   │  │    Alert    │  │   │
│  │  │  Commands   │  │  Commands   │  │  Commands   │  │  Commands   │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  └─────────┴────────────────┴────────────────┴────────────────┴─────────┘   │
│                                      │                                       │
├──────────────────────────────────────┴───────────────────────────────────────┤
│                            CORE SERVICES LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Connection     │  │   ARP Parser    │  │      Anomaly Detector       │  │
│  │  Manager        │  │   (Multi-Vendor)│  │      (IP-MAC Change)        │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
│           │                    │                          │                  │
│           └────────────────────┴──────────────────────────┘                  │
│                                      │                                       │
├──────────────────────────────────────┴───────────────────────────────────────┤
│                          DEVICE DRIVER ABSTRACTION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │   Huawei   │  │    H3C     │  │  Ruijie    │  │   Cisco    │             │
│  │   Driver   │  │   Driver   │  │  Driver    │  │   Driver   │             │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │
│        │               │               │               │                     │
│        └───────────────┴───────────────┴───────────────┘                     │
│                                  │                                           │
│                    ┌─────────────┴─────────────┐                             │
│                    │   Protocol Adapters       │                             │
│                    │  ┌────────┐  ┌────────┐   │                             │
│                    │  │  SSH   │  │ Telnet │   │                             │
│                    │  └────────┘  └────────┘   │                             │
│                    └───────────────────────────┘                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATA PERSISTENCE LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │     SQLite       │  │   Config Store   │  │    App State (Memory)    │   │
│  │   (tauri-plugin  │  │   (JSON/TOML)    │  │                          │   │
│  │       -sql)      │  │                  │  │                          │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Dashboard | Visualize IP usage by segment with charts | React/Vue components with ECharts or Chart.js |
| Device Manager | CRUD operations for network devices | Form components + IPC commands |
| Segment Viewer | Display IP/MAC data in tables | Data grid with sorting/filtering |
| Alert Panel | Show IP-MAC anomalies | Notification list with status indicators |
| Command Handlers | Route IPC calls to services | Tauri `#[tauri::command]` functions |
| Connection Manager | Establish/maintain device connections | russh + telnet crate with connection pooling |
| ARP Parser | Parse vendor-specific ARP output | Strategy pattern with regex per vendor |
| Anomaly Detector | Compare current vs previous ARP data | In-memory comparison logic |
| Device Drivers | Vendor-specific command generation | Trait-based abstraction |
| Protocol Adapters | SSH/Telnet protocol handling | russh (SSH) + bstr/telnet crate |

## Recommended Project Structure

```
network-ip/
├── src/                          # Frontend (WebView)
│   ├── components/
│   │   ├── dashboard/            # Charts and overview widgets
│   │   ├── devices/              # Device management forms
│   │   ├── segments/             # IP segment tables
│   │   └── alerts/               # Anomaly notifications
│   ├── hooks/                    # Custom React/Vue hooks
│   ├── stores/                   # State management (Zustand/Pinia)
│   ├── services/                 # IPC call wrappers
│   │   └── tauri.ts              # invoke() wrappers
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # Frontend utilities
│
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # Library root, command registration
│   │   ├── commands/             # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── device.rs         # Device CRUD commands
│   │   │   ├── scan.rs           # Scan trigger commands
│   │   │   ├── segment.rs        # Segment query commands
│   │   │   └── alert.rs          # Alert query commands
│   │   ├── services/             # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── connection.rs     # SSH/Telnet connection management
│   │   │   ├── scanner.rs        # ARP collection orchestrator
│   │   │   ├── parser.rs         # ARP output parsing
│   │   │   └── detector.rs       # Anomaly detection
│   │   ├── drivers/              # Vendor-specific implementations
│   │   │   ├── mod.rs
│   │   │   ├── traits.rs         # DeviceDriver trait definition
│   │   │   ├── huawei.rs         # Huawei ARP command + parser
│   │   │   ├── h3c.rs            # H3C/HP ARP command + parser
│   │   │   ├── ruijie.rs         # Ruijie ARP command + parser
│   │   │   └── cisco.rs          # Cisco ARP command + parser
│   │   ├── protocols/            # Protocol implementations
│   │   │   ├── mod.rs
│   │   │   ├── ssh.rs            # SSH client wrapper (russh)
│   │   │   └── telnet.rs         # Telnet client wrapper
│   │   ├── models/               # Data structures
│   │   │   ├── mod.rs
│   │   │   ├── device.rs         # Device entity
│   │   │   ├── arp_entry.rs      # ARP entry entity
│   │   │   ├── segment.rs        # Network segment entity
│   │   │   └── alert.rs          # Anomaly alert entity
│   │   ├── db/                   # Database operations
│   │   │   ├── mod.rs
│   │   │   └── operations.rs     # SQLite queries via tauri-plugin-sql
│   │   └── error.rs              # Custom error types
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── package.json
└── ...
```

### Structure Rationale

- **commands/**: Separates IPC handlers from business logic; each domain has its own module
- **services/**: Core business logic isolated from Tauri-specifics; testable independently
- **drivers/**: Vendor-specific implementations behind a common trait; easy to extend
- **protocols/**: Protocol abstraction allows swapping SSH/Telnet implementations
- **models/**: Shared data structures used across layers; serde-serializable for IPC

## Architectural Patterns

### Pattern 1: Device Driver Abstraction (Strategy Pattern)

**What:** Each network vendor has different ARP command syntax and output format. Use a trait to define common operations, with vendor-specific implementations.

**When to use:** When supporting multiple device vendors with different CLI syntaxes.

**Trade-offs:** Adds abstraction layer but enables clean extensibility for new vendors.

```rust
// drivers/traits.rs
#[async_trait]
pub trait DeviceDriver: Send + Sync {
    /// Get the command to retrieve ARP table
    fn get_arp_command(&self) -> &str;

    /// Parse ARP output into structured entries
    fn parse_arp_output(&self, output: &str) -> Result<Vec<ArpEntry>, ParseError>;

    /// Get vendor identifier
    fn vendor(&self) -> Vendor;
}

// drivers/huawei.rs
pub struct HuaweiDriver;

#[async_trait]
impl DeviceDriver for HuaweiDriver {
    fn get_arp_command(&self) -> &str {
        "display arp"
    }

    fn parse_arp_output(&self, output: &str) -> Result<Vec<ArpEntry>, ParseError> {
        // Huawei-specific regex parsing
        // Format: IP ADDRESS      MAC ADDRESS     INTERFACE
        let re = Regex::new(r"(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4})")?;
        // ...
    }

    fn vendor(&self) -> Vendor {
        Vendor::Huawei
    }
}
```

### Pattern 2: Connection Pool with Timeout

**What:** Maintain reusable SSH/Telnet connections with configurable timeouts and retry logic.

**When to use:** When frequently connecting to the same devices; avoids connection overhead.

**Trade-offs:** Adds complexity but significantly improves scan performance.

```rust
// services/connection.rs
pub struct ConnectionPool {
    connections: DashMap<DeviceId, Box<dyn DeviceConnection>>,
    config: PoolConfig,
}

impl ConnectionPool {
    pub async fn get_or_connect(&self, device: &Device) -> Result<ConnectionHandle, ConnectionError> {
        if let Some(conn) = self.connections.get(&device.id) {
            if conn.is_alive() {
                return Ok(ConnectionHandle::new(conn));
            }
        }

        // Create new connection
        let conn = match device.protocol {
            Protocol::Ssh => self.create_ssh_connection(device).await?,
            Protocol::Telnet => self.create_telnet_connection(device).await?,
        };

        self.connections.insert(device.id, conn);
        Ok(ConnectionHandle::new(self.connections.get(&device.id).unwrap()))
    }
}
```

### Pattern 3: Event-Driven Scan Progress

**What:** Emit events from Rust backend to frontend during long-running scans, enabling real-time UI updates.

**When to use:** When operations take longer than 100ms and user feedback is needed.

**Trade-offs:** Slightly more complex than blocking, but much better UX.

```rust
// commands/scan.rs
#[tauri::command]
pub async fn start_scan(
    app_handle: tauri::AppHandle,
    device_ids: Vec<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let total = device_ids.len();

    for (i, device_id) in device_ids.iter().enumerate() {
        // Process device...
        let entries = scan_device(&device_id, &state).await?;

        // Emit progress event
        app_handle.emit("scan-progress", ScanProgress {
            current: i + 1,
            total,
            device_id: device_id.clone(),
            entries_found: entries.len(),
        }).map_err(|e| e.to_string())?;
    }

    app_handle.emit("scan-complete", ()).map_err(|e| e.to_string())?;
    Ok(())
}
```

### Pattern 4: Repository Pattern for Data Access

**What:** Abstract database operations behind repository traits, making it easy to swap persistence mechanisms.

**When to use:** When you want clean separation between business logic and data access.

**Trade-offs:** More boilerplate, but enables easier testing and future migration.

```rust
// db/operations.rs
#[async_trait]
pub trait DeviceRepository {
    async fn get_all(&self) -> Result<Vec<Device>, DbError>;
    async fn get_by_id(&self, id: &str) -> Result<Option<Device>, DbError>;
    async fn save(&self, device: &Device) -> Result<(), DbError>;
    async fn delete(&self, id: &str) -> Result<(), DbError>;
}

pub struct SqliteDeviceRepository {
    db: Database,
}

#[async_trait]
impl DeviceRepository for SqliteDeviceRepository {
    async fn get_all(&self) -> Result<Vec<Device>, DbError> {
        sqlx::query_as!(Device, "SELECT * FROM devices")
            .fetch_all(&self.db)
            .await
            .map_err(DbError::from)
    }
    // ...
}
```

## Data Flow

### Scan Flow (Primary Operation)

```
[User Clicks "Scan"]
        |
        v
[Frontend: invoke('start_scan', deviceIds)]
        |
        v (IPC)
[Rust: scan command handler]
        |
        v
[Scanner Service: For each device]
        |
        +---> [Connection Pool: Get/create connection]
        |              |
        |              v
        |     [Protocol Adapter: Execute command]
        |              |
        |              v
        |     [Raw ARP output]
        |
        +---> [Driver: parse_arp_output()]
        |              |
        |              v
        |     [Vec<ArpEntry>]
        |
        v
[Detector: Compare with previous scan]
        |
        +---> [Generate alerts for IP-MAC changes]
        |
        v
[Emit 'scan-progress' events to frontend]
        |
        v
[Frontend: Update UI with progress/results]
```

### State Management

```
[Tauri Managed State (Rust)]
        |
        +---> AppState
        |       |-- ConnectionPool
        |       |-- CurrentScanResults (Arc<RwLock>)
        |       |-- DeviceConfig (loaded from DB)
        |
        v (via tauri::State in commands)

[Frontend Store (Zustand/Pinia)]
        |
        +---> devices: Device[]
        +---> segments: Segment[]
        +-- ---> currentScan: ScanStatus
        +---> alerts: Alert[]
        |
        v (persisted to SQLite via IPC)
```

### Key Data Flows

1. **Device Configuration Flow:** Frontend CRUD -> IPC -> Command -> Repository -> SQLite
2. **Scan Execution Flow:** Frontend trigger -> IPC -> Scanner -> ConnectionPool -> Device -> Parser -> Detector -> Events -> Frontend
3. **Alert Detection Flow:** During scan -> Compare current/previous ARP -> Generate Alert -> Store in memory -> Emit event
4. **Query Flow:** Frontend request -> IPC -> Command -> In-memory state or SQLite -> Return data

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 10-50 devices | Single-threaded scan is sufficient; in-memory state works well |
| 50-200 devices | Add concurrent scanning with tokio::join!; consider connection pooling |
| 200+ devices | Implement batch scanning with configurable parallelism; add scan cancellation |

### Scaling Priorities

1. **First bottleneck:** Sequential device scanning. Fix with async concurrent scanning using `futures::stream::buffer_unordered`
2. **Second bottleneck:** UI blocking during large data loads. Fix with pagination and virtual scrolling in tables

## Anti-Patterns

### Anti-Pattern 1: Blocking the Main Thread with SSH Operations

**What people do:** Execute SSH commands synchronously without async, freezing the UI.

**Why it's wrong:** Tauri commands run on async runtime by default, but blocking operations will still freeze the WebView.

**Do this instead:** Use async SSH library (russh) and ensure all I/O is properly awaited.

```rust
// BAD
#[tauri::command]
fn scan_device(device_id: String) -> Result<Vec<ArpEntry>, String> {
    let output = std::process::Command::new("ssh") // Blocks!
        .arg(&device.host)
        .output()
        .map_err(|e| e.to_string())?;
    // ...
}

// GOOD
#[tauri::command]
async fn scan_device(device_id: String, state: tauri::State<'_, AppState>) -> Result<Vec<ArpEntry>, String> {
    let conn = state.pool.get(&device_id).await?;
    let output = conn.execute_command("display arp").await?; // Non-blocking
    // ...
}
```

### Anti-Pattern 2: Storing Credentials in Plain Text

**What people do:** Save SSH passwords directly in SQLite or config files.

**Why it's wrong:** Credentials can be extracted if the machine is compromised.

**Do this instead:** Use OS credential storage (Windows Credential Manager, macOS Keychain) via tauri-plugin-stronghold or similar.

```rust
// Use tauri-plugin-stronghold for secure credential storage
// Or at minimum, encrypt with a key derived from user password
```

### Anti-Pattern 3: Hardcoding Vendor Commands

**What people do:** Embed vendor-specific commands directly in scanning logic.

**Why it's wrong:** Adding new vendor support requires modifying core scanning code.

**Do this instead:** Use the Driver trait pattern; vendor logic is isolated and pluggable.

### Anti-Pattern 4: Storing Full History

**What people do:** Keep all historical ARP data in SQLite.

**Why it's wrong:** Database grows unbounded; queries slow down over time.

**Do this instead:** Only store current state and alerts. Per project requirements, history is out of scope.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Network Devices (SSH) | russh async client | Supports SSH2 protocol; handle timeout gracefully |
| Network Devices (Telnet) | telnet crate or custom | Legacy devices only; no encryption |
| OS Credential Store | tauri-plugin-stronghold | Secure password storage |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Rust Core | Tauri IPC (invoke/events) | JSON serialization; async by default |
| Commands ↔ Services | Direct function calls | Services are stateless; state passed in |
| Services ↔ Drivers | Trait dynamic dispatch | `Box<dyn DeviceDriver>` |
| Services ↔ Protocols | Trait abstraction | `Box<dyn DeviceConnection>` |
| Services ↔ Database | Repository trait | SQL via tauri-plugin-sql |

## Build Order Implications

Based on dependencies, recommended implementation order:

1. **Phase 1: Core Infrastructure**
   - Project scaffolding (Tauri + frontend framework)
   - Database setup with tauri-plugin-sql
   - Basic IPC command pattern

2. **Phase 2: Device Management**
   - Device model and repository
   - Device CRUD commands
   - Device management UI

3. **Phase 3: Protocol Layer**
   - SSH client wrapper (russh)
   - Telnet client wrapper
   - Connection pool service

4. **Phase 4: Driver Layer**
   - DeviceDriver trait
   - Huawei driver (most common in target environment)
   - H3C driver
   - Ruijie driver
   - Cisco driver

5. **Phase 5: Scanning Service**
   - Scanner orchestrator
   - ARP parser integration
   - Progress event emission

6. **Phase 6: Anomaly Detection**
   - Detector service
   - Alert model
   - Alert storage and display

7. **Phase 7: Visualization**
   - Segment statistics calculation
   - Dashboard charts
   - Data tables with filtering

## Sources

- [Tauri v2 Documentation - Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/) - HIGH confidence
- [Tauri v2 Documentation - Inter-Process Communication](https://v2.tauri.app/concept/inter-process-communication/) - HIGH confidence
- [Tauri v2 Documentation - Project Structure](https://v2.tauri.app/start/project-structure/) - HIGH confidence
- [Tauri v2 SQL Plugin](https://v2.tauri.app/plugin/sql/) - HIGH confidence
- [russh GitHub Repository](https://github.com/warp-tech/russh) - HIGH confidence
- [NAPALM Multi-Vendor Abstraction](https://napalm.readthedocs.io/) - MEDIUM confidence (pattern reference)
- [PyATS ARP Table Parsing](https://networkjourney.com/day10-pyats-series-parsing-and-normalizing-arp-tables-multi-vendor-using-pyats-vendor-agnostic-python-for-network-engineer/) - MEDIUM confidence (pattern reference)
- [Network Automation SSH Libraries Comparison](https://codilime.com/blog/python-paramiko-and-netmiko-for-automation/) - MEDIUM confidence (pattern reference)

---
*Architecture research for: Network IP/MAC Monitoring Desktop Application*
*Researched: 2026-03-18*
