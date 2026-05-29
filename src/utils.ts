import chalk from "chalk";
import type { DailyUsage } from "./api.js";

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function progressBar(used: number, limit: number, width = 10): string {
  const percent = limit > 0 ? (used / limit) * 100 : 0;
  const filled = Math.max(0, Math.min(Math.round((percent / 100) * width), width));
  const empty = width - filled;
  return chalk.white("█".repeat(filled)) + chalk.green("█".repeat(empty));
}

export function aggregateDailyByDate(data: DailyUsage[], topN = 10): [string, number][] {
  const byDate = new Map<string, number>();
  for (const item of data) {
    byDate.set(item.date, (byDate.get(item.date) ?? 0) + item.totalToken);
  }
  return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, topN);
}

export interface ModelAgg {
  model: string;
  totalToken: number;
  requestCount: number;
  inputHitToken: number;
  inputMissToken: number;
}

export function aggregateByModel(data: DailyUsage[]): ModelAgg[] {
  const agg = new Map<string, ModelAgg>();
  for (const item of data) {
    const existing = agg.get(item.model);
    if (existing) {
      existing.totalToken += item.totalToken;
      existing.requestCount += item.requestCount;
      existing.inputHitToken += item.inputHitToken;
      existing.inputMissToken += item.inputMissToken;
    } else {
      agg.set(item.model, {
        model: item.model,
        totalToken: item.totalToken,
        requestCount: item.requestCount,
        inputHitToken: item.inputHitToken,
        inputMissToken: item.inputMissToken,
      });
    }
  }
  return [...agg.values()].sort((a, b) => b.totalToken - a.totalToken);
}
