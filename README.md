# CPU Tuner 🔧

[![CI](https://github.com/clsoho/cpu-tuner/actions/workflows/ci.yml/badge.svg)](https://github.com/clsoho/cpu-tuner/actions/workflows/ci.yml)
[![Release](https://github.com/clsoho/cpu-tuner/actions/workflows/release.yml/badge.svg)](https://github.com/clsoho/cpu-tuner/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个 Windows 桌面 CPU 性能调优工具，基于 Tauri v2 + React + TypeScript 构建。

## 📥 下载

前往 [Releases](https://github.com/clsoho/cpu-tuner/releases) 下载最新版本：

- **`.msi`** — 标准安装包，推荐使用
- **`.exe`** — 绿色免安装版，下载即用

## 功能

### 1. 电源计划管理
- 列出所有 Windows 电源方案
- 一键切换活动电源计划
- 创建自定义电源计划（基于现有计划复制）
- 删除不需要的电源计划

### 2. CPU 参数调整
- **最小处理器状态** — 控制 CPU 最低频率百分比
- **最大处理器状态** — 限制 CPU 最高频率（≤99% 可禁用 Turbo Boost）
- **系统散热策略** — 被动/主动散热模式选择
- **处理器性能提升模式** — 控制 Turbo Boost 行为（禁用/启用/主动/高效）
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

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri:dev

# 构建
npm run tauri:build
```

## 自动发布

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

## 前提条件

- Windows 10/11
- Node.js >= 18
- Rust (rustup)

## 许可

MIT
