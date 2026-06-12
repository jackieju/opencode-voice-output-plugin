import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TTS_BASE_URL = "http://localhost:6655/openai/v1";
const API_KEY = "8c9acf21-1332-408a-b78d-7b8cbfb6810f";
const VOICE = "nova";
const MODEL = "tts-1";

const spokenMessages = new Set();

async function speak(text) {
  if (!text.trim()) return;

  const cleaned = text
    .replace(/```[\s\S]*?```/g, " (code block omitted) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~]/g, "")
    .replace(/\|[^\n]+\|/g, " (table omitted) ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);

  if (!cleaned || cleaned.length < 3) return;

  try {
    const res = await fetch(`${TTS_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        input: cleaned,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      console.error(`[tts] API error ${res.status}: ${await res.text()}`);
      return;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const file = join(tmpdir(), `opencode-tts-${Date.now()}.mp3`);
    await writeFile(file, buf);

    const player = spawn("afplay", [file], { detached: true, stdio: "ignore" });
    player.unref();
    player.on("exit", () => unlink(file).catch(() => {}));
  } catch (err) {
    console.error(`[tts] Error: ${err.message}`);
  }
}

export const TTSPlugin = async () => {
  return {
    event: async ({ event }) => {
      if (event.type !== "message.updated") return;

      const info = event.properties?.info;
      if (!info || info.role !== "assistant" || !info.finish) return;
      if (spokenMessages.has(info.id)) return;
      spokenMessages.add(info.id);

      const parts = event.properties?.parts ?? info.parts ?? [];
      const text = parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n");

      if (text) await speak(text);
    },
  };
};

export default TTSPlugin;
