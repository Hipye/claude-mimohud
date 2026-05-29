import React from "react";
import { Text } from "ink";
import chalk from "chalk";
import type { PlanUsage, PlanDetail } from "../api.js";

function progressBar(percent: number, width = 10): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return chalk.green("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  usage: PlanUsage;
  detail: PlanDetail;
}

export default function HudLine({ usage, detail }: Props) {
  const planBar = progressBar(usage.planPercent);
  const compBar = progressBar(usage.compensationPercent);
  const planStr = `套餐额度 ${planBar} ${usage.planPercent.toFixed(1)}% ${formatTokens(usage.planUsed)}/${formatTokens(usage.planLimit)}`;
  const compStr = `补偿积分 ${compBar} ${usage.compensationPercent.toFixed(1)}% ${formatTokens(usage.compensationUsed)}/${formatTokens(usage.compensationLimit)}`;
  const detailStr = `${detail.planName} | ${detail.periodEnd}到期 | 续费${detail.autoRenew ? "✓" : "✗"}`;

  return (
    <Text>
      {planStr} {chalk.dim("|")} {compStr} {chalk.dim("|")} {detailStr}
    </Text>
  );
}
