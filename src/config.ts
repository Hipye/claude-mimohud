import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".mimo-hud.json");

const REQUIRED_COOKIE_KEYS = [
  "api-platform_serviceToken",
  "userId",
  "api-platform_slh",
  "api-platform_ph",
];

/** 将浏览器原始 Cookie 字符串清洗为 API 所需格式 */
export function normalizeCookie(raw: string): string {
  const pairs = raw.split(";").map((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return [part.trim(), ""] as const;
    const key = part.slice(0, idx).trim();
    let val = part.slice(idx + 1).trim();
    val = decodeURIComponent(val);
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    return [key, val] as const;
  });
  return pairs
    .filter(([k]) => REQUIRED_COOKIE_KEYS.includes(k))
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

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
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf-8").trim();
  } catch {
    return DEFAULT_CONFIG;
  }
  try {
    const parsed = JSON.parse(raw);
    const rawCookie = parsed.cookie ?? DEFAULT_CONFIG.cookie;
    return {
      cookie: rawCookie ? normalizeCookie(rawCookie) : rawCookie,
      refreshInterval: Math.max(1, parsed.refreshInterval ?? DEFAULT_CONFIG.refreshInterval),
    };
  } catch {
    // 文件内容不是 JSON，当作原始 Cookie 字符串处理
    const cookie = normalizeCookie(raw);
    return cookie ? { ...DEFAULT_CONFIG, cookie } : DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
