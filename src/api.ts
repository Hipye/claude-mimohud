const BASE_URL = "https://platform.xiaomimimo.com/api/v1";

export interface PlanUsage {
  planUsed: number;
  planLimit: number;
  planPercent: number;
  compensationUsed: number;
  compensationLimit: number;
  compensationPercent: number;
}

export interface PlanDetail {
  planName: string;
  periodEnd: string;
  autoRenew: boolean;
}

export interface DailyUsage {
  date: string;
  model: string;
  totalToken: number;
  inputHitToken: number;
  inputMissToken: number;
  outputToken: number;
  requestCount: number;
}

async function request<T>(
  path: string,
  cookie: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      "x-timezone": "Asia/Shanghai",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as { code: number; message: string; data: T };
  if (json.code !== 0) {
    throw new Error(`API error: ${json.message}`);
  }
  return json.data;
}

export async function fetchPlanUsage(cookie: string): Promise<PlanUsage> {
  const data = await request<{
    usage: {
      items: { name: string; used: number; limit: number; percent: number }[];
    };
  }>("/tokenPlan/usage", cookie);

  const plan = data.usage.items.find((i) => i.name === "plan_total_token");
  const comp = data.usage.items.find(
    (i) => i.name === "compensation_total_token"
  );

  return {
    planUsed: plan?.used ?? 0,
    planLimit: plan?.limit ?? 0,
    planPercent: plan?.percent ?? 0,
    compensationUsed: comp?.used ?? 0,
    compensationLimit: comp?.limit ?? 0,
    compensationPercent: comp?.percent ?? 0,
  };
}

export async function fetchPlanDetail(cookie: string): Promise<PlanDetail> {
  const data = await request<{
    planName: string;
    currentPeriodEnd: string;
    hasAutoRenewSubscribed: boolean;
  }>("/tokenPlan/detail", cookie);

  return {
    planName: data.planName,
    periodEnd: data.currentPeriodEnd.split(" ")[0],
    autoRenew: data.hasAutoRenewSubscribed,
  };
}

export async function fetchDailyUsage(
  cookie: string,
  year: number,
  month: number
): Promise<DailyUsage[]> {
  // Extract api-platform_ph from cookie for query parameter
  const phMatch = cookie.match(/api-platform_ph="?([^";]+)/);
  const ph = phMatch ? encodeURIComponent(phMatch[1]) : "";
  const path = ph ? `/usage/token-plan/list?api-platform_ph=${ph}` : "/usage/token-plan/list";

  return request<DailyUsage[]>(
    path,
    cookie,
    { method: "POST", body: { year, month } }
  );
}
