---
description: 显示 MiMo 平台详细 token 用量（按日、按模型）
allowed-tools: Bash
---

# /claude-mimohud:check-usage

显示 MiMo 平台的详细 token 使用情况，包括按日和按模型的统计。

## 执行

运行 test-run 脚本获取完整的用量数据：

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/test-run.js
```

如果脚本不存在或执行失败，提示用户：

1. 确认已配置 cookie：检查 `~/.mimo-hud.json` 是否存在
2. 确认已编译：在项目目录运行 `npm run build`
3. 或直接运行 `npm run dev` 使用交互式 HUD

## 输出说明

输出包含三部分：
- **套餐额度 + 补偿积分**：当前用量和百分比
- **按日统计**：最近几天的 token 消耗趋势
- **按模型统计**：各模型的 token 用量、请求数、缓存命中率
