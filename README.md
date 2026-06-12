# opencode-tts-plugin

OpenCode plugin that speaks assistant responses aloud using OpenAI TTS API.

## Installation

```bash
cp tts.js ~/.config/opencode/plugins/
```

Restart opencode. The plugin auto-loads.

## Configuration

Edit `tts.js` to change:

- `TTS_BASE_URL` — OpenAI-compatible TTS endpoint (default: HAI proxy at localhost:6655)
- `API_KEY` — API key for the TTS endpoint
- `VOICE` — TTS voice: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- `MODEL` — `tts-1` (fast) or `tts-1-hd` (higher quality)

## How it works

1. Listens for `message.updated` events in opencode
2. When assistant finishes a response, extracts text (strips code blocks, markdown, tables)
3. Sends to OpenAI TTS API
4. Plays audio via `afplay` (macOS)

## Requirements

- macOS (uses `afplay` for audio playback)
- OpenAI-compatible TTS API endpoint
- opencode with plugin support
