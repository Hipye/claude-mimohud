import React, { useState } from "react";
import { Text, Box, useInput, useApp } from "ink";
import { useStore } from "../store.js";
import HudLine from "./HudLine.js";
import DailyView from "./DailyView.js";
import ModelView from "./ModelView.js";

interface Props {
  cookie: string;
  refreshInterval: number;
  showDaily?: boolean;
  showModel?: boolean;
}

export default function App({ cookie, refreshInterval, showDaily: initDaily = false, showModel: initModel = false }: Props) {
  const { planUsage, planDetail, dailyUsage, loading, error, refresh } =
    useStore(cookie, refreshInterval);
  const [showDaily, setShowDaily] = useState(initDaily);
  const [showModel, setShowModel] = useState(initModel);
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === "q") exit();
    if (input === "r") refresh();
    if (input === "d") setShowDaily((v) => !v);
    if (input === "m") setShowModel((v) => !v);
  });

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  if (loading && !planUsage) {
    return <Text>Loading...</Text>;
  }

  if (!planUsage || !planDetail) {
    return <Text>Loading...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text bold>MiMo Token HUD</Text>
      <HudLine usage={planUsage} detail={planDetail} />
      {showDaily && <DailyView data={dailyUsage} />}
      {showModel && <ModelView data={dailyUsage} />}
    </Box>
  );
}
