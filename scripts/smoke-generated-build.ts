import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createDeterministicPlan } from "@/lib/ai/deterministic-plan";
import { createDeterministicBuild } from "@/lib/ai/deterministic-build";

function run(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "/tmp",
        NODE_ENV: "production",
        CI: "1",
        npm_config_fetch_retries: "1",
        npm_config_fetch_timeout: "20000"
      },
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with code ${String(code)} and signal ${String(signal)}.`
        )
      );
    });
  });
}

async function main() {
  const target = path.resolve(".generated-smoke-app");
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  try {
    const plan = createDeterministicPlan(
      "Build a polished service booking app with customer accounts, schedules, staff, reminders, and an administration dashboard."
    );
    const artifact = createDeterministicBuild(
      plan,
      plan.visualDirections[0]!.id
    );

    for (const file of artifact.files) {
      const destination = path.join(target, file.path);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, file.content, "utf8");
    }

    await run(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"],
      target
    );
    await run("npm", ["run", "typecheck"], target);
    await run("npm", ["run", "build"], target);
    console.log("Generated application smoke build passed.");
  } finally {
    if (process.env.KEEP_SMOKE_APP !== "true") {
      await rm(target, { recursive: true, force: true });
    }
  }
}

void main();
