import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig } from "./config.js";
import { fetchPlanUsage, fetchPlanDetail } from "./api.js";
import type { PlanUsage, PlanDetail } from "./api.js";

const CACHE_PATH = join(tmpdir(), "claude-mimohud-cache.json");
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  timestamp: number;
  planUsage: PlanUsage;
  planDetail: PlanDetail;
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
  return `\x1b[32m${"█".repeat(filled)}\x1b[90m${"░".repeat(empty)}\x1b[0m`;
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
    const results = await Promise.allSettled([
      fetchPlanUsage(config.cookie),
      fetchPlanDetail(config.cookie),
    ]);
    if (results[0].status === "fulfilled" && results[1].status === "fulfilled") {
      data = { timestamp: Date.now(), planUsage: results[0].value, planDetail: results[1].value };
      writeCache(data);
    } else {
      console.log("MiMo: \x1b[31m获取失败\x1b[0m");
      return;
    }
  }

  const { planUsage: u, planDetail: d } = data;
  const planBar = progressBar(u.planPercent);
  const compBar = progressBar(u.compensationPercent);
  const output = [
    `MiMo 套餐 ${planBar} ${u.planPercent.toFixed(1)}% ${formatTokens(u.planUsed)}/${formatTokens(u.planLimit)}`,
    `补偿 ${compBar} ${u.compensationPercent.toFixed(1)}% ${formatTokens(u.compensationUsed)}/${formatTokens(u.compensationLimit)}`,
    d.planName,
    `${d.periodEnd}到期`,
    `续费${d.autoRenew ? "✓" : "✗"}`,
  ].join(" \x1b[90m|\x1b[0m ");
  console.log(output);
}

main();
