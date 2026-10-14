"""Audio helpers for System D (sound design). ffmpeg + numpy only.

Everything decodes through ffmpeg to float32 at a common rate so any format the
user's library uses (wav/aif/mp3/flac/ogg/m4a...) works without extra Python deps.
Source files are only ever READ; every write goes to a new path.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Windows: files and pipes default to the ANSI code page, but edit.json, the logs and the library are
# UTF-8. Re-run the script once in Python's UTF-8 mode (nothing happens on macOS/Linux or when it is on).
if os.name == "nt" and not sys.flags.utf8_mode and sys.argv and sys.argv[0].endswith(".py"):
    sys.exit(subprocess.call([sys.executable, "-X", "utf8", *sys.argv]))

import numpy as np

SR = 48000          # working sample rate for analysis and mixing
SKILL_ROOT = Path(__file__).resolve().parent.parent


def library_path() -> Path:
    """Sound index location. VV_SOUNDS_JSON overrides it (used by the self-test so it never touches the real index)."""
    return Path(os.environ.get("VV_SOUNDS_JSON", SKILL_ROOT / "data" / "sounds.json"))


def load_library() -> dict:
    p = library_path()
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"schema_version": 1, "roots": [], "sounds": []}
AUDIO_EXT = {".wav", ".wave", ".aif", ".aiff", ".aifc", ".flac", ".mp3", ".ogg", ".oga", ".opus",
             ".m4a", ".aac", ".wma", ".caf", ".mp4", ".mov"}


def db(x: float) -> float:
    return float(20 * np.log10(max(float(x), 1e-12)))


def undb(d: float) -> float:
    return float(10 ** (d / 20))


def probe(path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "stream=codec_type,sample_rate,channels,codec_name:format=duration,format_name",
                          "-of", "json", str(path)], capture_output=True, text=True)
    if out.returncode:
        raise RuntimeError(f"ffprobe failed for {path}: {out.stderr.strip()[:200]}")
    j = json.loads(out.stdout)
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    return {"duration": float(j.get("format", {}).get("duration", 0) or 0),
            "has_audio": a is not None,
            "sample_rate": int(a["sample_rate"]) if a else None,
            "channels": int(a["channels"]) if a else None,
            "codec": a.get("codec_name") if a else None,
            "has_video": any(s.get("codec_type") == "video" for s in j.get("streams", []))}


def decode(path, sr: int = SR, channels: int = 2, stream: str = "a:0") -> np.ndarray:
    """Decode the first audio stream to float32 array of shape (n, channels)."""
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-map", f"0:{stream}", "-vn",
           "-f", "f32le", "-acodec", "pcm_f32le", "-ac", str(channels), "-ar", str(sr), "-"]
    out = subprocess.run(cmd, capture_output=True)
    if out.returncode:
        raise RuntimeError(f"decode failed for {path}: {out.stderr.decode()[:300]}")
    return np.frombuffer(out.stdout, dtype=np.float32).reshape(-1, channels).copy()


def write_audio(path, data: np.ndarray, sr: int = SR, codec: str = "pcm_s24le"):
    """Write float32 (n, ch) to a new file through ffmpeg (never overwrites inputs)."""
    data = np.ascontiguousarray(data, dtype=np.float32)
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", str(data.shape[1]),
           "-i", "-", "-c:a", codec, str(path)]
    p = subprocess.run(cmd, input=data.tobytes(), capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode()[:300])


def envelope(mono: np.ndarray, sr: int = SR, win: float = 0.05, hop: float = 0.005):
    """Smoothed RMS envelope. Returns (times, env_linear)."""
    w, h = max(1, int(win * sr)), max(1, int(hop * sr))
    sq = np.concatenate([[0.0], np.cumsum(mono.astype(np.float64) ** 2)])
    starts = np.arange(0, max(1, len(mono) - 1), h)
    ends = np.minimum(starts + w, len(mono))
    rms = np.sqrt((sq[ends] - sq[starts]) / np.maximum(ends - starts, 1))
    times = (starts + (ends - starts) / 2) / sr
    return times, rms


def analyze(data: np.ndarray, sr: int = SR) -> dict:
    """Signal 'audition' metrics. This is measurement, not listening."""
    mono = data.mean(axis=1) if data.ndim == 2 else data
    n = len(mono)
    dur = n / sr
    if n == 0:
        return {"duration": 0}
    peak = float(np.max(np.abs(data)))
    rms = float(np.sqrt(np.mean(mono.astype(np.float64) ** 2)))
    t, env = envelope(mono, sr, win=0.05, hop=0.005)
    env_db = 20 * np.log10(np.maximum(env, 1e-9))
    i_pk = int(np.argmax(env))
    peak_time = float(t[i_pk])
    # onset = first point where the fast envelope crosses peak-24 dB (transient start),
    # refined to the steepest rise before the peak
    tf, ef = envelope(mono, sr, win=0.01, hop=0.002)
    efdb = 20 * np.log10(np.maximum(ef, 1e-9))
    thr = efdb.max() - 24
    above = np.nonzero(efdb >= thr)[0]
    onset_time = float(tf[above[0]]) if len(above) else 0.0
    # attack: onset -> peak; decay: peak -> envelope falls 20 dB below peak
    after = np.nonzero(env_db[i_pk:] <= env_db[i_pk] - 20)[0]
    decay = float(t[i_pk + after[0]] - peak_time) if len(after) else float(dur - peak_time)
    # energy balance first vs second half (rising sounds have more energy late)
    half = n // 2
    e1 = float(np.sum(mono[:half] ** 2)) + 1e-12
    e2 = float(np.sum(mono[half:] ** 2)) + 1e-12
    # spectrum (brightness / weight)
    seg = mono if n <= sr * 4 else mono[max(0, int((peak_time - 2) * sr)): int((peak_time + 2) * sr)]
    spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) if len(seg) > 16 else np.zeros(2)
    freqs = np.fft.rfftfreq(len(seg), 1 / sr) if len(seg) > 16 else np.zeros(2)
    ps = spec ** 2
    tot = float(ps.sum()) + 1e-12
    centroid = float((freqs * ps).sum() / tot)
    low_ratio = float(ps[freqs < 150].sum() / tot)
    rel = peak_time / dur if dur else 0
    if dur < 0.35:
        shape = "transient"            # pops, clicks, ticks
    elif rel > 0.72 and e2 > 1.6 * e1:
        shape = "rise"                 # risers, suck-backs, build-ups
    elif onset_time < 0.06 and rel < 0.2:
        shape = "impact"               # hits, booms, sci-fi impacts
    elif 0.2 <= rel <= 0.75:
        shape = "swell"                # whooshes (bell-shaped)
    else:
        shape = "sustain"              # beds, ambiences, music, textures
    return {"duration": round(dur, 4), "peak_dbfs": round(db(peak), 2), "rms_dbfs": round(db(rms), 2),
            "peak_time": round(peak_time, 4), "onset_time": round(onset_time, 4),
            "attack": round(max(0.0, peak_time - onset_time), 4), "decay_20db": round(decay, 4),
            "late_energy_ratio": round(e2 / e1, 3), "centroid_hz": int(centroid),
            "low_energy_ratio": round(low_ratio, 3), "shape": shape}


def lufs(path) -> dict:
    """Integrated loudness + true peak via ffmpeg ebur128 (needs >= 0.4 s of audio)."""
    out = subprocess.run(["ffmpeg", "-nostats", "-v", "info", "-i", str(path), "-map", "0:a:0",
                          "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    txt = out.stderr
    m_i = re.findall(r"I:\s+(-?[\d.]+|-inf) LUFS", txt)
    m_tp = re.findall(r"Peak:\s+(-?[\d.]+|-inf) dBFS", txt)
    f = lambda v: None if (v is None or "inf" in v) else float(v)
    return {"lufs_i": f(m_i[-1]) if m_i else None, "true_peak_dbtp": f(m_tp[-1]) if m_tp else None}


def tc(seconds: float, fps: float) -> str:
    """Seconds -> HH:MM:SS:FF timecode."""
    fr = int(round(seconds * fps))
    f = int(round(fps))
    return f"{fr // (3600 * f):02d}:{fr // (60 * f) % 60:02d}:{fr // f % 60:02d}:{fr % f:02d}"
