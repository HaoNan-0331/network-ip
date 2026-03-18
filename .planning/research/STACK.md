# Stack Research

**Domain:** Network IP/MAC Monitoring Desktop Application
**Researched:** 2026-03-18
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Electron** | 34.x+ | Desktop application framework | Mature ecosystem, bundles full Node.js runtime for SSH/Telnet operations, official Electron Forge support, extensive community resources. 58% larger than Tauri but eliminates webview compatibility issues across Windows versions. |
| **Vue 3** | 3.4.x+ | Frontend framework | Balanced simplicity with power, excellent TypeScript support, lower learning curve than React, strong Chinese community (70%+ domestic market share), well-suited for admin/monitoring dashboards. |
| **TypeScript** | 5.x | Type system | Mandatory for enterprise-grade network tool. Device command parsing, protocol handling, and data structures benefit significantly from compile-time type checking. |
| **Node.js** | 20.x (bundled with Electron) | Runtime environment | Required for SSH/Telnet client operations. Electron 34 bundles Node.js 20.18.1. |

### Database & Storage

| Technology | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **SQLite** | 3.x (via better-sqlite3) | Local relational storage | Recommended. Perfect for desktop apps requiring structured queries. Supports device management, scan history, and configuration storage with ACID guarantees. |
| **electron-store** | 8.x | Simple key-value storage | Alternative for configuration-only storage. Simpler than SQLite but limited to JSON documents. Use if avoiding SQL complexity. |
| **LowDB** | 6.x | JSON-based storage | Not recommended. Overkill for simple config, insufficient for relational data needs. |

### Network Protocol Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **ssh2** | 1.17.x | SSH2 client (low-level) | Primary choice. Pure JavaScript SSH2 implementation, actively maintained, tested against OpenSSH 8.7+. Supports shell, exec, SFTP, and connection hopping. |
| **ssh2-promise** | 1.0.x | SSH2 promise wrapper | Recommended wrapper for ssh2. Provides async/await API, automatic reconnection, connection caching. TypeScript support included. Reduces boilerplate significantly. |
| **telnet-client** | 1.x | Telnet client | For legacy devices not supporting SSH. Simple API, handles prompt detection and socket timeouts. Use only when SSH unavailable. |

### UI Component Library

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Element Plus** | 2.5.x+ | Vue 3 UI components | Recommended. Dominates Chinese Vue 3 market (70%+), excellent Chinese documentation, ideal for admin/monitoring systems. Components: tables, forms, dialogs, notifications, tags. |
| **vue-echarts** | 6.x | ECharts Vue wrapper | For data visualization. Pie charts for IP usage, bar charts for segment statistics, line charts for scan trends. Declarative configuration, rich chart types. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Pinia** | 2.x | State management | For managing device list, scan results, and alert state. Simpler than Vuex, TypeScript-first, official Vue 3 recommendation. |
| **Vue Router** | 4.x | Routing | For navigation between dashboard, device management, and settings views. |
| **dayjs** | 1.x | Date handling | For timestamp formatting in scan logs and alert timestamps. Lightweight alternative to moment.js. |
| **lodash-es** | 4.x | Utility functions | For deep cloning device configs, debouncing scan triggers, grouping IP segments. Use ES modules for tree-shaking. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Electron Forge** | Build and packaging | Official Electron team recommendation. All-in-one solution for development, packaging, and distribution. Replaces electron-builder for new projects. |
| **Vite** | Frontend build tool | Fast HMR, native ESM support. Official Vue 3 recommendation. Integrate with Electron via vite-plugin-electron. |
| **ESLint + Prettier** | Code quality | Standard linting for TypeScript/Vue. Use @typescript-eslint and eslint-plugin-vue. |

## Installation

```bash
# Core framework
npm install electron@34 vue@3 typescript@5

# Network protocols
npm install ssh2 ssh2-promise telnet-client

# Database
npm install better-sqlite3 electron-store

# UI and visualization
npm install element-plus vue-echarts echarts

# State and routing
npm install pinia vue-router@4

# Utilities
npm install dayjs lodash-es

# Dev dependencies
npm install -D @electron-forge/cli vite @vitejs/plugin-vue
npm install -D vite-plugin-electron electron-devtools-installer
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint eslint-plugin-vue prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Electron | Tauri | When bundle size is critical (8MB vs 100MB+), targeting tech-savvy users comfortable with Rust, mobile support needed (iOS/Android). Not recommended for enterprise network tools due to webview compatibility concerns. |
| Vue 3 | React | When team has strong React expertise, maximum ecosystem breadth required, or long-term job market alignment prioritized. |
| Vue 3 | Svelte | When performance is paramount, smaller teams prioritizing developer experience, minimal runtime overhead desired. |
| Element Plus | Ant Design Vue | When React ecosystem alignment needed, more refined UI with advanced table/form components required. Steeper learning curve. |
| ssh2 (wrapped) | node-ssh | When simpler API desired. node-ssh is also a lightweight promise wrapper for ssh2. Less feature-rich than ssh2-promise (no connection caching). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Tauri** for this project | Network device automation requires Node.js native modules (ssh2, telnet-client). Tauri's Rust backend adds complexity for calling Node.js modules. WebView compatibility varies across Windows versions (legacy devices often run older Windows). | Electron |
| **NeDB / LowDB** | Insufficient for relational queries (devices, segments, alerts). JSON-only storage limits flexibility. | SQLite (better-sqlite3) |
| **Raw ssh2 callbacks** | Callback hell for sequential commands (connect -> authenticate -> exec -> parse). Error handling scattered. | ssh2-promise with async/await |
| **LocalForage** | Browser-focused, async API. Electron has direct filesystem access. No benefit over SQLite for structured data. | SQLite or electron-store |
| **Vuex** | Mutations boilerplate, weaker TypeScript support. Official Vue recommendation is Pinia for Vue 3. | Pinia |
| **moment.js** | Large bundle size, mutable API. | dayjs |

## Stack Patterns by Variant

**If mobile support is required in future:**
- Re-evaluate Tauri 2.0 (now supports iOS/Android)
- Extract core logic to shared Node.js package
- Keep UI components framework-agnostic where possible
- Because: Tauri 2.0 mobile support is production-ready

**If 50+ concurrent device connections needed:**
- Implement connection pooling in main process
- Use worker threads for parallel ARP parsing
- Consider Redis for distributed caching (multi-instance scenario)
- Because: Single-threaded Node.js may bottleneck on sequential SSH operations

**If Windows 7/8 legacy support required:**
- Verify Electron 34 minimum OS requirements (Windows 10+)
- May need Electron 22 (last Windows 7 support) with security tradeoffs
- Because: Newer Electron versions drop older Windows support

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Electron 34 | Node.js 20.18.1 | Bundled, cannot change |
| Vue 3.4+ | TypeScript 5.x | Full type inference support |
| better-sqlite3 | Electron 34 | Requires native rebuild for Electron |
| vue-echarts 6.x | Vue 3.x, ECharts 5.x | Peer dependencies |
| Element Plus 2.5+ | Vue 3.3+ | Minimum Vue version requirement |
| ssh2 1.17+ | Node.js 10.16+ | Ed25519 requires Node 12+ |

## ARP Command Reference by Vendor

| Vendor | SSH/Telnet Command | Output Format |
|--------|-------------------|---------------|
| Huawei | `display arp` | Tabular: IP, MAC, VLAN, Interface |
| H3C | `display arp` | Similar to Huawei |
| Cisco | `show ip arp` | Tabular: Protocol, Address, Age, MAC, Type, Interface |
| Ruijie | `show arp` | Similar to Cisco |

**Parsing Strategy:**
- Use regex patterns per vendor
- Normalize to common structure: `{ ip, mac, vlan?, interface?, timestamp }`
- Handle pagination (`---- More ----` prompts) via shell stream parsing

## Sources

- [Electron 34 Release Notes](https://electronjs.org/blog/electron-34-0) - Electron version features (HIGH confidence)
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) - Tauri 2.0 features and mobile support (HIGH confidence)
- [ssh2 npm package](https://www.npmjs.com/package/ssh2) - SSH2 library documentation (HIGH confidence)
- [ssh2-promise npm package](https://www.npmjs.com/package/ssh2-promise) - Promise wrapper documentation (HIGH confidence)
- [telnet-client npm package](https://www.npmjs.com/package/telnet-client) - Telnet client library (MEDIUM confidence)
- [Element Plus Documentation](https://element-plus.org/) - Vue 3 UI library (HIGH confidence)
- [Electron Forge Documentation](https://www.electronforge.io/) - Official packaging tool (HIGH confidence)
- [Vue Component Library Selection 2025](https://www.xinniyun.com/%E5%B7%A5%E5%85%B7%E4%B8%8E%E7%BB%84%E4%BB%B6/article-vue-component-library-element-vu) - Element Plus market analysis (MEDIUM confidence)
- [Electron Database Guide](https://rxdb.info/electron-database.html) - SQLite recommendations for Electron (MEDIUM confidence)

---
*Stack research for: Network IP/MAC Monitoring Desktop Application*
*Researched: 2026-03-18*
