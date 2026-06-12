import { spawn } from "node:child_process";

const spokenMessages = new Set();

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

  const proc = spawn("say", ["-r", "200", cleaned], { detached: true, stdio: "ignore" });
  proc.unref();
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

      if (text) speak(text);
    },
  };
};

export default TTSPlugin;
