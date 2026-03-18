# Pitfalls Research

**Domain:** Network IP/MAC Monitoring Desktop Application
**Researched:** 2026-03-18
**Confidence:** MEDIUM (WebSearch-based, domain expertise + community sources)

## Critical Pitfalls

### Pitfall 1: Multi-Vendor ARP Output Parsing Fragility

**What goes wrong:**
Each network device vendor uses different CLI output formats for ARP tables. Building regex parsers that work for Cisco breaks on Huawei/H3C/Ruijie. Minor firmware updates can change output format, breaking parsers silently.

**Why it happens:**
- Cisco: `show ip arp` varies between IOS, NX-OS, IOS-XR
- Huawei/H3C: `display arp` with different VRP versions
- Developers assume one regex fits all, or underestimate format differences

**How to avoid:**
1. Use structured parsing libraries (TextFSM templates, genie, scrapli) instead of raw regex
2. Build vendor-specific parser classes with a common interface
3. Include output format version detection in parsing logic
4. Store raw output alongside parsed data for debugging

**Warning signs:**
- Parser silently returns empty or partial results
- "Works on my test device" but fails in production
- Increasing number of "unparseable line" warnings

**Phase to address:**
Phase 1 (Device Connection & ARP Collection) - parser architecture must be designed upfront

---

### Pitfall 2: SSH/Telnet Connection State Mismanagement

**What goes wrong:**
Network connections are inherently unreliable. SSH sessions drop unexpectedly, devices become unreachable, firewalls timeout idle connections. Application hangs or shows stale data because it assumes connections are persistent.

**Why it happens:**
- Network interruptions during data collection
- Device SSH session timeouts (different per vendor)
- Firewall idle connection killing
- No heartbeat/keepalive mechanism implemented

**How to avoid:**
1. Implement connection pooling with health checks
2. Set appropriate SSH keepalive (`ServerAliveInterval`, `ServerAliveCountMax`)
3. Design stateless operations - reconnect per scan rather than persistent sessions
4. Add timeout handling at every layer (connection, command execution, response reading)
5. Implement exponential backoff retry logic with max attempts

**Warning signs:**
- UI freezes during device scan
- "Connection reset" errors appearing randomly
- Some devices consistently fail while others work

**Phase to address:**
Phase 1 (Device Connection & ARP Collection) - connection handling is foundational

---

### Pitfall 3: Credential Storage Security

**What goes wrong:**
Storing device credentials in plain text config files or local storage. Credentials can be extracted by anyone with file system access.

**Why it happens:**
- Convenience during development becomes permanent
- "It's a desktop app, local access already means compromised" false reasoning
- Electron localStorage is easily readable

**How to avoid:**
1. **For Tauri:** Use OS-native keychain via Rust-side keyring/secure storage plugins
2. **For Electron:** Use built-in `safeStorage` API (not node-keytar which is deprecated)
3. Never store credentials in source code, config files, or localStorage
4. On first run, prompt user to set up secure credential store

**Warning signs:**
- Credentials visible in config files
- `localStorage` or `sessionStorage` containing passwords
- No encryption layer for stored credentials

**Phase to address:**
Phase 1 (Device Management) - credential handling must be secure from the start

---

### Pitfall 4: IP Conflict Detection False Positives

**What goes wrong:**
Normal network operations trigger IP conflict alerts. Users ignore or disable the feature due to noise.

**Why it happens:**
- DHCP lease renewal causes brief MAC address changes
- Load balancing/failover scenarios have legitimate MAC changes
- Bonjour Sleep Proxy (Apple networks) causes apparent conflicts
- Timing issues during ARP table polling across multiple devices

**How to avoid:**
1. Implement cooldown period - same IP with different MAC must persist across multiple scans
2. Add whitelist capability for known legitimate MAC changes
3. Differentiate between "MAC changed" (warning) and "multiple MACs claiming same IP" (critical)
4. Cross-reference with DHCP lease data if available
5. Add confidence scoring based on number of devices reporting the conflict

**Warning signs:**
- Users reporting "alert fatigue"
- Conflicts appearing/disappearing rapidly
- Conflicts showing same MAC address for "both" sides

**Phase to address:**
Phase 2 (IP Status & Anomaly Detection) - detection logic must account for false positives

---

### Pitfall 5: Concurrent Device Connection Scalability

**What goes wrong:**
Sequential device scanning is too slow for 50+ devices. Parallel connections exhaust resources or hit OS limits. Application becomes unusable during scans.

**Why it happens:**
- 50 devices x 5 seconds per device = 4+ minutes sequential
- Unlimited parallelism hits file descriptor limits
- No backpressure or queue management
- UI thread blocked during network I/O

**How to avoid:**
1. Implement connection pool with configurable concurrency limit (e.g., 5-10 concurrent)
2. Use worker threads/processes for network I/O (not main thread)
3. Add progress reporting and cancellation support
4. Implement queue with priority (critical devices first)
5. Consider incremental UI updates as data arrives

**Warning signs:**
- "Scan all" takes unreasonably long
- Application freezes during scan
- Random connection failures when scanning many devices

**Phase to address:**
Phase 1 (Device Connection & ARP Collection) - concurrency model must be designed early

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single regex for all vendors | Faster initial implementation | Breaks on edge cases, unmaintainable | Never |
| Synchronous device connections | Simpler code | UI freezes, poor UX | Never |
| Plain text credential storage | Quick to implement | Security vulnerability | Never |
| No connection timeout handling | Works on stable networks | Hangs on network issues | Never |
| Hardcoded ARP commands | Works for one vendor | Fails for others | MVP only if single vendor |
| Single thread for all I/O | Simpler architecture | Doesn't scale past 10 devices | MVP with <10 devices |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SSH to Huawei | Assuming standard SSH port 22 | Check configured port, handle non-standard |
| Telnet connections | No timeout handling | Telnet is inherently less reliable, aggressive timeouts needed |
| ARP table parsing | Ignoring incomplete entries | Filter or flag incomplete entries separately |
| Multi-vendor support | One parser for all | Vendor-specific parsers with common interface |
| Credential management | Storing in config files | OS-native secure storage |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential device scanning | 50+ devices take minutes | Concurrent connection pool with limit | 10+ devices |
| Main thread network I/O | UI freezes during scan | Worker threads/processes | 5+ devices |
| No pagination for device list | Slow UI with many devices | Virtual scrolling, lazy loading | 100+ devices |
| Full ARP data in memory | Memory growth over time | Limit history, stream processing | 10k+ ARP entries |
| No scan cancellation | Cannot stop long scans | CancellationToken pattern | Any production use |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Telnet credential exposure | Cleartext password on network | Warn user, prefer SSH, use only when required |
| Credential storage in localStorage | Easily extractable | Use OS-native secure storage |
| No input validation on device IPs | Potential SSRF/attacks | Validate IP format, restrict to private ranges |
| Logging credentials | Credential leak in logs | Never log credentials, mask in debug output |
| No credential encryption at rest | File system access = credential access | Encrypt before storage |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No scan progress feedback | User thinks app is frozen | Progress bar, device count, ETA |
| Blocking UI during scan | Cannot interact with app | Background scanning, non-blocking UI |
| Alert fatigue from false positives | Users ignore all alerts | Confidence scoring, cooldown periods |
| No way to cancel operations | Stuck waiting for slow devices | Cancel button, timeout settings |
| Device connection errors hidden | User doesn't know what failed | Clear error messages, retry options |
| No offline device indication | Stale data appears current | Show "last successful scan" timestamp |

## "Looks Done But Isn't" Checklist

- [ ] **Device Connection:** Often missing timeout handling — verify connection timeout config
- [ ] **ARP Parsing:** Often missing incomplete entry handling — verify parsing handles "Incomplete" entries
- [ ] **Multi-vendor:** Often works for Cisco only — verify Huawei, H3C, Ruijie parsing
- [ ] **Credential Storage:** Often plain text — verify credentials encrypted in storage
- [ ] **IP Conflict Detection:** Often too aggressive — verify cooldown period implemented
- [ ] **Concurrent Scanning:** Often unlimited parallelism — verify connection pool limits
- [ ] **Error Recovery:** Often no retry logic — verify exponential backoff implemented
- [ ] **UI Responsiveness:** Often blocking during scan — verify background thread/process

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Multi-vendor parsing fragility | HIGH | Abstract parser interface, implement vendor-specific parsers |
| Connection state mismanagement | MEDIUM | Add connection pooling, health checks, retry logic |
| Credential storage insecurity | HIGH | Migrate to secure storage, rotate all credentials |
| IP conflict false positives | MEDIUM | Add cooldown, confidence scoring, whitelisting |
| Concurrency issues | MEDIUM | Implement connection pool, move I/O to workers |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Multi-vendor ARP parsing | Phase 1 | Test with actual device outputs from all vendors |
| SSH/Telnet connection handling | Phase 1 | Simulate network interruptions, verify recovery |
| Credential storage security | Phase 1 | Audit stored credentials are encrypted |
| IP conflict false positives | Phase 2 | Test with DHCP renewal scenarios |
| Concurrent connection scalability | Phase 1 | Test with 50+ devices, verify reasonable completion time |

## Sources

- [Cisco Learning Network - 5 Common Mistakes in Network Automation with Python](https://learningnetwork.cisco.com/s/question/0D56e0000E3Lo84CQC/my-5-common-mistakes-in-network-automation-with-python)
- [Paramiko SSH Communication Docs](https://python-automation-book.readthedocs.io/en/1.0/11_paramiko/01_intro.html)
- [Electron safeStorage API Documentation](https://electronjs.org/docs/latest/api/safe-storage)
- [Tauri Secure Storage Discussion](https://github.com/orgs/tauri-apps/discussions/1222)
- [Meraki Community - IP Conflict False Positives](https://community.meraki.com/t5/Security-SD-WAN/IP-conflict-but-notice-has-same-MAC-address-for-both/td-p/286669)
- [Reddit - IP Conflict Alerts from DHCP](https://www.reddit.com/r/networking/comments/1izs84i/were_receiving_ip_address_conflict_alerts_that/)
- [Infoblox - Conflict Resolution in Network Insight](https://docs.infoblox.com/space/nios85/35385055)
- [Server Fault - SSH Session Reconnection](https://serverfault.com/questions/19634/how-to-reconnect-to-a-disconnected-ssh-session)
- [Lumenalta - Scalable Network Monitoring Infrastructure](https://lumenalta.com/insights/scalable-network-monitoring)

---
*Pitfalls research for: Network IP/MAC Monitoring Desktop Application*
*Researched: 2026-03-18*
