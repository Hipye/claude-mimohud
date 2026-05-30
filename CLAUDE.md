# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mimo-hud 是一个终端 HUD 工具，用于实时显示小米 MiMo 平台的 token 使用量。基于 Ink (React for CLI) 构建，纯 ESM TypeScript 项目。

## Commands

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发模式运行（tsx 直接执行 src/index.tsx） |
| `npm run build` | TypeScript 编译到 dist/ |
| `npm start` | 运行编译后的 dist/index.js |
| `npm run refresh-cookie` | 手动刷新 Cookie（浏览器自动打开，需登录） |

无测试、无 linter 配置。项目无 README。

## Architecture

```
src/index.tsx          CLI 入口，meow 解析参数，加载配置，render <App>
src/config.ts          读写 ~/.mimo-hud.json（cookie + refreshInterval）
src/api.ts             封装 platform.xiaomimimo.com/api/v1 三个接口
src/store.ts           useStore hook：并行拉取数据，定时刷新，管理 loading/error 状态
src/components/
  App.tsx              主组件，键盘快捷键（d/m/r/q），组合子视图
  HudLine.tsx          主 HUD 行：套餐额度 + 补偿积分进度条 + 套餐详情
  DailyView.tsx        按日聚合 token 消耗（最近 10 天柱状图）
  ModelView.tsx        按模型聚合 token 消耗 + cache 命中率
src/test-run.ts        手动测试脚本（直接调 API，不经过 Ink）
```

## Key Patterns

- **数据流**: config → cookie → api.ts 三个 fetch 函数 → useStore hook → 组件消费
- **模块解析**: tsconfig `moduleResolution: "bundler"`，import 须带 `.js` 后缀（如 `./api.js`）
- **中文 UI**: 所有面向用户的文本（进度条标签、错误提示）使用中文
- **API 认证**: 通过浏览器 Cookie 头认证，`api-platform_ph` 参数从 Cookie 中正则提取
- **Token 格式**: `formatTokens()` 在 HudLine、DailyView、ModelView 中各自内联定义（未共享）

## Troubleshooting

### No cookie configured

配置文件路径：`~/.mimo-hud.json`

```json
{
  "cookie": "api-platform_serviceToken=...; userId=...; api-platform_slh=...; api-platform_ph=...",
  "refreshInterval": 5
}
```

### HTTP 401 错误

**原因 1：Cookie 值中的引号**

浏览器发送 cookie 时部分值被双引号包裹。写入 JSON 时两种方式都能工作：

```json
// 方式一：带引号（JSON 中需转义）
"cookie": "api-platform_serviceToken=\"0aGv1v...\"; userId=123"

// 方式二：去掉引号（推荐）
"cookie": "api-platform_serviceToken=0aGv1v...; userId=123"
```

**原因 2：api-platform_ph 查询参数缺失**

`/api/v1/usage/token-plan/list`（POST 请求）要求 `api-platform_ph` 同时作为 cookie 和 URL 查询参数。api.ts 已自动从 cookie 中提取并拼接，无需手动处理。

**原因 3：Cookie 过期**

`api-platform_serviceToken` 有时效性。重新从浏览器 Network 标签复制。

### httpOnly Cookie 无法通过脚本获取

`api-platform_serviceToken` 是 httpOnly cookie，`document.cookie` 和 `cookieStore.getAll()` 都无法获取。必须从 DevTools Network 标签的请求头中手动复制 Cookie 字段。

### Ink Raw Mode 错误

```
ERROR Raw mode is not supported on the current process.stdin
```

Ink 的 `useInput` 要求交互式终端。解决方案：
- 在真实终端窗口中运行 `npm run dev`
- 非交互场景使用 `npx tsx src/test-run.ts`

### 自动刷新 Cookie

系统会自动检测 Cookie 过期（HTTP 401），并触发刷新：

1. 检测到 401 → 自动运行 `refresh-cookie`
2. 浏览器弹出 → 手动登录
3. 登录成功 → 自动提取 Cookie 并重试

**手动刷新**：
```bash
npm run refresh-cookie
```

**原理**：通过 Chrome DevTools Protocol 获取 httpOnly Cookie，无需手动复制。

**注意**：
- `api-platform_serviceToken` 有效期约 24 小时
- 浏览器会记住登录态，后续刷新通常无需重新登录