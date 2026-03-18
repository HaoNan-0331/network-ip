# Roadmap: NetworkIP - 网络IP/MAC监控系统

## Overview

本项目从零开始构建一款企业级网络IP/MAC监控桌面应用。通过5个阶段，从基础设施搭建到完整功能交付，最终实现让网络运维人员一目了然地掌握网络IP使用情况、快速发现IP异常变动的核心价值。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure & Device Management** - 项目框架搭建与设备管理CRUD
- [ ] **Phase 2: ARP Data Collection** - 多厂商设备ARP表采集
- [ ] **Phase 3: Network Organization & Visualization** - 网段管理与数据可视化展示
- [ ] **Phase 4: Anomaly Detection** - IP-MAC变动检测与异常告警
- [ ] **Phase 5: Export & Polish** - 数据导出与最终打磨

## Phase Details

### Phase 1: Infrastructure & Device Management
**Goal**: 用户可以在桌面应用中管理网络设备，并建立安全的设备连接
**Depends on**: Nothing (first phase)
**Requirements**: DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, CONN-01, CONN-02, CONN-03
**Success Criteria** (what must be TRUE):
  1. 用户可以启动桌面应用并看到主界面
  2. 用户可以添加/编辑/删除网络设备（IP、用户名、密码、协议、厂商类型）
  3. 用户可以选择设备连接协议（SSH或Telnet）
  4. 系统显示每台设备的连接状态（在线/离线）
  5. 系统可以成功建立SSH或Telnet连接到测试设备
**Plans**: 4 plans in 2 waves

Plans:
- [x] 01-PLAN.md — Project setup: Electron Forge + Vue 3 + SQLite + Vitest
- [x] 02-PLAN.md — Backend services: Credential, SSH, Telnet, IPC handlers
- [x] 03-PLAN.md — Frontend: Pinia store, DeviceTable, DeviceForm, DeviceManagement
- [ ] 04-PLAN.md — Integration and end-to-end verification

### Phase 2: ARP Data Collection
**Goal**: 系统可以从多厂商网络设备采集ARP表数据
**Depends on**: Phase 1
**Requirements**: COLL-01, COLL-02, COLL-03, COLL-04, COLL-05
**Success Criteria** (what must be TRUE):
  1. 系统可以从华为设备采集ARP表并解析出IP-MAC映射
  2. 系统可以从华三(H3C)设备采集ARP表并解析出IP-MAC映射
  3. 系统可以从锐捷设备采集ARP表并解析出IP-MAC映射
  4. 系统可以从思科(Cisco)设备采集ARP表并解析出IP-MAC映射
  5. 系统支持多设备并发扫描（可配置并发数）
**Plans**: TBD

### Phase 3: Network Organization & Visualization
**Goal**: 用户可以查看网段IP使用情况，并通过表格和图表直观了解网络状态
**Depends on**: Phase 2
**Requirements**: NET-01, NET-02, NET-03, VIEW-01, VIEW-02, VIEW-03, SCAN-01, SCAN-02
**Success Criteria** (what must be TRUE):
  1. 系统自动从ARP数据中发现并展示网段
  2. 用户可以手动添加/配置网段
  3. 用户可以看到每个网段的IP使用统计（已用/可用/总数）
  4. 用户可以在表格中查看IP列表，支持排序和筛选
  5. 用户可以通过可视化图表查看网段IP使用情况
  6. 用户可以手动触发扫描
  7. 用户可以配置定时自动扫描
**Plans**: TBD

### Phase 4: Anomaly Detection
**Goal**: 用户可以快速发现IP异常变动（IP-MAC变化）
**Depends on**: Phase 3
**Requirements**: ANOM-01, ANOM-02, ANOM-03
**Success Criteria** (what must be TRUE):
  1. 系统自动检测同一IP对应不同MAC的变动
  2. 变动时系统同时展示之前的MAC和当前的MAC
  3. 系统在界面内高亮显示异常告警
**Plans**: TBD

### Phase 5: Export & Polish
**Goal**: 用户可以导出扫描结果，系统达到生产就绪状态
**Depends on**: Phase 4
**Requirements**: EXPORT-01
**Success Criteria** (what must be TRUE):
  1. 用户可以将扫描结果导出为CSV文件
  2. 系统显示MAC地址对应的厂商信息（OUI查询）
  3. 错误处理完善，用户体验流畅
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure & Device Management | 3/4 | In Progress | 01-01, 01-02, 01-03 |
| 2. ARP Data Collection | 0/TBD | Not started | - |
| 3. Network Organization & Visualization | 0/TBD | Not started | - |
| 4. Anomaly Detection | 0/TBD | Not started | - |
| 5. Export & Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-18*
*Last updated: 2026-03-18 - After plan 01-03 completion*
*Granularity: standard*
