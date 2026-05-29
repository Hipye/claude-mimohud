import React from "react";
import { Text } from "ink";
import chalk from "chalk";
import type { DailyUsage } from "../api.js";
import { formatTokens, aggregateDailyByDate } from "../utils.js";

function miniBar(tokens: number, maxTokens: number, width = 20): string {
  const ratio = maxTokens > 0 ? tokens / maxTokens : 0;
  const filled = Math.round(ratio * width);
  return chalk.cyan("█".repeat(filled)) + chalk.gray("░".repeat(width - filled));
}

interface Props {
  data: DailyUsage[];
}

export default function DailyView({ data }: Props) {
  const sorted = aggregateDailyByDate(data);

  if (sorted.length === 0) {
    return <Text dimColor>暂无数据</Text>;
  }

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
