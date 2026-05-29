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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: options?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "x-timezone": "Asia/Shanghai",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    let json: { code: number; message: string; data: T };
    try {
      json = (await res.json()) as { code: number; message: string; data: T };
    } catch {
      throw new Error("服务器返回了无法解析的响应");
    }
    if (json.code !== 0) {
      throw new Error(`API error: ${json.message}`);
    }
    return json.data;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPlanUsage(cookie: string): Promise<PlanUsage> {
  const data = await request<{
    usage: {
      items: { name: string; used: number; limit: number; percent: number }[];
    };
  }>("/tokenPlan/usage", cookie);

  const items = data.usage?.items ?? [];
  const plan = items.find((i) => i.name === "plan_total_token");
  const comp = items.find(
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
    planName: data.planName ?? "未知套餐",
    periodEnd: data.currentPeriodEnd ? data.currentPeriodEnd.split(" ")[0] : "未知",
    autoRenew: data.hasAutoRenewSubscribed ?? false,
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

  const data = await request<DailyUsage[]>(
    path,
    cookie,
    { method: "POST", body: { year, month } }
  );
  return Array.isArray(data) ? data : [];
}
