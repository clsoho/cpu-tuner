# CPU Tuner 🔧

[![CI](https://github.com/clsoho/cpu-tuner/actions/workflows/ci.yml/badge.svg)](https://github.com/clsoho/cpu-tuner/actions/workflows/ci.yml)
[![Release](https://github.com/clsoho/cpu-tuner/actions/workflows/release.yml/badge.svg)](https://github.com/clsoho/cpu-tuner/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**CPU Tuner** 是一款 Windows 桌面 CPU 性能调优工具，灵感来自 [ThrottleStop](https://www.techpowerup.com/download/techpowerup-throttlestop/)，基于 Tauri v2 + React + TypeScript + Rust 构建。支持实时监控、电压偏移、功率限制、基准测试等完整功能。

---

## 📸 界面预览

<!-- 截图待补充 -->

---

## ✨ 功能

### 主面板 — Main
- 逐核心实时监控：**C0%** (占用率)、**温度**、**频率 (MHz)**、**倍频 (Multiplier)**、**VID 电压**
- **Set Multiplier** — 手动锁定 CPU 倍频
- **Clock Modulation** — 时钟调制滑块 (0–100%)
- SpeedStep / Speed Shift / C1E / BD PROCHOT / Turbo 开关
- **Speed Shift EPP** 调节 (0–255)
- 4 个性能配置文件一键切换（省电 / 均衡 / 高性能 / 极致）

### FIVR — 电压调节
- **Voltage Offset** 偏移滑块：Core / Cache / GPU / System Agent
- 实时电压读数监控
- 快速预设按钮（-150mV ~ 0mV）
- ⚠ 注意：10 代+ CPU 可能已锁定电压调节

### TPL — 功率限制
- **PL1 (Power Limit 1)** — 长时间功耗限制 (W)
- **PL2 (Power Limit 2)** — 短时间功耗限制 (W)
- **Turbo Time Window** — 涡轮时间窗口 (s)
- MMIO Lock / Sync MMIO
- 快速场景预设：Laptop / Balanced / Performance / Unlimited

### Bench — 基准测试
- 多线程 CPU 基准测试
- 可配置线程数和迭代次数
- 实时评分

### Options — 全局设置
- 配置文件参数编辑（名称、EPP、Turbo、CPU 范围等）
- 最小化到系统托盘 / 开机自启 / 启动时自动应用
- 温度告警阈值
- 插入电源 / 使用电池时自动切换配置

---

## 🖥️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript |
| 样式 | Tailwind CSS 3 + 自定义深色主题 |
| 状态管理 | Zustand |
| 后端 | Rust |
| 系统信息 | sysinfo + WMI |
| 电源管理 | Windows powercfg |
| 系统托盘 | Tauri tray-icon (原生) |

---

## 📥 下载

前往 [Releases](https://github.com/clsoho/cpu-tuner/releases) 下载最新版本：

- **`.msi`** — 标准安装包，推荐使用
- **`.exe`** — 绿色免安装版，下载即用

---

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 开发模式（前端 + Tauri 桌面应用）
npm run tauri:dev

# 仅前端开发
npm run dev

# 构建
npm run tauri:build
```

### 前提条件

- **Windows 10/11**
- **Node.js >= 18**
- **Rust** (rustup)
- **WebView2** (Windows 10+ 自带)
- 运行需要**管理员权限**（部分电源设置需要）

---

## 🔄 自动发布

项目配置了 GitHub Actions CI/CD：

| Workflow | 触发条件 | 作用 |
|----------|---------|------|
| `ci.yml` | Push to main / PR | TypeScript 检查 + 构建验证 |
| `release.yml` | Push `v*` tag | 完整打包 + 发布 GitHub Release |

### 发布新版本

```bash
# 1. 修改 src-tauri/tauri.conf.json 中的 version
# 2. 提交并打 tag
git add -A
git commit -m "release: v0.2.0"
git tag v0.2.0
git push origin main --tags
```

推送 tag 后 GitHub Actions 会自动：
1. 安装 Node.js + Rust 环境
2. 构建前端 + Tauri 桌面应用
3. 生成 `.msi` 安装包和 `.exe` 绿色版
4. 创建 GitHub Release 并上传产物

---

## ⚠️ 免责声明

调整 CPU 电压、功率限制和频率设置可能导致硬件损坏、系统不稳定或缩短硬件寿命。
**使用本工具风险自负**。建议在调整参数时持续监控 CPU 温度（建议不超过 90°C）。

---

## 📄 许可

MIT
