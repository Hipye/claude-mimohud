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
      const results = await Promise.allSettled([
        fetchPlanUsage(cookie),
        fetchPlanDetail(cookie),
        fetchDailyUsage(cookie, now.getFullYear(), now.getMonth() + 1),
      ]);
      const usage = results[0].status === "fulfilled" ? results[0].value : null;
      const detail = results[1].status === "fulfilled" ? results[1].value : null;
      const daily = results[2].status === "fulfilled" ? results[2].value : null;
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      setState((s) => ({
        planUsage: usage ?? s.planUsage,
        planDetail: detail ?? s.planDetail,
        dailyUsage: daily ?? s.dailyUsage,
        loading: false,
        error: errors.length > 0 ? errors.join("; ") : null,
        lastRefresh: new Date(),
      }));
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
