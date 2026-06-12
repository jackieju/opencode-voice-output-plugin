# opencode-voice-output-plugin

OpenCode plugin that speaks assistant responses aloud using Kokoro TTS (high-quality, offline).

## Installation

### 1. Clone and setup

```bash
git clone https://github.com/jackieju/opencode-voice-output-plugin.git
cd opencode-voice-output-plugin

# Create Python venv and install dependencies
python3 -m venv .venv
.venv/bin/pip install kokoro-onnx soundfile

# Download Kokoro model files (~340MB)
mkdir -p models
curl -L -o models/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -o models/voices-v1.0.bin https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

### 2. Install plugin

```bash
cp tts.js ~/.config/opencode/plugins/
```

Restart opencode. The plugin auto-loads.

## Commands

- `/voice-on` — Enable voice output
- `/voice-off` — Disable voice output

Sending a new message automatically stops any ongoing speech.

## How it works

1. Listens for `session.idle` events in opencode (response complete)
2. Extracts assistant text (strips code blocks, markdown, tables)
3. Sends to Kokoro TTS for synthesis (offline, ~300MB model)
4. Plays audio via `afplay` (macOS)
5. Auto-detects language: Chinese text → Chinese voice, English → English voice

## Voices

- Chinese: `zf_xiaobei` (female)
- English: `af_heart` (female)

Edit `kokoro-speak.py` to change voices. Available Chinese voices: `zf_xiaobei`, `zf_xiaoyi`, `zm_yunjian`, `zm_yunyang`.

## Requirements

- macOS (Apple Silicon)
- Python 3.10+
- opencode with plugin support

## npm

```bash
npm install opencode-voice-output-plugin
```

Or add to `opencode.jsonc`:
```json
"plugin": ["opencode-voice-output-plugin"]
```
