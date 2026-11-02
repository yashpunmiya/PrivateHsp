import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = "31377";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
  stdio: "inherit",
  windowsHide: true,
});

function stopTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    killer.unref();
  } else {
    child.kill("SIGTERM");
  }
}

let result = 1;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Next production server exited early (${server.exitCode}); verify port ${port} is free`);
    try {
      if ((await fetch(`${origin}/agents`)).ok) { ready = true; break; }
    } catch { /* wait for startup */ }
    await delay(500);
  }
  if (!ready) throw new Error("Timed out waiting for the production server");

  const runner = spawn(process.execPath, ["node_modules/playwright/cli.js", "test", "--reporter=line", ...process.argv.slice(2)], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: origin },
  });
  let output = "";
  let summaryTimer;
  let finished = false;
  const finish = (code) => {
    if (finished) return;
    finished = true;
    stopTree(runner);
    stopTree(server);
    result = code;
    // Do not await Windows child-process shutdown: inherited Playwright/Next
    // handles can keep the parent alive after all test results have printed.
    setTimeout(() => process.exit(code), 500).unref();
  };
  const onOutput = (destination, chunk) => {
    const line = chunk.toString();
    destination.write(line);
    output += line;
    if (!summaryTimer && /\d+ (?:passed|failed|skipped) \(/.test(output)) {
      // All tests have reported. Playwright's Windows workers may stay alive;
      // terminate the process tree after retaining the complete reported result.
      summaryTimer = setTimeout(() => {
        const hasFailures = /\d+ failed \(/.test(output);
        finish(hasFailures ? 1 : 0);
      }, 1200);
    }
  };
  runner.stdout.on("data", (chunk) => onOutput(process.stdout, chunk));
  runner.stderr.on("data", (chunk) => onOutput(process.stderr, chunk));
  runner.once("error", (error) => { throw error; });
  const exitCode = await new Promise((resolve) => runner.once("exit", (code) => resolve(code ?? 1)));
  if (summaryTimer) clearTimeout(summaryTimer);
  finish(Number(exitCode));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "E2E runner failed"}\n`);
} finally {
  stopTree(server);
}
process.exitCode = result;
