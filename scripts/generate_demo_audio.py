import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "public" / "assets" / "audio" / "demo-tone.wav"
TARGET.parent.mkdir(parents=True, exist_ok=True)
rate = 22_050
duration = 0.8
with wave.open(str(TARGET), "wb") as output:
    output.setnchannels(1)
    output.setsampwidth(2)
    output.setframerate(rate)
    frames = []
    for index in range(int(rate * duration)):
        envelope = min(1, index / 500, (rate * duration - index) / 1800)
        sample = int(8_000 * envelope * math.sin(2 * math.pi * 440 * index / rate))
        frames.append(struct.pack("<h", sample))
    output.writeframes(b"".join(frames))
print(f"Audio demo locale generato in {TARGET.relative_to(ROOT)}")
