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

interface ModelAgg {
  model: string;
  totalToken: number;
  requestCount: number;
  inputHitToken: number;
  inputMissToken: number;
}

interface Props {
  data: DailyUsage[];
}

export default function ModelView({ data }: Props) {
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

  const models = [...agg.values()].sort((a, b) => b.totalToken - a.totalToken);

  return (
    <>
      {models.map((m) => {
        const totalInput = m.inputHitToken + m.inputMissToken;
        const hitRate = totalInput > 0 ? (m.inputHitToken / totalInput) * 100 : 0;
        return (
          <Text key={m.model}>
            {m.model.padEnd(14)} {formatTokens(m.totalToken).padStart(12)}   {String(m.requestCount).padStart(6)} req   {Math.round(hitRate)}% cache
          </Text>
        );
      })}
    </>
  );
}
