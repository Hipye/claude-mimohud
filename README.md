# claude-mimohud

Xiaomi MiMo platform token usage monitor — Claude Code status line plugin & terminal HUD

[中文文档](README_zh.md)

## Features

- **Status Line** — Real-time MiMo plan usage, compensation points, and expiry displayed at the bottom of Claude Code
- **Slash Commands** — `/claude-mimohud:setup` to configure cookie, `/claude-mimohud:check-usage` for detailed usage
- **Standalone Terminal HUD** — `npm run dev` launches an interactive terminal UI with daily/model stats
- **Caching** — 60-second cache to avoid frequent API calls, smooth status line refresh

## Installation

### As Claude Code Plugin

```
/plugin marketplace add Hipye/claude-mimohud
/plugin install claude-mimohud
/claude-mimohud:setup
```

### Local Development

```bash
git clone https://github.com/Hipye/claude-mimohud.git
cd claude-mimohud
npm install
npm run build
```

## Configuration

### Get Cookie

1. Open https://platform.xiaomimimo.com/console/plan-manage in browser
2. Press F12 to open DevTools → Network tab
3. Refresh the page, click any API request
4. Copy the Cookie value from request headers

### Write Config

```bash
echo '{"cookie":"YOUR_COOKIE","refreshInterval":5}' > ~/.mimo-hud.json
```

Or use slash command:

```
/claude-mimohud:setup YOUR_COOKIE
```

### Configure Status Line

`/claude-mimohud:setup` handles this automatically. Manual configuration:

```json
// ~/.claude/settings.json
{
  "statusLine": {
    "type": "command",
    "command": "node <plugin-path>/dist/statusline.js"
  }
}
```

## Usage

### Slash Commands

| Command | Description |
|---|---|
| `/claude-mimohud:setup` | Configure cookie and status line |
| `/claude-mimohud:check-usage` | View detailed usage (daily & by model) |

### Standalone Terminal HUD

```bash
npm run dev          # Interactive terminal UI
npm run start        # Run compiled version
```

Keyboard shortcuts:
- `d` — Toggle daily view
- `m` — Toggle model view
- `r` — Manual refresh
- `q` — Quit

### Status Line Output

```
MiMo 套餐 [████████░░] 82.3% 156.2M/190.0M | 补偿 [██░░░░░░░░] 18.5% 3.7M/20.0M | Max | 2026-06-27到期 | 续费✓
```

## Project Structure

```
claude-mimohud/
  .claude-plugin/
    plugin.json              # Plugin manifest
    marketplace.json         # Marketplace config
  commands/
    setup.md                 # /claude-mimohud:setup command
    check-usage.md           # /claude-mimohud:check-usage command
  src/
    statusline.ts            # Status line entry point
    api.ts                   # MiMo API client
    config.ts                # Config management
    store.ts                 # State management hook
    index.tsx                # Ink terminal entry
    test-run.ts              # Test script
    components/
      App.tsx                # Main component
      HudLine.tsx            # Main HUD line
      DailyView.tsx          # Daily usage view
      ModelView.tsx          # Model stats view
```

## Tech Stack

- **TypeScript** + **ESM** — Pure ESM modules, `moduleResolution: "bundler"`
- **Ink** + **React** — Terminal UI framework (standalone HUD mode)
- **Claude Code Plugin API** — Plugin manifest, slash commands, status line

## License

MIT
