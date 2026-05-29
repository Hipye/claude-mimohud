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

  Keyboard shortcuts
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
  console.log(`5. Paste it into ${getConfigPath()} as the "cookie" field`);
  console.log("");
  console.log("Example:");
  console.log(JSON.stringify({ cookie: "api-platform_serviceToken=...; userId=...", refreshInterval: 5 }, null, 2));
  process.exit(0);
}

if (!config.cookie) {
  console.error("No cookie configured. Run `mimo-hud --configure` to set up.");
  process.exit(1);
}

const refreshInterval = cli.flags.interval ?? config.refreshInterval;

render(<App cookie={config.cookie} refreshInterval={refreshInterval} />);
