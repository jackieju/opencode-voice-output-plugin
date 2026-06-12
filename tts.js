import { spawn, execSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const spokenMessages = new Set();
const LOG = "/tmp/opencode_tts_debug.log";
const PLUGIN_DIR = "/Users/I027910/Desktop/ju/projects/opencode-voice-output-plugin";
const PYTHON = `${PLUGIN_DIR}/.venv/bin/python3`;
const SPEAK_SCRIPT = `${PLUGIN_DIR}/kokoro-speak.py`;

function log(msg) {
  appendFileSync(LOG, `${new Date().toISOString()}: ${msg}\n`);
}

function stopSpeaking() {
  try { execSync("killall afplay 2>/dev/null"); } catch {}
}

function speak(text) {
  if (!text.trim()) return;

  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~]/g, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/\n{3,}/g, "\n")
    .trim();

  if (!cleaned || cleaned.length < 3) return;

  const proc = spawn(PYTHON, [SPEAK_SCRIPT, cleaned], { detached: true, stdio: "ignore" });
  proc.unref();
}

export const TTSPlugin = async () => {
  log("TTS plugin loaded");
  const sessionTexts = new Map();
  const spokenSessions = new Set();

  return {
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
