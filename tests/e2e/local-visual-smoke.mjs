import { chromium } from "playwright";
import fs from "node:fs/promises";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.E2E_OUTPUT_DIR ?? "e2e-artifacts";
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];

function watchPage(page, name) {
  const consoleErrors = [];
  const requestFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);
  });
  return () => {
    if (consoleErrors.length) failures.push(`${name}: console errors:\n${consoleErrors.join("\n")}`);
    if (requestFailures.length) failures.push(`${name}: failed requests:\n${requestFailures.join("\n")}`);
  };
}

async function verifyPage(context, { path, name, expectedText, mobile = false }) {
  const page = await context.newPage();
  const finishWatch = watchPage(page, name);
  const response = await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
  if (!response || !response.ok()) failures.push(`${name}: HTTP ${response?.status() ?? "no response"} at ${path}`);
  const bodyText = await page.locator("body").innerText();
  if (!bodyText.includes(expectedText)) failures.push(`${name}: expected text not found: ${expectedText}`);
  const suffix = mobile ? "-mobile" : "";
  await page.screenshot({ path: `${outputDir}/${name}${suffix}.png`, fullPage: true });
  finishWatch();
  await page.close();
}

async function verifyContributorEntry(context) {
  const page = await context.newPage();
  const finishWatch = watchPage(page, "contributor-entry");
  const response = await page.goto(`${baseURL}/community/join`, { waitUntil: "networkidle" });
  if (!response || !response.ok()) failures.push(`contributor-entry: HTTP ${response?.status() ?? "no response"}`);

  const acceptButton = page.getByRole("button", { name: /Accept & Enter ZLife Studio/i });
  if (!(await acceptButton.isDisabled())) failures.push("contributor-entry: studio button should be disabled before acceptance");

  await page.getByLabel("Accept ZLife contributor rules").check();
  if (await acceptButton.isDisabled()) failures.push("contributor-entry: studio button stayed disabled after acceptance");
  await page.screenshot({ path: `${outputDir}/contributor-join-accepted.png`, fullPage: true });
  await acceptButton.click();
  await page.waitForURL("**/community/studio");
  const studioText = await page.locator("body").innerText();
  if (!studioText.includes("Choose how you want to help.")) failures.push("contributor-entry: studio landing did not load after acceptance");
  const accepted = await page.evaluate(() => window.localStorage.getItem("zlife.contributor-rules.accepted.v1"));
  if (!accepted) failures.push("contributor-entry: acceptance marker was not stored");
  await page.screenshot({ path: `${outputDir}/contributor-studio.png`, fullPage: true });
  finishWatch();
  await page.close();
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await verifyPage(desktop, { path: "/", name: "home", expectedText: "Life and Business" });
  await verifyPage(desktop, { path: "/modules", name: "modules", expectedText: "One platform. Specialized modules." });
  await verifyPage(desktop, { path: "/ai-teams", name: "ai-teams", expectedText: "AI" });
  await verifyPage(desktop, { path: "/about", name: "about", expectedText: "Z-Life" });
  await verifyPage(desktop, { path: "/community", name: "community", expectedText: "Build Z-Life With Us." });
  await verifyPage(desktop, { path: "/community/join", name: "contributor-join", expectedText: "One click to join the build." });
  await verifyContributorEntry(desktop);
  await verifyPage(desktop, { path: "/auth/sign-in", name: "sign-in-safe-local", expectedText: "Connect Supabase first" });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await verifyPage(mobile, { path: "/", name: "home", expectedText: "Life and Business", mobile: true });
  await verifyPage(mobile, { path: "/modules", name: "modules", expectedText: "One platform. Specialized modules.", mobile: true });
  await verifyPage(mobile, { path: "/community/join", name: "contributor-join", expectedText: "One click to join the build.", mobile: true });
  await verifyPage(mobile, { path: "/community/studio", name: "contributor-studio", expectedText: "Choose how you want to help.", mobile: true });
  await mobile.close();
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("LOCAL VISUAL E2E FAILURES\n" + failures.map((item, index) => `${index + 1}. ${item}`).join("\n\n"));
  process.exit(1);
}

console.log("Local visual E2E smoke passed.");
