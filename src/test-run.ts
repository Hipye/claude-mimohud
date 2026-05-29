import { loadConfig } from "./config.js";
import { fetchPlanUsage, fetchPlanDetail, fetchDailyUsage } from "./api.js";
import { formatTokens, aggregateDailyByDate, aggregateByModel } from "./utils.js";

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
    const sorted = aggregateDailyByDate(daily, 5);
    const maxTokens = Math.max(...sorted.map(([, v]) => v), 1);

    console.log("\n最近 5 天消耗:");
    for (const [date, tokens] of sorted) {
      const ratio = tokens / maxTokens;
      const filled = Math.round(ratio * 20);
      const bar = "█".repeat(filled) + "░".repeat(20 - filled);
      console.log(`  ${date.slice(5)} ${bar} ${formatTokens(tokens)}`);
    }

    // Model stats
    const models = aggregateByModel(daily);

    console.log("\n模型统计:");
    for (const m of models) {
      const totalInput = m.inputHitToken + m.inputMissToken;
      const hitRate = totalInput > 0 ? Math.round((m.inputHitToken / totalInput) * 100) : 0;
      console.log(`  ${m.model.padEnd(14)} ${formatTokens(m.totalToken).padStart(12)}   ${String(m.requestCount).padStart(6)} req   ${hitRate}% cache`);
    }

  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
