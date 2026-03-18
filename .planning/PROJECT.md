# NetworkIP - 网络IP/MAC监控系统

## What This Is

一款企业级桌面应用软件，用于实时监控和管理企业网络中的IP地址和MAC地址。通过SSH/Telnet连接多台网络设备（交换机/路由器），采集ARP表数据，统计网络中IP使用情况，检测IP异常变动，并以表格和可视化图表的形式展示各网段IP使用状态。

## Core Value

**让网络运维人员一目了然地掌握网络IP使用情况，快速发现IP异常变动。**

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 支持通过SSH/Telnet连接华为、华三、锐捷、思科网络设备
- [ ] 从设备ARP表采集IP和MAC地址信息
- [ ] 自动发现网段，支持手动补充配置
- [ ] 实时统计各网段IP使用情况（已用/可用）
- [ ] 检测同一IP对应MAC变化（IP冲突/异常告警）
- [ ] 表格+可视化图表展示网段IP状态
- [ ] 支持手动扫描和定时自动扫描
- [ ] 在界面中管理网络设备（增删改查）

### Out of Scope

- 历史数据存储与回溯 — 保持轻量，仅显示当前状态
- 多用户权限管理 — 单机单用户使用
- 邮件/钉钉/企业微信通知 — 仅界面内告警提示
- 服务端部署 — 单机桌面应用

## Context

- 企业网络运维场景，需管理50+台网络设备
- 网络设备主要厂商：华为、华三(H3C)、锐捷、思科(Cisco)
- 不同设备可能使用SSH或Telnet协议，由用户在添加设备时自行选择
- 各厂商ARP查询命令语法不同，需适配

## Constraints

- **技术栈**: 桌面应用框架（Electron/Tauri等）
- **协议支持**: SSH2、Telnet
- **设备厂商**: 华为、华三、锐捷、思科
- **部署方式**: 单机安装，无需服务端

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 单机桌面应用 | 企业内网环境，无需复杂部署 | — Pending |
| 仅存储当前状态 | 减少存储开销，简化实现 | — Pending |
| 界面内告警 | 无需集成第三方通知渠道 | — Pending |

---
*Last updated: 2026-03-18 after initialization*
