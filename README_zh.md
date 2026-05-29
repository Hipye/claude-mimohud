# claude-mimohud

小米 MiMo 平台 token 用量监控 — Claude Code 状态栏插件 & 终端 HUD

[English](README.md)

## 功能

- **Status Line 状态栏** — 在 Claude Code 底部实时显示 MiMo 套餐用量、补偿积分、到期时间
- **Slash 命令** — `/claude-mimohud:setup` 配置 cookie，`/claude-mimohud:check-usage` 查看详细用量
- **独立终端 HUD** — `npm run dev` 启动交互式终端界面，支持按日/按模型统计
- **缓存机制** — 60 秒缓存避免频繁调用 API，状态栏刷新流畅

## 安装

### 作为 Claude Code 插件安装

```
/plugin marketplace add Hipye/claude-mimohud
/plugin install claude-mimohud
/claude-mimohud:setup
```

### 本地开发

```bash
git clone https://github.com/Hipye/claude-mimohud.git
cd claude-mimohud
npm install
npm run build
```

## 配置

### 获取 Cookie

1. 浏览器打开 https://platform.xiaomimimo.com/console/plan-manage
2. 按 F12 打开开发者工具 → Network（网络）标签
3. 刷新页面，点击任意 API 请求
4. 复制请求头中的 Cookie 值

### 写入配置

```bash
echo '{"cookie":"YOUR_COOKIE","refreshInterval":5}' > ~/.mimo-hud.json
```

或使用 slash 命令：

```
/claude-mimohud:setup YOUR_COOKIE
```

### 配置 Status Line

`/claude-mimohud:setup` 会自动完成此步骤。手动配置：

```json
// ~/.claude/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "node <plugin-path>/dist/statusline.js"
  }
}
```

## 使用

### Slash 命令

| 命令 | 说明 |
|---|---|
| `/claude-mimohud:setup` | 配置 cookie 和 statusLine |
| `/claude-mimohud:check-usage` | 查看详细用量（按日、按模型） |

### 独立终端 HUD

```bash
npm run dev          # 交互式终端界面
npm run start        # 编译后运行
```

键盘快捷键：
- `d` — 切换按日统计
- `m` — 切换按模型统计
- `r` — 手动刷新
- `q` — 退出

### Status Line 输出示例

```
MiMo 套餐 [████████░░] 82.3% 156.2M/190.0M | 补偿 [██░░░░░░░░] 18.5% 3.7M/20.0M | Max | 2026-06-27到期 | 续费✓
```

## 项目结构

```
claude-mimohud/
  .claude-plugin/
    plugin.json              # 插件清单
    marketplace.json         # 市场配置
  commands/
    setup.md                 # /claude-mimohud:setup 命令
    check-usage.md           # /claude-mimohud:check-usage 命令
  src/
    statusline.ts            # StatusLine 入口脚本
    api.ts                   # MiMo API 封装
    config.ts                # 配置管理
    store.ts                 # 状态管理 hook
    index.tsx                # Ink 终端入口
    test-run.ts              # 测试脚本
    components/
      App.tsx                # 主组件
      HudLine.tsx            # HUD 主行
      DailyView.tsx          # 按日统计视图
      ModelView.tsx          # 按模型统计视图
```

## 技术栈

- **TypeScript** + **ESM** — 纯 ESM 模块，`moduleResolution: "bundler"`
- **Ink** + **React** — 终端 UI 框架（独立 HUD 模式）
- **Claude Code Plugin API** — 插件清单、slash 命令、statusLine

## License

MIT
