import React from "react";
import { Text } from "ink";
import chalk from "chalk";
import type { PlanUsage, PlanDetail } from "../api.js";
import { progressBar, formatTokens } from "../utils.js";

interface Props {
  usage: PlanUsage;
  detail: PlanDetail;
}

export default function HudLine({ usage, detail }: Props) {
  const planPercent = usage.planLimit > 0 ? (usage.planUsed / usage.planLimit) * 100 : 0;
  const compPercent = usage.compensationLimit > 0 ? (usage.compensationUsed / usage.compensationLimit) * 100 : 0;
  const planBar = progressBar(usage.planUsed, usage.planLimit);
  const compBar = progressBar(usage.compensationUsed, usage.compensationLimit);
  const planStr = `套餐额度 ${planBar} ${planPercent.toFixed(1)}% ${formatTokens(usage.planUsed)}/${formatTokens(usage.planLimit)}`;
  const compStr = `补偿积分 ${compBar} ${compPercent.toFixed(1)}% ${formatTokens(usage.compensationUsed)}/${formatTokens(usage.compensationLimit)}`;
  const detailStr = `${detail.planName} | ${detail.periodEnd}到期 | 续费${detail.autoRenew ? "✓" : "✗"}`;

  return (
    <Text>
      {planStr} {chalk.dim("|")} {compStr} {chalk.dim("|")} {detailStr}
    </Text>
  );
}
