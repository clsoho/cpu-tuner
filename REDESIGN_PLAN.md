# CPU Tuner 重写规划 - ThrottleStop 级别

## 现状问题
- 基础版只有电源计划管理 + 简单监控
- 无法真正调整 CPU 性能参数
- UI 太简单，不像专业调优工具

## 借鉴 ThrottleStop 的核心设计

### ThrottleStop 功能模块
| 模块 | 功能 | 需要 MSR? | 优先级 |
|------|------|-----------|--------|
| **FIVR** | 核心/缓存/显卡/内存电压下压 | ✅ | P0 核心 |
| **TPL** | 长时/短时功耗墙 + 时间窗口 | ✅ | P0 核心 |
| **Speed Shift** | EPP 值调节 (性能响应速度) | ⚠️ 部分需要 | P1 |
| **Misc** | BD PROCHOT / 禁用 Turbo / Clock Modulation | ✅ | P1 |
| **Profiles** | 4个配置档位切换 + 自动切换 | ❌ | P0 核心 |
| **Monitor** | 核心温度/频率/功耗/功耗墙实时图表 | ⚠️ 部分 | P0 核心 |
| **TSEner** | TDP 功耗追踪 + 温度限制 | ✅ | P2 |
| **Turn Off / Reset** | 一键重置所有设置 | ❌ | P1 |

### 重写架构

#### 后端 (Rust) 模块
```
src-tauri/src/
├── cpu.rs              # CPU 检测 (厂商/型号/步进/特性标志)
├── msr/
│   ├── mod.rs          # MSR 访问统一接口
│   └── winring0.rs     # WinRing0 驱动封装
├── undervolt.rs        # FIVR 电压偏移 (核心/缓存/核显)
├── power_limits.rs     # TPL 功耗墙设置
├── speed_shift.rs      # Intel Speed Shift EPP 控制
├── thermal.rs          # 温度读取 / BD PROCHOT 检测
├── profiles.rs         # 配置档位 (保存/加载/自动切换)
├── monitor.rs          # 增强版监控 (per-core temps/clocks)
├── power_plan.rs       # 电源计划 (已有，增强)
└── main.rs            # Tauri 入口
```

#### 前端 (React) 模块
```
src/
├── pages/
│   ├── Dashboard.tsx    # 主仪表板 (类比 ThrottleStop 主页)
│   ├── Undervolt.tsx    # FIVR 电压下压界面
│   ├── PowerLimits.tsx  # TPL 功耗墙设置
│   ├── Profiles.tsx     # 配置管理
│   └── Monitor.tsx      # 实时监控图表
├── components/
│   ├── CPUMonitor.tsx   # 核心温度/频率图表
│   ├── ProfileCard.tsx  # 配置卡片
│   ├── Gauge.tsx        # 仪表盘组件
│   └── TrayMonitor.tsx  # 系统托盘迷你监控
├── stores/
│   └── appStore.ts      # Zustand 状态
└── lib/
    └── api.ts           # Tauri invoke 封装
```

### MSR 驱动策略

**WinRing0** 是最佳选择:
- 开源 (GPL)，OpenHardwareMonitor 项目一直在维护 fork
- 支持 x64，Win10/11
- 用法：加载 .sys 驱动，通过 IOCTL 读写 MSR

**实现方式：**
1. 打包 WinRing0.sys 到 Tauri 资源目录
2. 使用 Windows SCM (Service Control Manager) 加载驱动
3. 通过 DeviceIOControl 发送 IO_READ_MSRE / IO_WRITE_MSRE
4. 提供优雅降级：如果驱动加载失败，回退到 powercfg 模式

### Phase 1: 核心功能 (无驱动依赖)
- [x] CPU 检测模块 (vendor, cores, threads, boost, AVX 等)
- [x] 增强监控 (per-core temperature, clock, usage via WMI + pdh)
- [x] Profile 系统 (JSON 配置, 自动应用)
- [x] Windows Power Throttling 控制
- [x] 启动管理 (开机自启 + 恢复上次配置)
- [ ] ThrottleStop 风格 UI 重写

### Phase 2: MSR 驱动功能
- [ ] WinRing0 驱动集成
- [ ] 电压下压核心/缓存/核显
- [ ] TPL 功耗墙设置
- [ ] Speed Shift EPP
- [ ] BD PROCHOT / Turbo 控制

### Phase 3: 高级功能
- [ ] 温度/功耗触发自动降频保护
- [ ] 日志记录 + 导出
- [ ] 游戏模式自动切换
- [ ] 自定义告警

## 关键技术细节

### CPU 检测 (通过 CPUID 指令)
- Vendor: GenuineIntel / AuthenticAMD
- CPU Family/Model/Stepping
- 支持特性: Speed Shift, HV, BD PROCHOT
- 核心数/线程数/Topology
- 基础频率/最大睿频

### 监控替代方案 (无驱动)
| 数据 | 方法 |
|------|------|
| CPU 使用率 (per-core) | NtQuerySystemInformation / PDH |
| 温度 | WMI MSAcpi_ThermalZone / 读取硬件传感器库 |
| 频率 | QueryPerformanceCounter + 估算 |
| 温度 (准确) | 需要 WinRing0 读 PCIe/MCHBAR |
| 功耗 | 需要 MSR 或硬件传感器 |

### Profile 配置格式
```json
{
  "profiles": {
    "1": {
      "name": "日常使用",
      "powerPlan": "balance",
      "speedShiftEPP": 128,
      "minProcState": 5,
      "maxProcState": 100,
      "coolingPolicy": "active",
      "boostMode": "auto",
      "undervoltCore": 0,
      "undervoltCache": 0,
      "powerLimitLong": null,
      "powerLimitShort": null
    }
  },
  "activeProfile": "1",
  "autoApply": true
}
```
