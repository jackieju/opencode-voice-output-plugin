import { spawn, execSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const LOG = "/tmp/opencode_tts_debug.log";
const STATE_FILE = "/tmp/opencode_tts_enabled";
const ENGINE_FILE = "/tmp/opencode_tts_engine";
const PLUGIN_DIR = "/Users/I027910/Desktop/ju/projects/opencode-voice-output-plugin";
const PYTHON = `${PLUGIN_DIR}/.venv/bin/python3`;
const SPEAK_SCRIPT = `${PLUGIN_DIR}/speak.py`;

function log(msg) {
  appendFileSync(LOG, `${new Date().toISOString()}: ${msg}\n`);
}

function isEnabled() {
  if (!existsSync(STATE_FILE)) return true;
  return readFileSync(STATE_FILE, "utf8").trim() !== "0";
}

function setEnabled(val) {
  writeFileSync(STATE_FILE, val ? "1" : "0");
}

function getEngine() {
  if (!existsSync(ENGINE_FILE)) return "edge-tts";
  return readFileSync(ENGINE_FILE, "utf8").trim() || "edge-tts";
}

function setEngine(engine) {
  writeFileSync(ENGINE_FILE, engine);
}

function stopSpeaking() {
  try { execSync("killall afplay 2>/dev/null"); } catch {}
}

function speak(text) {
  if (!text.trim() || !isEnabled()) return;

  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~]/g, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/\n{3,}/g, "\n")
    .trim();

  if (!cleaned || cleaned.length < 3) return;

  const engine = getEngine();
  const env = { ...process.env, TTS_ENGINE: engine };
  const proc = spawn(PYTHON, [SPEAK_SCRIPT, cleaned], { detached: true, stdio: "ignore", env });
  proc.unref();
}

export const TTSPlugin = async () => {
  log("TTS plugin loaded");
  const sessionTexts = new Map();
  const spokenSessions = new Set();

  return {
    "command.execute.before": async ({ command }) => {
      if (command === "/voice-on") {
        setEnabled(true);
        log("Voice output ENABLED");
        return { abort: true, output: "Voice output enabled." };
      }
      if (command === "/voice-off") {
        setEnabled(false);
        stopSpeaking();
        log("Voice output DISABLED");
        return { abort: true, output: "Voice output disabled." };
      }
      if (command === "/voice-stop") {
        stopSpeaking();
        return { abort: true, output: "Stopped." };
      }
      if (command?.startsWith("/voice-engine")) {
        const parts = command.split(" ");
        if (parts.length < 2) {
          const current = getEngine();
          return { abort: true, output: `Current engine: ${current}\nAvailable: edge-tts, sherpa, say\n\nUsage: /voice-engine <name>` };
        }
        const engine = parts[1];
        if (!["edge-tts", "sherpa", "say"].includes(engine)) {
          return { abort: true, output: `Unknown engine: ${engine}\nAvailable: edge-tts, sherpa, say` };
        }
        setEngine(engine);
        log(`Engine changed to: ${engine}`);
        return { abort: true, output: `Voice engine set to: ${engine}` };
      }
    },

    event: async ({ event }) => {
      if (event.type === "message.part.updated") {
        const part = event.properties?.part;
        if (part && part.type === "text" && part.text && part.sessionID) {
          sessionTexts.set(part.sessionID, part.text);
        }
      }

      if (event.type === "message.updated") {
        const info = event.properties?.info;
        if (info && info.role === "user") {
          stopSpeaking();
        }
      }

      if (event.type === "session.idle") {
        const sessionID = event.properties?.sessionID;
        if (!sessionID) return;
        const text = sessionTexts.get(sessionID);
        if (!text) return;
        sessionTexts.delete(sessionID);

        const key = `${sessionID}-${Date.now()}`;
        if (spokenSessions.has(key)) return;
        spokenSessions.add(key);

        log(`Speaking (${text.length} chars): ${text.slice(0, 80)}`);
        speak(text);
      }
    },
  };
};

export default TTSPlugin;
