import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.E2E_OUTPUT_DIR ?? "e2e-artifacts";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

async function verifyPage(context, { path, name, expectedText, mobile = false }) {
  const page = await context.newPage();
  const consoleErrors = [];
  const requestFailures = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);
  });

  const response = await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
  if (!response || !response.ok()) {
    failures.push(`${name}: HTTP ${response?.status() ?? "no response"} at ${path}`);
  }

  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes(expectedText)) {
    failures.push(`${name}: expected text not found: ${expectedText}`);
  }

  const suffix = mobile ? "-mobile" : "";
  await page.screenshot({ path: `${outputDir}/${name}${suffix}.png`, fullPage: true });

  if (consoleErrors.length) {
    failures.push(`${name}: console errors:\n${consoleErrors.join("\n")}`);
  }
  if (requestFailures.length) {
    failures.push(`${name}: failed requests:\n${requestFailures.join("\n")}`);
  }

  await page.close();
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await verifyPage(desktop, {
    path: "/",
    name: "home",
    expectedText: "Life and Business",
  });
  await verifyPage(desktop, {
    path: "/modules",
    name: "modules",
    expectedText: "One platform. Specialized modules.",
  });
  await verifyPage(desktop, {
    path: "/ai-teams",
    name: "ai-teams",
    expectedText: "AI",
  });
  await verifyPage(desktop, {
    path: "/about",
    name: "about",
    expectedText: "Z-Life",
  });
  await verifyPage(desktop, {
    path: "/auth/sign-in",
    name: "sign-in-safe-local",
    expectedText: "Connect Supabase first",
  });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await verifyPage(mobile, {
    path: "/",
    name: "home",
    expectedText: "Life and Business",
    mobile: true,
  });
  await verifyPage(mobile, {
    path: "/modules",
    name: "modules",
    expectedText: "One platform. Specialized modules.",
    mobile: true,
  });
  await mobile.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("LOCAL VISUAL E2E FAILURES\n" + failures.map((item, index) => `${index + 1}. ${item}`).join("\n\n"));
  process.exit(1);
}

console.log("Local visual E2E smoke passed.");
