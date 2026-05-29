import React, { useState } from "react";
import { Text, Box, useInput, useApp } from "ink";
import { useStore } from "../store.js";
import HudLine from "./HudLine.js";
import DailyView from "./DailyView.js";
import ModelView from "./ModelView.js";

interface KeyBindingsProps {
  onRefresh: () => void;
  onToggleDaily: () => void;
  onToggleModel: () => void;
}

function KeyBindings({ onRefresh, onToggleDaily, onToggleModel }: KeyBindingsProps) {
  const { exit } = useApp();
  useInput((input) => {
    if (input === "q") exit();
    if (input === "r") onRefresh();
    if (input === "d") onToggleDaily();
    if (input === "m") onToggleModel();
  });
  return null;
}

interface Props {
  cookie: string;
  refreshInterval: number;
  showDaily?: boolean;
  showModel?: boolean;
}

export default function App({ cookie, refreshInterval, showDaily = false, showModel = false }: Props) {
  const { planUsage, planDetail, dailyUsage, loading, error, lastRefresh, refresh } =
    useStore(cookie, refreshInterval);
  const [daily, setDaily] = useState(showDaily);
  const [model, setModel] = useState(showModel);

  const isRefreshing = loading && planUsage !== null;

  return (
    <Box flexDirection="column">
      {process.stdin.isTTY && (
        <KeyBindings
          onRefresh={refresh}
          onToggleDaily={() => setDaily((v) => !v)}
          onToggleModel={() => setModel((v) => !v)}
        />
      )}
      {error && <Text color="red">{error}</Text>}
      {loading && !planUsage && <Text>加载中...</Text>}
      {planUsage && planDetail && (
        <>
          <Text>
            <Text bold>MiMo Token HUD</Text>
            {isRefreshing && <Text dimColor> 刷新中...</Text>}
            {lastRefresh && !isRefreshing && <Text dimColor> {lastRefresh.toLocaleTimeString()}</Text>}
          </Text>
          <HudLine usage={planUsage} detail={planDetail} />
          {daily && <DailyView data={dailyUsage} />}
          {model && <ModelView data={dailyUsage} />}
        </>
      )}
      {process.stdin.isTTY && planUsage && (
        <Text dimColor>[d] 日统计  [m] 模型统计  [r] 刷新  [q] 退出</Text>
      )}
    </Box>
  );
}
