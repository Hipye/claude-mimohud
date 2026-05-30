import React from "react";
import { Text } from "ink";
import chalk from "chalk";
import type { PlanUsage, PlanDetail, DailyUsage } from "../api.js";
import { progressBar, formatTokens, aggregateByModel } from "../utils.js";

interface Props {
  usage: PlanUsage;
  detail: PlanDetail;
  dailyUsage: DailyUsage[];
}

function getRemainingTime(periodEnd: string): string {
  const now = new Date();
  const endDate = new Date(periodEnd + "T23:59:59");
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0) return chalk.red("已到期");
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `剩余 ${chalk.white(`${days}天${hours}时`)}`;
}

export default function HudLine({ usage, detail, dailyUsage }: Props) {
  const planPercent = usage.planLimit > 0 ? (usage.planUsed / usage.planLimit) * 100 : 0;
  const planBar = progressBar(usage.planUsed, usage.planLimit);
  const planStr = `套餐 ${planBar} ${planPercent.toFixed(1)}% ${chalk.white(formatTokens(usage.planUsed))}/${chalk.green(formatTokens(usage.planLimit))}`;

  const hasComp = usage.compensationLimit > 0;
  const compStr = hasComp
    ? (() => {
        const compPercent = (usage.compensationUsed / usage.compensationLimit) * 100;
        const compBar = progressBar(usage.compensationUsed, usage.compensationLimit);
        return `补偿 ${compBar} ${compPercent.toFixed(1)}% ${chalk.white(formatTokens(usage.compensationUsed))}/${chalk.green(formatTokens(usage.compensationLimit))}`;
      })()
    : null;

  const models = aggregateByModel(dailyUsage).slice(0, 2);
  const modelStr = models.length > 0
    ? models
        .map((m) => {
          const totalInput = m.inputHitToken + m.inputMissToken;
          const hitRate = totalInput > 0 ? Math.round((m.inputHitToken / totalInput) * 100) : 0;
          const shortName = m.model.replace(/^mimo-/, "");
          return `${chalk.hex("#eb7d16")(shortName)} ${chalk.white(`${formatTokens(m.totalToken)} ${m.requestCount}req ${hitRate}%cache`)}`;
        })
        .join(" && ")
    : null;

  const detailStr = getRemainingTime(detail.periodEnd);

  return (
    <Text>
      {planStr}
      {compStr && <>{chalk.dim(" | ")}{compStr}</>}
      {modelStr && <>{chalk.dim(" | ")}{modelStr}</>}
      {chalk.dim(" | ")}{detailStr}
    </Text>
  );
}
