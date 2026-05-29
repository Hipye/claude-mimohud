import React from "react";
import { Text } from "ink";
import type { DailyUsage } from "../api.js";
import { formatTokens, aggregateByModel } from "../utils.js";

interface Props {
  data: DailyUsage[];
}

export default function ModelView({ data }: Props) {
  const models = aggregateByModel(data);

  if (models.length === 0) {
    return <Text dimColor>暂无数据</Text>;
  }

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
