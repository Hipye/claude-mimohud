import { loadConfig } from "./config.js";
import { fetchPlanUsage, fetchPlanDetail, fetchDailyUsage } from "./api.js";

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function progressBar(percent: number, width = 10): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

async function main() {
  const config = loadConfig();
  if (!config.cookie) {
    console.error("No cookie configured. Run `mimo-hud --configure` to set up.");
    process.exit(1);
  }

  console.log("MiMo Token HUD\n");

  // Test each API individually
  console.log("Testing fetchPlanUsage...");
  try {
    const usage = await fetchPlanUsage(config.cookie);
    console.log("  OK:", usage.planPercent + "%");
  } catch (err) {
    console.log("  FAIL:", err instanceof Error ? err.message : err);
  }

  console.log("Testing fetchPlanDetail...");
  try {
    const detail = await fetchPlanDetail(config.cookie);
    console.log("  OK:", detail.planName, detail.periodEnd);
  } catch (err) {
    console.log("  FAIL:", err instanceof Error ? err.message : err);
  }

  console.log("Testing fetchDailyUsage...");
  try {
    const daily = await fetchDailyUsage(config.cookie, 2026, 5);
    console.log("  OK:", daily.length, "entries");
  } catch (err) {
    console.log("  FAIL:", err instanceof Error ? err.message : err);
  }

  console.log();

  try {
    const [usage, detail, daily] = await Promise.all([
      fetchPlanUsage(config.cookie),
      fetchPlanDetail(config.cookie),
      fetchDailyUsage(config.cookie, new Date().getFullYear(), new Date().getMonth() + 1),
    ]);

    // Main HUD line
    const planBar = progressBar(usage.planPercent);
    const compBar = progressBar(usage.compensationPercent);
    console.log(`套餐额度 ${planBar} ${usage.planPercent.toFixed(1)}% ${formatTokens(usage.planUsed)}/${formatTokens(usage.planLimit)} | 补偿积分 ${compBar} ${usage.compensationPercent.toFixed(1)}% ${formatTokens(usage.compensationUsed)}/${formatTokens(usage.compensationLimit)} | ${detail.planName} | ${detail.periodEnd}到期 | 续费${detail.autoRenew ? "✓" : "✗"}`);

    // Daily usage
    const byDate = new Map<string, number>();
    for (const item of daily) {
      byDate.set(item.date, (byDate.get(item.date) ?? 0) + item.totalToken);
    }
    const sorted = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 5);
    const maxTokens = Math.max(...sorted.map(([, v]) => v), 1);

    console.log("\n最近 5 天消耗:");
    for (const [date, tokens] of sorted) {
      const ratio = tokens / maxTokens;
      const filled = Math.round(ratio * 20);
      const bar = "█".repeat(filled) + "░".repeat(20 - filled);
      console.log(`  ${date.slice(5)} ${bar} ${formatTokens(tokens)}`);
    }

    // Model stats
    const agg = new Map<string, { model: string; totalToken: number; requestCount: number; hitToken: number; missToken: number }>();
    for (const item of daily) {
      const existing = agg.get(item.model);
      if (existing) {
        existing.totalToken += item.totalToken;
        existing.requestCount += item.requestCount;
        existing.hitToken += item.inputHitToken;
        existing.missToken += item.inputMissToken;
      } else {
        agg.set(item.model, {
          model: item.model,
          totalToken: item.totalToken,
          requestCount: item.requestCount,
          hitToken: item.inputHitToken,
          missToken: item.inputMissToken,
        });
      }
    }
    const models = [...agg.values()].sort((a, b) => b.totalToken - a.totalToken);

    console.log("\n模型统计:");
    for (const m of models) {
      const totalInput = m.hitToken + m.missToken;
      const hitRate = totalInput > 0 ? Math.round((m.hitToken / totalInput) * 100) : 0;
      console.log(`  ${m.model.padEnd(14)} ${formatTokens(m.totalToken).padStart(12)}   ${String(m.requestCount).padStart(6)} req   ${hitRate}% cache`);
    }

  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
