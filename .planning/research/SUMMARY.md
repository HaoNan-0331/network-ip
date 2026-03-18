# Project Research Summary

**Project:** Network IP/MAC Monitoring Desktop Application
**Domain:** Network Device Automation / IP Address Management (IPAM)
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a desktop application for network administrators to monitor IP/MAC address mappings across multi-vendor network infrastructure (Huawei, H3C, Ruijie, Cisco). Unlike traditional IP scanners that use ICMP/SNMP, this tool connects directly to switches and routers via SSH/Telnet to extract ARP table data, providing accurate IP-MAC mapping even in switched networks where ICMP-based discovery fails.

The recommended approach uses **Electron + Vue 3 + TypeScript** for the desktop application, with **ssh2/ssh2-promise** for device connections and **SQLite** for local storage. The architecture follows a layered pattern: Device Driver Abstraction for vendor-specific parsing, Connection Pool for SSH/Telnet management, and Event-driven IPC for scan progress feedback. This stack was chosen over Tauri because network device automation requires Node.js native modules (ssh2, telnet-client), and Windows webview compatibility varies across enterprise environments.

**Key risks:** Multi-vendor ARP output parsing fragility (each vendor has different CLI formats that can change with firmware updates), SSH/Telnet connection state mismanagement (network reliability issues), and credential storage security. These must be addressed in Phase 1 to avoid technical debt that blocks future development.

## Key Findings

### Recommended Stack

Electron is preferred over Tauri for this project because SSH/Telnet client libraries require Node.js native modules. The full Node.js runtime bundled with Electron simplifies network protocol handling compared to invoking Node from Tauri's Rust backend.

**Core technologies:**
- **Electron 34.x**: Desktop framework with bundled Node.js 20.x — required for ssh2/telnet-client native modules
- **Vue 3.4.x + TypeScript 5.x**: Frontend framework — strong Chinese community, excellent for admin dashboards
- **ssh2 + ssh2-promise**: SSH2 client with async/await wrapper — pure JS, actively maintained, connection caching
- **SQLite (better-sqlite3)**: Local storage — ACID guarantees, relational queries for devices/segments/alerts
- **Element Plus 2.5.x**: UI components — dominates Chinese Vue 3 market, ideal for admin systems
- **Pinia 2.x**: State management — official Vue 3 recommendation, TypeScript-first

### Expected Features

**Must have (table stakes):**
- Device Management (CRUD) — basic inventory management
- SSH/Telnet Protocol Support — connect to legacy and modern devices
- Multi-Vendor ARP Collection (Huawei, H3C, Ruijie, Cisco) — core data collection
- IP/MAC Address Discovery — primary value proposition
- Subnet Auto-Discovery + Manual Config — organize IPs into networks
- IP Usage Statistics (per subnet) — key metric users need
- Table View with Sorting/Filtering — data exploration
- Device Connection Status — know which devices are reachable

**Should have (competitive):**
- IP-MAC Change Detection — detect IP conflicts, MAC spoofing, device changes
- Visual Anomaly Alerting — highlight changes in UI
- Scheduled Auto-Scan — automated monitoring
- Export to CSV — documentation needs
- Vendor Identification (MAC OUI) — quick value-add

**Defer (v2+):**
- Multi-Device Parallel Scanning — performance optimization for large networks
- Topology Visualization — significant UI investment
- Historical Snapshot Comparison — requires storage strategy
- Custom Dashboard — advanced personalization

### Architecture Approach

Layered architecture with clear separation between presentation (Vue 3 in Electron webview), application logic (Node.js main process), and data persistence (SQLite). Device Driver Abstraction pattern isolates vendor-specific parsing logic behind a common trait/interface, enabling clean extensibility for new vendors.

**Major components:**
1. **Device Driver Layer** — vendor-specific ARP command generation and output parsing (Strategy pattern)
2. **Connection Pool Service** — SSH/Telnet connection management with health checks and retry logic
3. **Scanner Orchestrator** — coordinates device scanning, emits progress events to frontend
4. **Anomaly Detector** — compares current vs previous ARP data to detect IP-MAC changes
5. **SQLite Repository** — device configuration, scan results, alerts persistence

### Critical Pitfalls

1. **Multi-Vendor ARP Output Parsing Fragility** — Each vendor uses different CLI output formats; firmware updates can break parsers. Use vendor-specific parser classes with common interface; store raw output for debugging.

2. **SSH/Telnet Connection State Mismanagement** — Network connections are unreliable; sessions drop unexpectedly. Implement connection pooling with health checks, SSH keepalive, timeout handling at every layer, exponential backoff retry logic.

3. **Credential Storage Security** — Storing credentials in plain text is a security vulnerability. Use Electron's `safeStorage` API or OS-native keychain for secure credential storage.

4. **IP Conflict Detection False Positives** — DHCP lease renewal and load balancing cause legitimate MAC changes. Implement cooldown period, whitelist capability, differentiate "MAC changed" vs "multiple MACs claiming same IP".

5. **Concurrent Device Connection Scalability** — Sequential scanning is too slow for 50+ devices; unlimited parallelism hits OS limits. Implement connection pool with configurable concurrency limit (5-10 concurrent).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Infrastructure & Device Management
**Rationale:** Foundation layer — must establish project structure, database schema, and secure credential handling before any network operations. Device management is a prerequisite for scanning.
**Delivers:** Working desktop app with device CRUD, secure credential storage, database setup
**Addresses:** Device Management, SSH/Telnet Protocol Support
**Avoids:** Credential Storage Security pitfall, Blocking the Main Thread pitfall

### Phase 2: Device Connection & ARP Collection
**Rationale:** Core value proposition — requires Phase 1 infrastructure. Connection handling and vendor-specific parsing must be architected correctly to avoid technical debt.
**Delivers:** Multi-vendor ARP collection from configured devices
**Addresses:** Multi-Vendor ARP Collection, IP/MAC Address Discovery, Device Connection Status
**Avoids:** Multi-Vendor ARP Parsing Fragility, SSH/Telnet Connection State Mismanagement, Concurrent Scalability pitfalls
**Uses:** ssh2/ssh2-promise, telnet-client

### Phase 3: Data Organization & Visualization
**Rationale:** Raw ARP data needs organization and display. Depends on Phase 2 data collection.
**Delivers:** Subnet organization, IP usage statistics, data tables with sorting/filtering
**Addresses:** Subnet Display, IP Usage Statistics, Table View
**Implements:** SQLite queries, Element Plus tables, ECharts visualization

### Phase 4: Anomaly Detection & Alerting
**Rationale:** Value-add feature that differentiates from basic scanners. Requires historical scan data from Phase 2-3.
**Delivers:** IP-MAC change detection, visual alerts, scheduled scanning
**Addresses:** IP-MAC Change Detection, Visual Anomaly Alerting, Scheduled Auto-Scan
**Avoids:** IP Conflict Detection False Positives pitfall

### Phase 5: Export & Polish
**Rationale:** Final v1 features for production readiness.
**Delivers:** CSV export, MAC OUI vendor identification, error handling refinement
**Addresses:** Export to CSV, Vendor Identification

### Phase Ordering Rationale

- **Phase 1 first:** Device management and credential storage are prerequisites for all network operations
- **Phase 2 second:** Core data collection capability; connection architecture must be correct from start
- **Phase 3 third:** Data organization depends on having data to organize
- **Phase 4 fourth:** Anomaly detection requires baseline scan data to compare against
- **Phase 5 last:** Polish features for production readiness

This ordering avoids critical pitfalls by:
- Addressing credential security in Phase 1 (not retrofitting later)
- Designing multi-vendor parsing architecture in Phase 2 (not hacking single-vendor code)
- Implementing connection pooling and concurrency in Phase 2 (not after scaling issues appear)
- Adding false-positive mitigation in Phase 4 (before users experience alert fatigue)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Vendor-specific ARP output formats require actual device samples for regex/parser development. Consider `/gsd:research-phase` for each vendor's parsing logic.
- **Phase 4:** Anomaly detection algorithms (cooldown, confidence scoring) may need domain-specific research.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Electron Forge project setup, Vue 3 + Element Plus CRUD patterns are well-documented
- **Phase 3:** Data visualization with ECharts, table filtering/sorting are standard implementations
- **Phase 5:** CSV export, OUI lookup are straightforward features

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official documentation verified for Electron 34, Vue 3, ssh2, Element Plus |
| Features | MEDIUM | Based on competitor analysis and IPAM feature guides; may need user validation |
| Architecture | HIGH | Tauri/Electron IPC patterns, layered architecture, driver abstraction are well-documented |
| Pitfalls | MEDIUM | WebSearch-based with domain expertise; actual device testing may reveal additional edge cases |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Actual device output samples:** ARP output format research was based on documentation; actual device testing needed to validate parsers. Handle during Phase 2 implementation with real device access.
- **Performance benchmarks:** Scalability thresholds (50+ devices) are estimates; actual testing needed. Monitor during Phase 2 and optimize connection pool limits.
- **False positive thresholds:** Cooldown periods and confidence scoring for anomaly detection need tuning based on real network behavior. Iterate during Phase 4 based on user feedback.

## Sources

### Primary (HIGH confidence)
- [Electron 34 Release Notes](https://electronjs.org/blog/electron-34-0) — Electron features and bundled Node.js version
- [ssh2 npm package](https://www.npmjs.com/package/ssh2) — SSH2 library documentation
- [Element Plus Documentation](https://element-plus.org/) — Vue 3 UI library
- [Electron Forge Documentation](https://www.electronforge.io/) — Official packaging tool
- [Tauri v2 Documentation](https://v2.tauri.app/) — IPC patterns, project structure (pattern reference)

### Secondary (MEDIUM confidence)
- [ssh2-promise npm package](https://www.npmjs.com/package/ssh2-promise) — Promise wrapper documentation
- [telnet-client npm package](https://www.npmjs.com/package/telnet-client) — Telnet client library
- [Vue Component Library Selection 2025](https://www.xinniyun.com/) — Element Plus market analysis
- [Electron Database Guide](https://rxdb.info/electron-database.html) — SQLite recommendations
- [ManageEngine: 10 Must-Have IPAM Features](https://www.manageengine.com/products/oputils/blog/) — Feature requirements
- [Auvik: What Is an ARP Table](https://www.auvik.com/franklyit/blog/what-is-an-arp-table/) — ARP table concepts
- [Cisco Learning Network - Network Automation Mistakes](https://learningnetwork.cisco.com/) — Pitfall patterns
- [Electron safeStorage API](https://electronjs.org/docs/latest/api/safe-storage) — Secure credential storage

### Tertiary (LOW confidence)
- [DevOps School: Top 10 IPAM Tools 2026](https://www.devopsschool.com/blog/) — Competitor analysis
- [SourceForge: IP Scanner Comparisons](https://sourceforge.net/software/compare/) — Feature comparison
- Community forum discussions on IP conflict false positives

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
