/**
 * 自动提取 MiMo 平台 Cookie
 *
 * 用法：
 *   npx tsx scripts/refresh-cookie.ts          # 打开浏览器，手动登录后自动提取
 *   npx tsx scripts/refresh-cookie.ts --headless # 无头模式（需已有登录态）
 */
import puppeteer from "puppeteer";
import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_PATH = path.join(os.homedir(), ".mimo-hud.json");
const TARGET_URL = "https://platform.xiaomimimo.com/console/plan-manage";
const LOGIN_TIMEOUT_MS = 300_000;
const PAGE_LOAD_TIMEOUT_MS = 30_000;

const REQUIRED_COOKIES = [
  "api-platform_serviceToken",
  "userId",
  "api-platform_slh",
  "api-platform_ph",
];

async function main() {
  const headless = process.argv.includes("--headless");

  let browser: puppeteer.Browser | null = null;
  try {
    console.log("启动浏览器...");
    browser = await puppeteer.launch({
      headless: headless ? "new" : false,
      defaultViewport: null,
      args: ["--start-maximized", "--disable-extensions"],
    });

    const page = await browser.newPage();

    // Set reasonable timeouts
    page.setDefaultNavigationTimeout(PAGE_LOAD_TIMEOUT_MS);
    page.setDefaultTimeout(PAGE_LOAD_TIMEOUT_MS);

    try {
      await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    } catch (err) {
      console.error("无法访问 MiMo 平台，请检查网络连接");
      process.exit(1);
    }

    // 检测是否需要登录
    const needsLogin = () => {
      const url = page.url();
      return url.includes("login") || url.includes("passport");
    };

    if (needsLogin()) {
      console.log("\n========================================");
      console.log("请在弹出的浏览器窗口中完成登录");
      console.log("登录成功后会自动提取 Cookie");
      console.log("========================================\n");

      try {
        await page.waitForFunction(
          () =>
            window.location.href.includes(
              "platform.xiaomimimo.com/console"
            ),
          { timeout: LOGIN_TIMEOUT_MS }
        );
        await page.waitForNetworkIdle({ timeout: 10_000 }).catch(() => {});
      } catch {
        console.error("登录超时，请重试");
        process.exit(1);
      }
    }

    // 确认已在目标页面
    if (needsLogin()) {
      console.error("登录失败，请重试");
      process.exit(1);
    }

    // 通过 CDP 获取所有 Cookie（包括 httpOnly）
    const client = await page.createCDPSession();
    const { cookies } = await client.send("Network.getAllCookies");

    // 筛选目标 Cookie
    const platformCookies = cookies.filter((c) =>
      c.domain.includes("xiaomimimo.com")
    );

    const cookieMap = new Map(platformCookies.map((c) => [c.name, c.value]));
    const missing = REQUIRED_COOKIES.filter((name) => !cookieMap.has(name));

    if (missing.length > 0) {
      console.error(`缺少必需 Cookie: ${missing.join(", ")}`);
      console.error("请确认已登录成功");
      process.exit(1);
    }

    // 拼接 Cookie 字符串（去掉引号）
    const cookieStr = REQUIRED_COOKIES.map(
      (name) => `${name}=${cookieMap.get(name)}`
    ).join("; ");

    // 读取现有配置，保留 refreshInterval
    let config: Record<string, unknown> = {};
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      }
    } catch {
      // ignore parse errors
    }

    config.cookie = cookieStr;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");

    console.log(`Cookie 已更新 → ${CONFIG_PATH}`);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("Could not find Chrome")) {
        console.error("未找到 Chrome 浏览器，请先安装 Chrome");
      } else {
        console.error(`错误: ${err.message}`);
      }
    } else {
      console.error("未知错误");
    }
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main();
