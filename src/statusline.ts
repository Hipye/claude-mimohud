import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { fetchPlanUsage, fetchPlanDetail, fetchDailyUsage } from "./api.js";
import type { PlanUsage, PlanDetail, DailyUsage } from "./api.js";
import { aggregateByModel } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_PATH = join(tmpdir(), "claude-mimohud-cache.json");
const CACHE_TTL_MS = 60_000;
const PROJECT_ROOT = join(__dirname, "..");

interface CacheEntry {
  timestamp: number;
  planUsage: PlanUsage;
  planDetail: PlanDetail;
  dailyUsage: DailyUsage[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function progressBar(percent: number, width = 10): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `\x1b[90m${"█".repeat(filled)}\x1b[32m${"█".repeat(empty)}\x1b[0m`;
}

function readCache(): CacheEntry | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const cached = JSON.parse(raw) as CacheEntry;
    // Validate cache structure
    if (
      typeof cached.timestamp !== "number" ||
      !cached.planUsage ||
      !cached.planDetail
    ) {
      return null;
    }
    if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.dailyUsage) {
      return cached;
    }
  } catch {
    // ignore cache errors
  }
  return null;
}

function writeCache(entry: CacheEntry): void {
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(entry));
  } catch {
    // ignore write errors
  }
}

async function drainStdin(): Promise<void> {
  process.stdin.resume();
  await new Promise<void>((resolve) => process.stdin.on("end", resolve));
}

function is401Error(err: unknown): boolean {
  return err instanceof Error && err.message.includes("HTTP 401");
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("networkerror") ||
    msg.includes("enotfound") ||
    msg.includes("econnrefused") ||
    msg.includes("timeout") ||
    msg.includes("aborterror")
  );
}

async function refreshCookie(): Promise<boolean> {
  const scriptPath = join(PROJECT_ROOT, "scripts", "refresh-cookie.ts");
  if (!existsSync(scriptPath)) {
    return false;
  }
  try {
    execSync(`npx tsx "${scriptPath}" --headless`, {
      cwd: PROJECT_ROOT,
      stdio: "ignore",
      timeout: 120_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function fetchData(cookie: string) {
  const now = new Date();
  const results = await Promise.allSettled([
    fetchPlanUsage(cookie),
    fetchPlanDetail(cookie),
    fetchDailyUsage(cookie, now.getFullYear(), now.getMonth() + 1),
  ]);
  return results;
}

function extractData(
  results: PromiseSettledResult<unknown>[]
): CacheEntry | null {
  if (results[0].status === "fulfilled" && results[1].status === "fulfilled") {
    const daily = results[2].status === "fulfilled" ? results[2].value : [];
    return {
      timestamp: Date.now(),
      planUsage: results[0].value as PlanUsage,
      planDetail: results[1].value as PlanDetail,
      dailyUsage: daily as DailyUsage[],
    };
  }
  return null;
}

async function main() {
  await drainStdin();

  let config: { cookie: string; refreshInterval?: number };
  try {
    config = loadConfig();
  } catch {
    console.log("MiMo: \x1b[31m配置加载失败\x1b[0m");
    return;
  }

  if (!config.cookie) {
    console.log("MiMo: \x1b[33m未配置\x1b[0m (run /claude-mimohud:setup)");
    return;
  }

  let data = readCache();
  if (!data) {
    const results = await fetchData(config.cookie);

    // Check for 401 errors and auto-refresh cookie
    const has401 = results.some((r) => r.status === "rejected" && is401Error(r.reason));
    const hasNetworkError = results.every(
      (r) => r.status === "rejected" && isNetworkError(r.reason)
    );

    if (hasNetworkError) {
      console.log("MiMo: \x1b[31m网络错误\x1b[0m");
      return;
    }

    if (has401) {
      const refreshed = await refreshCookie();
      if (!refreshed) {
        console.log("MiMo: \x1b[31mCookie 过期，刷新失败\x1b[0m");
        return;
      }

      // Reload config and retry
      try {
        config = loadConfig();
      } catch {
        console.log("MiMo: \x1b[31m配置重载失败\x1b[0m");
        return;
      }

      const retry = await fetchData(config.cookie);
      const retry401 = retry.some((r) => r.status === "rejected" && is401Error(r.reason));
      if (retry401) {
        console.log("MiMo: \x1b[31m登录失败，请重试\x1b[0m");
        return;
      }

      data = extractData(retry);
      if (!data) {
        console.log("MiMo: \x1b[31m获取失败\x1b[0m");
        return;
      }
      writeCache(data);
    } else {
      data = extractData(results);
      if (!data) {
        console.log("MiMo: \x1b[31m获取失败\x1b[0m");
        return;
      }
      writeCache(data);
    }
  }

  if (!data) return;
  const { planUsage: u, planDetail: d } = data;
  const dailyUsage = data.dailyUsage ?? [];
  const planPct = u.planLimit > 0 ? (u.planUsed / u.planLimit) * 100 : 0;
  const planBar = progressBar(planPct);
  const parts = [
    `MiMo 套餐 ${planBar} ${planPct.toFixed(1)}% \x1b[37m${formatTokens(u.planUsed)}\x1b[0m/\x1b[32m${formatTokens(u.planLimit)}\x1b[0m`,
  ];

  if (u.compensationLimit > 0) {
    const compPct = (u.compensationUsed / u.compensationLimit) * 100;
    const compBar = progressBar(compPct);
    parts.push(
      `补偿 ${compBar} ${compPct.toFixed(1)}% \x1b[37m${formatTokens(u.compensationUsed)}\x1b[0m/\x1b[32m${formatTokens(u.compensationLimit)}\x1b[0m`
    );
  }

  const models = aggregateByModel(dailyUsage).slice(0, 2);
  if (models.length > 0) {
    const modelStr = models
      .map((m) => {
        const totalInput = m.inputHitToken + m.inputMissToken;
        const hitRate =
          totalInput > 0 ? Math.round((m.inputHitToken / totalInput) * 100) : 0;
        const shortName = m.model.replace(/^mimo-/, "");
        return `\x1b[38;2;235;125;22m${shortName}\x1b[0m \x1b[37m${formatTokens(m.totalToken)} ${m.requestCount}req ${hitRate}%cache\x1b[0m`;
      })
      .join(" && ");
    parts.push(modelStr);
  }

  // Calculate remaining time
  const now = new Date();
  const endDate = new Date(d.periodEnd + "T23:59:59");
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs > 0) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    parts.push(`剩余 \x1b[37m${days}天${hours}时\x1b[0m`);
  } else {
    parts.push(`\x1b[31m已到期\x1b[0m`);
  }
  console.log(parts.join(" \x1b[90m|\x1b[0m "));
}

main();
