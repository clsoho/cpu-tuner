# CPU Tuner 🔧

一个 Windows 桌面 CPU 性能调优工具，基于 Tauri v2 + React + TypeScript 构建。

## 功能

### 1. 电源计划管理
- 列出所有 Windows 电源方案
- 一键切换活动电源计划
- 创建自定义电源计划（基于现有计划复制）
- 删除不需要的电源计划

### 2. CPU 参数调整
- **最小处理器状态** - 控制 CPU 最低频率百分比
- **最大处理器状态** - 限制 CPU 最高频率（≤99% 可禁用 Turbo Boost）
- **系统散热策略** - 被动/主动散热模式选择
- **处理器性能提升模式** - 控制 Turbo Boost 行为（禁用/启用/主动/高效）
- 快捷预设：节能模式、平衡模式、极致性能

### 3. 性能监控
- 实时 CPU 使用率（整体 + 每核心）
- 实时 CPU 频率
- CPU 温度（通过 WMI 获取）
- 内存使用情况
- 历史趋势图表（最近 60 个数据点）

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| 后端 | Rust |
| 系统信息 | sysinfo crate |
| 电源管理 | Windows powercfg |

## 项目结构

```
cpu-tuner/
├── src/                          # React 前端
│   ├── App.tsx                   # 主应用组件
│   ├── main.tsx                  # 入口
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx       # 侧边栏导航
│   │   │   └── Header.tsx        # 顶栏
│   │   ├── Dashboard/index.tsx   # 仪表盘（概览）
│   │   ├── PowerPlans/index.tsx  # 电源计划管理
│   │   ├── Monitor/index.tsx     # 性能监控图表
│   │   └── CpuSettings/index.tsx # CPU 参数设置
│   ├── stores/appStore.ts        # Zustand 状态
│   ├── lib/tauri.ts              # Tauri API 封装
│   └── styles/globals.css        # 全局样式
├── src-tauri/                    # Rust 后端
│   ├── src/main.rs               # Tauri 入口
│   ├── src/commands/
│   │   ├── power_plan.rs         # 电源计划 CRUD + 参数设置
│   │   └── monitor.rs            # 系统监控（CPU/内存/温度）
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建
npm run tauri:build
```

## 前提条件

- Windows 10/11
- Node.js >= 18
- Rust (rustup)
- Tauri CLI: `cargo install tauri-cli`

## 许可

MIT
