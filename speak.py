import sys
import os
import subprocess
import tempfile

ENGINE = os.environ.get("TTS_ENGINE", "edge-tts")
EDGE_VOICE_ZH = os.environ.get("TTS_VOICE_ZH", "zh-CN-XiaoxiaoNeural")
EDGE_VOICE_EN = os.environ.get("TTS_VOICE_EN", "en-US-AvaNeural")
SHERPA_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "sherpa", "matcha-icefall-zh-baker")
SHERPA_VOCODER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "sherpa", "vocos-22khz-univ.onnx")

def has_chinese(text):
    return any('\u4e00' <= c <= '\u9fff' for c in text)

def speak_edge(text):
    voice = EDGE_VOICE_ZH if has_chinese(text) else EDGE_VOICE_EN
    out = tempfile.mktemp(suffix=".mp3")
    subprocess.run([
        sys.executable, "-m", "edge_tts",
        "--voice", voice,
        "--text", text,
        "--write-media", out
    ], capture_output=True)
    subprocess.Popen(["afplay", out])

def speak_sherpa(text):
    import sherpa_onnx
    import soundfile as sf
    import numpy as np

    tts_config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            matcha=sherpa_onnx.OfflineTtsMatchaModelConfig(
                acoustic_model=os.path.join(SHERPA_MODEL_DIR, "model-steps-3.onnx"),
                vocoder=SHERPA_VOCODER,
                lexicon=os.path.join(SHERPA_MODEL_DIR, "lexicon.txt"),
                tokens=os.path.join(SHERPA_MODEL_DIR, "tokens.txt"),
                dict_dir=os.path.join(SHERPA_MODEL_DIR, "dict"),
            ),
        ),
        max_num_sentences=1,
    )
    tts = sherpa_onnx.OfflineTts(tts_config)
    audio = tts.generate(text, sid=0, speed=1.0)
    samples = np.array(audio.samples)
    out = tempfile.mktemp(suffix=".wav")
    sf.write(out, samples, audio.sample_rate)
    subprocess.Popen(["afplay", out])

def speak_say(text):
    voice = "Tingting" if has_chinese(text) else "Samantha"
    subprocess.Popen(["say", "-v", voice, "-r", "200", text])

if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) if sys.argv[1:] else sys.stdin.read().strip()
    if not text:
        sys.exit(0)

    if ENGINE == "edge-tts":
        speak_edge(text)
    elif ENGINE == "sherpa":
        speak_sherpa(text)
    else:
        speak_say(text)
