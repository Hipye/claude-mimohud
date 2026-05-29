import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./config.js";
import { fetchPlanUsage, fetchPlanDetail, fetchDailyUsage } from "./api.js";
import type { PlanUsage, PlanDetail, DailyUsage } from "./api.js";
import { aggregateByModel } from "./utils.js";

const CACHE_PATH = join(tmpdir(), "claude-mimohud-cache.json");
const CACHE_TTL_MS = 60_000;

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
    const cached = JSON.parse(readFileSync(CACHE_PATH, "utf-8")) as CacheEntry;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) return cached;
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

async function main() {
  await drainStdin();

  const config = loadConfig();
  if (!config.cookie) {
    console.log("MiMo: \x1b[33m未配置\x1b[0m (run /claude-mimohud:setup)");
    return;
  }

  let data = readCache();
  if (!data) {
    const now = new Date();
    const results = await Promise.allSettled([
      fetchPlanUsage(config.cookie),
      fetchPlanDetail(config.cookie),
      fetchDailyUsage(config.cookie, now.getFullYear(), now.getMonth() + 1),
    ]);
    if (results[0].status === "fulfilled" && results[1].status === "fulfilled") {
      const daily = results[2].status === "fulfilled" ? results[2].value : [];
      data = { timestamp: Date.now(), planUsage: results[0].value, planDetail: results[1].value, dailyUsage: daily };
      writeCache(data);
    } else {
      console.log("MiMo: \x1b[31m获取失败\x1b[0m");
      return;
    }
  }

  const { planUsage: u, planDetail: d, dailyUsage } = data;
  const planPct = u.planLimit > 0 ? (u.planUsed / u.planLimit) * 100 : 0;
  const planBar = progressBar(planPct);
  const parts = [
    `MiMo 套餐 ${planBar} ${planPct.toFixed(1)}% \x1b[37m${formatTokens(u.planUsed)}\x1b[0m/\x1b[32m${formatTokens(u.planLimit)}\x1b[0m`,
  ];

  if (u.compensationLimit > 0) {
    const compPct = (u.compensationUsed / u.compensationLimit) * 100;
    const compBar = progressBar(compPct);
    parts.push(`补偿 ${compBar} ${compPct.toFixed(1)}% \x1b[37m${formatTokens(u.compensationUsed)}\x1b[0m/\x1b[32m${formatTokens(u.compensationLimit)}\x1b[0m`);
  }

  const models = aggregateByModel(dailyUsage).slice(0, 2);
  if (models.length > 0) {
    const modelStr = models
      .map((m) => {
        const totalInput = m.inputHitToken + m.inputMissToken;
        const hitRate = totalInput > 0 ? Math.round((m.inputHitToken / totalInput) * 100) : 0;
        const shortName = m.model.replace(/^mimo-/, "");
        return `\x1b[48;2;255;239;224m\x1b[38;2;235;125;22m${shortName}\x1b[0m ${formatTokens(m.totalToken)} ${m.requestCount}req ${hitRate}%cache`;
      })
      .join(" && ");
    parts.push(modelStr);
  }

  parts.push(`${d.periodEnd}到期`);
  console.log(parts.join(" \x1b[90m|\x1b[0m "));
}

main();
