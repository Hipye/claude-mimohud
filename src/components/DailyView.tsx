import React from "react";
import { Text } from "ink";
import chalk from "chalk";
import type { DailyUsage } from "../api.js";

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function miniBar(tokens: number, maxTokens: number, width = 20): string {
  const ratio = maxTokens > 0 ? tokens / maxTokens : 0;
  const filled = Math.round(ratio * width);
  return chalk.cyan("█".repeat(filled)) + chalk.gray("░".repeat(width - filled));
}

interface Props {
  data: DailyUsage[];
}

export default function DailyView({ data }: Props) {
  const byDate = new Map<string, number>();
  for (const item of data) {
    byDate.set(item.date, (byDate.get(item.date) ?? 0) + item.totalToken);
  }
  const sorted = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);
  const maxTokens = Math.max(...sorted.map(([, v]) => v), 1);

  return (
    <>
      {sorted.map(([date, tokens]) => (
        <Text key={date}>
          {chalk.dim(date.slice(5))} {miniBar(tokens, maxTokens)} {formatTokens(tokens)}
        </Text>
      ))}
    </>
  );
}
