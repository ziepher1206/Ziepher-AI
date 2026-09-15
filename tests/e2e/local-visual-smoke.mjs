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

  await page.getByRole("button", { name: /Tester \/ QA/i }).click();
  const acceptButton = page.getByRole("button", { name: /Accept & Show My Starting Path/i });
  if (!(await acceptButton.isDisabled())) failures.push("contributor-entry: start button should be disabled before acceptance");

  await page.getByLabel("Accept ZLife contributor rules").check();
  if (await acceptButton.isDisabled()) failures.push("contributor-entry: start button stayed disabled after acceptance");
  await page.screenshot({ path: `${outputDir}/contributor-join-accepted.png`, fullPage: true });
  await acceptButton.click();
  await page.waitForURL("**/community/studio/start");
  await page.getByRole("heading", { name: "Tester / QA path" }).waitFor({ state: "visible" });

  const storedPath = await page.evaluate(() => window.localStorage.getItem("zlife.contributor.path.v1"));
  if (storedPath !== "tester") failures.push("contributor-entry: contributor path was not stored");

  const accepted = await page.evaluate(() => window.localStorage.getItem("zlife.contributor-rules.accepted.v1"));
  if (!accepted) failures.push("contributor-entry: acceptance marker was not stored");

  await page.screenshot({ path: `${outputDir}/contributor-fast-start.png`, fullPage: true });
  await page.getByRole("link", { name: /Open My Studio/i }).click();
  await page.waitForURL("**/community/studio");
  await page.getByRole("heading", { name: "Create your working profile." }).waitFor({ state: "visible" });

  const studioText = await page.locator("body").innerText();
  if (!studioText.includes("Choose how you want to help.")) failures.push("contributor-entry: studio landing did not load after fast start");
  if (!studioText.includes("LIVE VALUE WORK")) failures.push("contributor-entry: live value-work board did not render");
  if (!studioText.includes("Sign in to sync identity")) failures.push("contributor-entry: guest identity upgrade path did not render");

  await page.getByLabel("Display name").fill("Visual Test Builder");
  await page.getByLabel("Main skill / specialty").fill("Tree service workflow testing");
  const taskCard = page.locator("article", { hasText: "Validate ZLife contributor setup from a clean fork" });
  await taskCard.getByRole("button", { name: "Choose this task" }).click();
  if (!(await taskCard.getByRole("button", { name: "Assigned to you" }).isVisible())) {
    failures.push("contributor-entry: task assignment did not update in Studio");
  }

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Create your working profile." }).waitFor({ state: "visible" });
  if ((await page.getByLabel("Display name").inputValue()) !== "Visual Test Builder") {
    failures.push("contributor-entry: contributor profile did not persist across reload");
  }
  const persistedTask = page.locator("article", { hasText: "Validate ZLife contributor setup from a clean fork" });
  await persistedTask.getByRole("button", { name: "Assigned to you" }).waitFor({ state: "visible" });
  const sandboxText = await page.locator("body").innerText();
  if (!sandboxText.includes("YOUR SANDBOX") || !sandboxText.includes("Validate ZLife contributor setup from a clean fork")) {
    failures.push("contributor-entry: sandbox assignment summary did not render");
  }

  await page.screenshot({ path: `${outputDir}/contributor-studio-assigned.png`, fullPage: true });
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
  await verifyPage(mobile, { path: "/community/studio/start", name: "contributor-fast-start", expectedText: "Start with what you already know.", mobile: true });
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
