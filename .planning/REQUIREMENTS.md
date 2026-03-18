# Requirements: NetworkIP - 网络IP/MAC监控系统

**Defined:** 2026-03-18
**Core Value:** 让网络运维人员一目了然地掌握网络IP使用情况，快速发现IP异常变动

## v1 Requirements

### 设备管理 (DEV)

- [x] **DEV-01**: 用户可以添加网络设备（IP地址、用户名、密码、协议） - UI complete
- [x] **DEV-02**: 用户可以编辑已添加的设备信息
- [x] **DEV-03**: 用户可以删除设备
- [x] **DEV-04**: 用户可以选择设备厂商类型（华为/华三/锐捷/思科）
- [x] **DEV-05**: 用户可以选择设备连接协议（SSH/Telnet）
- [x] **DEV-06**: 系统显示设备连接状态（在线/离线）

### 协议连接 (CONN)

- [x] **CONN-01**: 系统支持SSH协议连接设备
- [x] **CONN-02**: 系统支持Telnet协议连接设备
- [x] **CONN-03**: 系统处理连接超时并支持重试机制

### 数据采集 (COLL)

- [ ] **COLL-01**: 系统可以从华为设备采集ARP表
- [ ] **COLL-02**: 系统可以从华三(H3C)设备采集ARP表
- [ ] **COLL-03**: 系统可以从锐捷设备采集ARP表
- [ ] **COLL-04**: 系统可以从思科(Cisco)设备采集ARP表
- [ ] **COLL-05**: 系统支持多设备并发扫描

### 网段管理 (NET)

- [ ] **NET-01**: 系统自动发现网段（从ARP数据推断）
- [ ] **NET-02**: 用户可以手动添加/配置网段
- [ ] **NET-03**: 系统显示每个网段的IP使用统计（已用/可用/总数）

### 数据展示 (VIEW)

- [ ] **VIEW-01**: 用户可以在表格中查看IP列表（支持排序/筛选）
- [ ] **VIEW-02**: 用户可以通过可视化图表查看网段IP使用情况
- [ ] **VIEW-03**: 系统显示MAC地址对应的厂商信息（OUI查询）

### 扫描控制 (SCAN)

- [ ] **SCAN-01**: 用户可以手动触发扫描
- [ ] **SCAN-02**: 用户可以配置定时自动扫描（可设置间隔）

### 异常检测 (ANOM)

- [ ] **ANOM-01**: 系统检测同一IP对应不同MAC的变动
- [ ] **ANOM-02**: 变动时系统同时展示之前的MAC和当前的MAC
- [ ] **ANOM-03**: 系统在界面内高亮显示异常告警

### 数据导出 (EXPORT)

- [ ] **EXPORT-01**: 用户可以导出扫描结果为CSV文件

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### 增强功能

- **PARA-01**: 网络拓扑可视化
- **HIST-01**: 历史快照对比
- **DASH-01**: 自定义仪表盘组件
- **DARK-01**: 深色模式

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 历史数据库 | 保持轻量，仅保存最近一次扫描状态用于变动检测 |
| 多用户/权限管理 | 单机单用户使用 |
| 邮件/钉钉/企业微信通知 | 仅界面内告警提示 |
| 服务端部署 | 单机桌面应用 |
| DHCP/DNS集成 | 超出ARP采集范围 |
| SNMP支持 | SSH/Telnet CLI更简单 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEV-01 | Phase 1 | Complete |
| DEV-02 | Phase 1 | Complete |
| DEV-03 | Phase 1 | Complete |
| DEV-04 | Phase 1 | Complete |
| DEV-05 | Phase 1 | Complete |
| DEV-06 | Phase 1 | Complete |
| CONN-01 | Phase 1 | Complete |
| CONN-02 | Phase 1 | Complete |
| CONN-03 | Phase 1 | Complete |
| COLL-01 | Phase 2 | Pending |
| COLL-02 | Phase 2 | Pending |
| COLL-03 | Phase 2 | Pending |
| COLL-04 | Phase 2 | Pending |
| COLL-05 | Phase 2 | Pending |
| NET-01 | Phase 3 | Pending |
| NET-02 | Phase 3 | Pending |
| NET-03 | Phase 3 | Pending |
| VIEW-01 | Phase 3 | Pending |
| VIEW-02 | Phase 3 | Pending |
| VIEW-03 | Phase 3 | Pending |
| SCAN-01 | Phase 3 | Pending |
| SCAN-02 | Phase 3 | Pending |
| ANOM-01 | Phase 4 | Pending |
| ANOM-02 | Phase 4 | Pending |
| ANOM-03 | Phase 4 | Pending |
| EXPORT-01 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after plan 01-03 completion*
