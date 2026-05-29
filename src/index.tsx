#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import meow from "meow";
import { loadConfig, getConfigPath } from "./config.js";
import App from "./components/App.js";

const cli = meow(
  `
  Usage
    $ mimo-hud

  Options
    --configure, -c  Set up cookie configuration
    --interval, -i   Refresh interval in minutes (default: 5)
    --daily, -d      Show daily usage view
    --model, -m      Show model statistics view
    --all, -a        Show all views (daily + model)

  Keyboard shortcuts (interactive mode only)
    d  Toggle daily usage view
    m  Toggle model statistics view
    r  Force refresh
    q  Quit
`,
  {
    importMeta: import.meta,
    flags: {
      configure: { type: "boolean", shortFlag: "c" },
      interval: { type: "number", shortFlag: "i" },
      daily: { type: "boolean", shortFlag: "d" },
      model: { type: "boolean", shortFlag: "m" },
      all: { type: "boolean", shortFlag: "a" },
    },
  }
);

const config = loadConfig();

if (cli.flags.configure) {
  console.log(`Config file: ${getConfigPath()}`);
  console.log("");
  console.log("To configure:");
  console.log("1. Open https://platform.xiaomimimo.com/console/plan-manage in your browser");
  console.log("2. Open DevTools (F12) → Network tab");
  console.log("3. Refresh the page, click any API request");
  console.log("4. Copy the Cookie header value");
  console.log(`5. Paste the raw Cookie string into ${getConfigPath()}`);
  console.log("");
  console.log("Supports raw browser Cookie directly (URL-encoded, quoted values auto-converted).");
  console.log("Example file content:");
  console.log('  api-platform_serviceToken=xxx; userId=123; api-platform_slh=xxx; api-platform_ph=xxx');
  process.exit(0);
}

if (!config.cookie) {
  console.error("No cookie configured. Run `mimo-hud --configure` to set up.");
  process.exit(1);
}

const refreshInterval = Math.max(1, cli.flags.interval ?? config.refreshInterval);

const showAll = cli.flags.all;

render(
  <App
    cookie={config.cookie}
    refreshInterval={refreshInterval}
    showDaily={showAll || cli.flags.daily}
    showModel={showAll || cli.flags.model}
  />
);
