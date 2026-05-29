import { useState, useEffect, useCallback } from "react";
import {
  fetchPlanUsage,
  fetchPlanDetail,
  fetchDailyUsage,
  type PlanUsage,
  type PlanDetail,
  type DailyUsage,
} from "./api.js";

export interface StoreState {
  planUsage: PlanUsage | null;
  planDetail: PlanDetail | null;
  dailyUsage: DailyUsage[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

export function useStore(cookie: string, intervalMinutes: number) {
  const [state, setState] = useState<StoreState>({
    planUsage: null,
    planDetail: null,
    dailyUsage: [],
    loading: true,
    error: null,
    lastRefresh: null,
  });

  const refresh = useCallback(async () => {
    if (!cookie) {
      setState((s) => ({ ...s, loading: false, error: "No cookie configured" }));
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const now = new Date();
      const [usage, detail, daily] = await Promise.all([
        fetchPlanUsage(cookie),
        fetchPlanDetail(cookie),
        fetchDailyUsage(cookie, now.getFullYear(), now.getMonth() + 1),
      ]);
      setState({
        planUsage: usage,
        planDetail: detail,
        dailyUsage: daily,
        loading: false,
        error: null,
        lastRefresh: new Date(),
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [cookie]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMinutes * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh, intervalMinutes]);

  return { ...state, refresh };
}
