# Feature Research

**Domain:** Network IP/MAC Monitoring Desktop Application
**Researched:** 2026-03-18
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Device Management (CRUD) | Basic inventory management is fundamental to any network tool | LOW | Add/Edit/Delete devices with IP, credentials, protocol selection |
| IP/MAC Address Discovery | Core value proposition - must discover devices on network | MEDIUM | Requires ARP table parsing from connected devices |
| Multi-Vendor Support | Enterprise networks have mixed vendor environments | MEDIUM | Huawei, H3C, Ruijie, Cisco - different command syntaxes |
| SSH/Telnet Protocol Support | Legacy and modern devices use different protocols | LOW | Protocol selection at device level |
| Subnet/Network Segmentation Display | Network admins organize by subnets | MEDIUM | Auto-discover or manually configure network segments |
| IP Usage Statistics | Knowing used/available IPs is the primary use case | MEDIUM | Per-subnet utilization display |
| Manual Scan Trigger | On-demand scanning for immediate updates | LOW | Button to trigger immediate ARP collection |
| Device Status Indicator | Know which devices are reachable/unreachable | LOW | Visual indicator (green/red) for connection status |
| Table View with Sorting/Filtering | Data exploration requires sortable tables | LOW | Standard data grid functionality |
| Export Results | Documentation and reporting needs | LOW | CSV/Excel export of scan results |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| IP-MAC Change Detection | Instantly detect IP conflicts, MAC spoofing, device changes | HIGH | Compare current vs previous scan, flag anomalies |
| Visual Anomaly Alerting | In-app alerts for suspicious changes (same IP, different MAC) | MEDIUM | Highlight changes in red, notification badge |
| Scheduled Auto-Scan | Automated monitoring without manual intervention | MEDIUM | Configurable scan intervals (hourly, daily, etc.) |
| Topology Visualization | Graphical representation of network structure | HIGH | Network map showing devices and connections |
| Vendor Identification from MAC | Know device manufacturer from OUI lookup | LOW | MAC OUI database integration |
| Multi-Device Parallel Scanning | Speed up data collection for 50+ device networks | MEDIUM | Concurrent SSH/Telnet sessions |
| Historical Snapshot Comparison | Compare two points in time | MEDIUM | Store snapshots, diff view (NOT full history database) |
| Custom Dashboard Widgets | Personalized view of key metrics | MEDIUM | Configurable charts and summaries |
| Dark Mode | Reduced eye strain for NOC environments | LOW | UI theme option |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full Historical Database | "We want to see trends over months/years" | Storage bloat, complexity increases, performance degrades, becomes a different product | Snapshot comparison only - store last N scans |
| Multi-User/Role-Based Access | "Multiple admins need access" | Adds authentication, session management, audit logging - significant complexity for single-user desktop app | Single-user mode; if needed later, add in v2 |
| Email/DingTalk/WeChat Notifications | "Alert us when something changes" | Requires SMTP/integration config, credential storage, rate limiting, delivery confirmation | In-app alerts only; user monitors dashboard |
| Cloud/SaaS Deployment | "Access from anywhere" | Network security (devices in internal network), credential exposure, infrastructure cost | Keep as local desktop app - direct network access |
| Real-Time Continuous Monitoring | "Live updates every second" | Unnecessary load on network devices, ARP tables don't change that frequently | Scheduled scans (5-15 min intervals) are sufficient |
| DHCP/DNS Integration | "Integrated DDI solution" | Significantly increases scope, requires server access, becomes enterprise IPAM product | ARP-based discovery only; out of scope for this tool |
| SNMP Support | "More detailed device info" | SNMP configuration is complex, community strings, MIBs - different problem domain | SSH/Telnet CLI commands are simpler for ARP data |

## Feature Dependencies

```
[IP-MAC Change Detection]
    └──requires──> [IP/MAC Address Discovery]
    └──requires──> [Scan Result Storage (previous state)]

[Scheduled Auto-Scan]
    └──requires──> [Device Management]
    └──requires──> [IP/MAC Address Discovery]

[Multi-Device Parallel Scanning]
    └──enhances──> [IP/MAC Address Discovery]
    └──requires──> [Device Management]

[Subnet Display]
    └──requires──> [IP/MAC Address Discovery]
    └──requires──> [Subnet Auto-Discovery OR Manual Config]

[Visual Anomaly Alerting]
    └──requires──> [IP-MAC Change Detection]

[Topology Visualization]
    └──requires──> [IP/MAC Address Discovery]
    └──requires──> [Subnet Display]
    └──conflicts──> [Simple/Lightweight Architecture]
```

### Dependency Notes

- **IP-MAC Change Detection requires IP/MAC Discovery + State Storage:** Cannot detect changes without baseline data from previous scans
- **Scheduled Auto-Scan requires Device Management:** Need devices configured before automation can run
- **Visual Anomaly Alerting requires Change Detection:** Alerts are based on detected anomalies
- **Topology Visualization conflicts with Simple Architecture:** Adds significant UI/UX complexity; defer to v2+

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [x] Device Management (CRUD) - Essential foundation; cannot use tool without devices configured
- [x] SSH/Telnet Protocol Support - Required to connect to devices
- [x] Multi-Vendor ARP Collection (Huawei, H3C, Ruijie, Cisco) - Core data collection capability
- [x] IP/MAC Address Discovery - Primary value proposition
- [x] Subnet Auto-Discovery + Manual Config - Organize discovered IPs into networks
- [x] IP Usage Statistics (per subnet) - Key metric users need
- [x] Table View with Basic Sorting/Filtering - Data exploration
- [x] Manual Scan Trigger - On-demand data refresh
- [x] Device Connection Status - Know which devices are reachable

### Add After Validation (v1.x)

Features to add once core is working.

- [x] IP-MAC Change Detection - High-value differentiator; detect conflicts/anomalies
- [x] Visual Anomaly Alerting - Highlight changes in UI
- [x] Scheduled Auto-Scan - Automation reduces manual work
- [x] Export to CSV - Documentation needs
- [x] Vendor Identification (MAC OUI) - Quick value-add

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-Device Parallel Scanning - Performance optimization for large networks
- [ ] Topology Visualization - Significant UI investment
- [ ] Historical Snapshot Comparison - Requires storage strategy
- [ ] Custom Dashboard - Advanced personalization
- [ ] Dark Mode - Nice-to-have UI enhancement

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Device Management | HIGH | LOW | P1 |
| SSH/Telnet Support | HIGH | LOW | P1 |
| Multi-Vendor ARP Collection | HIGH | MEDIUM | P1 |
| IP/MAC Discovery | HIGH | MEDIUM | P1 |
| Subnet Display | HIGH | MEDIUM | P1 |
| IP Usage Statistics | HIGH | MEDIUM | P1 |
| Manual Scan | HIGH | LOW | P1 |
| Table View | HIGH | LOW | P1 |
| Device Status | MEDIUM | LOW | P1 |
| IP-MAC Change Detection | HIGH | HIGH | P2 |
| Visual Alerting | HIGH | MEDIUM | P2 |
| Scheduled Scan | MEDIUM | MEDIUM | P2 |
| Export CSV | MEDIUM | LOW | P2 |
| Vendor ID (OUI) | MEDIUM | LOW | P2 |
| Parallel Scanning | MEDIUM | MEDIUM | P3 |
| Topology Viz | MEDIUM | HIGH | P3 |
| Snapshot Compare | LOW | MEDIUM | P3 |
| Dashboard Widgets | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (v1)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Advanced IP Scanner | Angry IP Scanner | Fing | ManageEngine OpUtils | Our Approach |
|---------|---------------------|------------------|------|----------------------|--------------|
| Discovery Method | ICMP/SNMP | ICMP Ping | ICMP/SNMP | SNMP/SSH | SSH/Telnet CLI (ARP tables) |
| Multi-Vendor | Limited | No | Limited | Yes (enterprise) | Yes (Huawei, H3C, Ruijie, Cisco) |
| IP-MAC Mapping | Basic | Yes | Yes | Advanced | Core focus |
| Change Detection | No | No | Limited | Yes | Yes (v1.x) |
| Scheduled Scans | No | No | Yes (paid) | Yes | Yes (v1.x) |
| Deployment | Desktop | Desktop | Desktop/Mobile | Server | Desktop (single-user) |
| Complexity | Simple | Simple | Simple | Complex | Simple |
| Price | Free | Free/Open | Freemium | Paid | TBD (likely free/low-cost) |

**Key Differentiation:**
- Unlike generic IP scanners, we connect directly to network infrastructure (switches/routers) via SSH/Telnet
- Focus on ARP table data for accurate IP-MAC mapping
- Multi-vendor CLI support is our unique value
- Simpler than enterprise IPAM tools - no server, no database, single-user

## Sources

- [ManageEngine: 10 Must-Have IPAM Features](https://www.manageengine.com/products/oputils/blog/10-must-have-ipam-features-that-ensure-seamless-network-operations.html) - MEDIUM confidence
- [DevOps School: Top 10 IPAM Tools 2026](https://www.devopsschool.com/blog/top-10-ip-address-management-tools-in-2025-features-pros-cons-comparison/) - MEDIUM confidence
- [SourceForge: Advanced IP Scanner vs Angry IP Scanner](https://sourceforge.net/software/compare/Advanced-IP-Scanner-vs-Angry-IP-Scanner/) - MEDIUM confidence
- [Lansweeper IP Scanner](https://www.lansweeper.com/resources/free-tools/ip-scanner/) - MEDIUM confidence
- [Fing Official Site](https://www.fing.com/) - MEDIUM confidence
- [Auvik: What Is an ARP Table](https://www.auvik.com/franklyit/blog/what-is-an-arp-table/) - HIGH confidence
- [Cisco: IP Device Tracking](https://community.cisco.com/t5/switching/ip-arp-inspection-and-ip-device-tracking/td-p-4623167) - HIGH confidence
- [Huawei: ARP IP-Conflict Track](https://support.huawei.com/enterprise/en/doc/EDOC1100096311/a64c99e8/display-arp-ip-conflict-track) - HIGH confidence

---
*Feature research for: Network IP/MAC Monitoring Desktop Application*
*Researched: 2026-03-18*
