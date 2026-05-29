import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".mimo-hud.json");

export interface Config {
  cookie: string;
  refreshInterval: number;
}

const DEFAULT_CONFIG: Config = {
  cookie: "",
  refreshInterval: 5,
};

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      cookie: parsed.cookie ?? DEFAULT_CONFIG.cookie,
      refreshInterval: parsed.refreshInterval ?? DEFAULT_CONFIG.refreshInterval,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
