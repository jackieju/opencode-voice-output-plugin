import { spawn, execSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const spokenMessages = new Set();
const LOG = "/tmp/opencode_tts_debug.log";

function log(msg) {
  appendFileSync(LOG, `${new Date().toISOString()}: ${msg}\n`);
}

function stopSpeaking() {
  try { execSync("killall say 2>/dev/null"); } catch {}
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

  const hasChinese = /[\u4e00-\u9fff]/.test(cleaned);
  const voice = hasChinese ? "Tingting" : "Samantha";

  const proc = spawn("say", ["-v", voice, "-r", "200", cleaned], { detached: true, stdio: "ignore" });
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
