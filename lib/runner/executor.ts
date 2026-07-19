import { spawn } from "node:child_process";
import path from "node:path";

type CommandResult = {
  command: string;
  output: string;
  durationMs: number;
};

function boundedAppend(current: string, next: string) {
  const combined = current + next;
  return combined.length > 120_000 ? combined.slice(-120_000) : combined;
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let output = "";
    const childEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "/tmp",
      NODE_ENV: "production"
    };
    const child = spawn(command, args, {
      cwd,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"] as const
    });

    child.stdout.on("data", (chunk: Buffer) => {
      output = boundedAppend(output, chunk.toString("utf8"));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output = boundedAppend(output, chunk.toString("utf8"));
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const result = {
        command: [command, ...args].join(" "),
        output,
        durationMs: Date.now() - started
      };

      if (code === 0) {
        resolve(result);
      } else {
        reject(
          new Error(
            `${result.command} failed with code ${String(code)} and signal ${String(signal)}.\n${output}`
          )
        );
      }
    });
  });
}

function dockerArgs(
  workdir: string,
  command: string,
  allowNetwork: boolean,
  containerName: string
) {
  const image = process.env.BUILD_RUNNER_IMAGE ?? "node:22-bookworm";
  return [
    "run",
    "--rm",
    "--name",
    containerName,
    "--memory",
    "2g",
    "--cpus",
    "2",
    "--pids-limit",
    "256",
    "--security-opt",
    "no-new-privileges",
    ...(allowNetwork ? [] : ["--network", "none"]),
    "-v",
    `${path.resolve(workdir)}:/workspace`,
    "-w",
    "/workspace",
    image,
    "bash",
    "-lc",
    command
  ];
}

export async function executeBuildCommand(
  workdir: string,
  label: string,
  command: string,
  allowNetwork = false
) {
  const maxSeconds = Number(process.env.BUILD_RUNNER_MAX_SECONDS ?? "600");
  const timeoutMs = Math.max(60, maxSeconds) * 1000;
  const execution = process.env.BUILD_RUNNER_EXECUTION ?? "docker";

  if (execution === "docker") {
    const safeName = `ziepher-${label.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${Date.now()}`;
    return runProcess(
      "docker",
      dockerArgs(workdir, command, allowNetwork, safeName),
      workdir,
      timeoutMs
    );
  }

  if (
    execution === "local" &&
    process.env.ALLOW_UNSANDBOXED_RUNNER === "true"
  ) {
    return runProcess(
      "bash",
      ["-lc", command],
      workdir,
      timeoutMs
    );
  }

  throw new Error(
    "The runner is not configured safely. Use Docker or explicitly enable the un-sandboxed local runner for development."
  );
}
