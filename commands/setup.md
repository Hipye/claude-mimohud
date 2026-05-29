---
description: 配置 MiMo HUD 的 cookie 以访问 API
argument-hint: "[cookie值]"
allowed-tools: Bash, Read, Write, AskUserQuestion
---

# /claude-mimohud:setup

配置 MiMo 平台 cookie，使 statusLine 能够获取 token 用量数据。

## 配置步骤

如果用户通过 $ARGUMENTS 直接提供了 cookie 值，写入配置文件：

```bash
echo '{"cookie":"$ARGUMENTS","refreshInterval":5}' > ~/.mimo-hud.json
```

否则，引导用户手动获取 cookie：

1. 浏览器打开 https://platform.xiaomimimo.com/console/plan-manage
2. 按 F12 打开开发者工具 → Network（网络）标签
3. 刷新页面，点击任意一个 API 请求
4. 复制请求头中的 Cookie 值
5. 粘贴到下方命令中：

```bash
echo '{"cookie":"粘贴的cookie值","refreshInterval":5}' > ~/.mimo-hud.json
```

## 配置 statusLine

配置完成后，将 statusLine 添加到 Claude Code 设置中。运行以下命令自动完成：

```bash
node -e "
const fs = require('fs');
const os = require('os');
const path = os.homedir() + '/.claude/settings.json';
const settings = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf8')) : {};
settings.statusLine = { type: 'command', command: 'node ${CLAUDE_PLUGIN_ROOT}/dist/statusline.js' };
fs.writeFileSync(path, JSON.stringify(settings, null, 2));
console.log('statusLine 已配置');
"
```

## 验证

配置完成后验证是否正常工作：

```bash
echo '{}' | node ${CLAUDE_PLUGIN_ROOT}/dist/statusline.js
```

如果看到 MiMo 套餐的用量信息，说明配置成功。
