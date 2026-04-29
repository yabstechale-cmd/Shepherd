import { execSync, spawn } from "node:child_process";

const PORT = 5173;
const HOST = "0.0.0.0";
const SAFE_PROCESS_MARKERS = [
  "/shepherd/node_modules/.bin/vite",
  "vite --host 0.0.0.0 --port 5173",
  "npm run dev -- --host 0.0.0.0 --port 5173",
];

function getListeningPids(port) {
  try {
    const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return output ? output.split("\n").map((value) => value.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getCommand(pid) {
  try {
    return execSync(`ps -p ${pid} -o command=`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function isSafeShepherdDevProcess(command) {
  return SAFE_PROCESS_MARKERS.some((marker) => command.includes(marker));
}

function killIfSafe(pid) {
  const command = getCommand(pid);
  if (!command) return;
  if (!isSafeShepherdDevProcess(command)) {
    console.log(`[dev:clean] Port ${PORT} is in use by a non-Shepherd process. Leaving it alone.`);
    console.log(`[dev:clean] PID ${pid}: ${command}`);
    process.exit(1);
  }
  console.log(`[dev:clean] Stopping existing Shepherd dev server on PID ${pid}.`);
  execSync(`kill ${pid}`, { stdio: "ignore" });
}

for (const pid of getListeningPids(PORT)) {
  killIfSafe(pid);
}

const child = spawn("npm", ["run", "dev", "--", "--host", HOST, "--port", String(PORT)], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
