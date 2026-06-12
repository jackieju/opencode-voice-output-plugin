import sys
import os
from kokoro_onnx import Kokoro
import soundfile as sf
import tempfile
import subprocess

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "kokoro-v1.0.onnx")
VOICES_PATH = os.path.join(MODEL_DIR, "voices-v1.0.bin")

def has_chinese(text):
    return any('\u4e00' <= c <= '\u9fff' for c in text)

def speak(text):
    k = Kokoro(MODEL_PATH, VOICES_PATH)
    voice = "zf_xiaobei" if has_chinese(text) else "af_heart"
    lang = "cmn" if has_chinese(text) else "en-us"
    samples, sr = k.create(text, voice=voice, lang=lang)
    
    out = tempfile.mktemp(suffix=".wav")
    sf.write(out, samples, sr)
    subprocess.Popen(["afplay", out])

if __name__ == "__main__":
    text = sys.stdin.read().strip() if not sys.argv[1:] else " ".join(sys.argv[1:])
    if text:
        speak(text)
