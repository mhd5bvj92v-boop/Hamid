"""Synthesise an original lo-fi music bed + SFX stems for "Are we actually behind?" (9:16, 35 s).
No samples or third-party audio; seeded noise, so it's reproducible.
  music_bed.wav  - sits under your voice (around -26 LUFS; lower it further in your NLE if needed)
  sfx.wav        - cue-timed effects (layer offsets from render.sh)
  preview_mix.wav- bed + sfx at preview level (no voice), used for the placeholder preview
usage: python3 tools/make_audio.py --out work/sound"""
import argparse, wave
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser(); ap.add_argument("--out", default="work/sound"); A = ap.parse_args()
OUT = Path(A.out); OUT.mkdir(parents=True, exist_ok=True)
SR = 48000
DUR = 35.0
N = int(SR * DUR)
rng = np.random.default_rng(11)
BPM = 80
BEAT = 60 / BPM

def fr(frame):
    return frame / 60.0


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env(n, a, d, s_level=0.0, curve=6.0):
    """attack seconds a, then exponential decay over d seconds towards s_level."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), s_level + (1 - s_level) * np.exp(-(t - a) / max(d, 1e-6) * curve / 6))
    return e


def place(buf, sig, t0, pan=0.0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    buf[i : i + len(sig), 0] += sig * l
    buf[i : i + len(sig), 1] += sig * r


def biquad(x, cutoff, kind="lp", q=0.707):
    """RBJ biquad (Butterworth Q), direct form I."""
    w0 = 2 * np.pi * cutoff / SR
    al = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
    else:
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
    a0, a1, a2 = 1 + al, -2 * cw, 1 - al
    b0, b1, b2 = b[0] / a0, b[1] / a0, b[2] / a0
    a1, a2 = a1 / a0, a2 / a0
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return y


def lp_fast(x, cutoff, passes=2):
    y = x
    for _ in range(passes):
        y = biquad(y, cutoff, "lp")
    return y


def hp(x, cutoff):
    return biquad(biquad(x, cutoff, "hp"), cutoff, "hp")


def tick(f=2600, dur=0.05, g=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.5 * t)) * env(n, 0.001, dur * 0.3) * g


def whoosh(dur=0.8):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    lo = lp_fast(x, 900)
    hi = hp(lp_fast(x, 4000), 1200)
    sweep = np.sin(np.pi * t / dur) ** 2
    mix = lo * (1 - t / dur) + hi * (t / dur)
    return mix * sweep * 0.9


def thud():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 80 + 90 * np.exp(-t * 30)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * lp_fast(rng.standard_normal(n), 600)) * env(n, 0.003, 0.09)


def shimmer(dur=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t + i) for i, f in enumerate([2093, 2637, 3136, 4186]))
    return s * np.sin(np.pi * t / dur) ** 2 * 0.18


def pulse(f=330, dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.sin(np.pi * np.minimum(1, t / dur)) ** 2 * np.exp(-t * 2)


def chime():
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f0, d0 in ((midi(84), 0.0), (midi(91), 0.09)):  # C6 then G6
        tt = np.clip(t - d0, 0, None)
        on = (t >= d0).astype(float)
        partials = [(1, 1.0), (2.76, 0.32), (5.4, 0.12), (8.93, 0.05)]
        s = sum(a * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt * (2.2 + r * 1.6)) for r, a in partials)
        out += s * on * np.minimum(1, tt / 0.002)
    return out * 0.6


def snap():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    click = np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 90)
    body = np.sin(2 * np.pi * 220 * t) * np.exp(-t * 40)
    return click * 0.6 + body * 0.7


def texture(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = hp(lp_fast(rng.standard_normal(n), 3000), 800)
    return x * np.sin(np.pi * t / dur) ** 1.5 * 0.35


def low_tone(dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(53)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 2 * f * t) + 0.2 * np.sin(2 * np.pi * 3 * f * t)
    return s * env(n, 0.03, dur * 0.6) * 0.5



# shared drum / bass voices
def kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.16)


def hat(dur=0.035):
    n = int(dur * SR)
    return lp_fast(hp(rng.standard_normal(n), 7000), 12000, 1) * env(n, 0.001, dur * 0.5)


def bass(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t)) * env(n, 0.01, dur * 0.8, 0.2)



# ---------------------------------------------------------------- music (A minor, lo-fi, 80 BPM)
def rhodes(f, dur, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    tine = np.sin(2 * np.pi * f * t + 0.8 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t * 9))
    body = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return (0.55 * tine + body) * env(n, 0.006, dur * 0.55, 0.0) * vel * (1 + 0.04 * np.sin(2 * np.pi * 4.5 * t))

def snare():
    n = int(0.22 * SR)
    x = lp_fast(hp(rng.standard_normal(n), 1500), 7000, 1) * env(n, 0.001, 0.07)
    t = np.arange(n) / SR
    return x * 0.8 + np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.04) * 0.4

CH = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]  # Am7 Fmaj7 Cmaj7 G7
bars = int(DUR / (4 * BEAT)) + 1
music = np.zeros((N, 2))

def section(t):
    if t < 6.0: return "intro"
    if t < 11.0: return "pulse"
    if t < 18.0: return "groove"
    if t < 21.0: return "drop"
    if t < 25.6: return "deep"
    if t < 29.0: return "soft"
    return "outro"

for bar in range(bars):
    t0 = bar * 4 * BEAT
    if t0 >= DUR: break
    notes = CH[bar % 4]
    sec = section(t0)
    vel = {"intro": 0.5, "pulse": 0.6, "groove": 0.7, "drop": 0.35, "deep": 0.45, "soft": 0.55, "outro": 0.6}[sec]
    # chord on beat 1, a lighter re-strike on the "and" of 3 (lazy, behind the beat)
    for k, m in enumerate(notes):
        place(music, rhodes(midi(m), 4 * BEAT + 0.6, vel * 0.22), t0 + k * 0.012, pan=-0.3 + 0.2 * k)
    if sec not in ("drop",):
        for k, m in enumerate(notes[1:]):
            place(music, rhodes(midi(m), 1.6, vel * 0.12), t0 + 2.5 * BEAT + 0.02 + k * 0.01, pan=0.25)
    # bass
    if sec in ("pulse", "groove", "deep", "soft", "outro"):
        place(music, bass(midi(notes[0] - 24), 2 * BEAT), t0, gain=0.34)
        place(music, bass(midi(notes[0] - 24), 1.2 * BEAT), t0 + 2.5 * BEAT, gain=0.22)
    # drums
    for b in range(4):
        tb = t0 + b * BEAT
        if tb >= DUR - 0.2: break
        if sec in ("pulse", "groove", "soft", "outro") and b in (0, 2):
            place(music, kick(), tb, gain=0.42 if sec == "groove" else 0.32)
        if sec in ("groove", "outro") and b in (1, 3):
            place(music, snare(), tb + 0.015, gain=0.2)
        if sec in ("groove", "deep"):
            for h in (0, 0.5):
                place(music, hat(0.03), tb + h * BEAT + (0.03 if h else 0), pan=0.3, gain=0.05)

# soft vinyl-ish air bed (very low)
air = lp_fast(rng.standard_normal(N), 3500, 2) * 0.0012
music += air[:, None]
# drop section: fade the groove away under "bro, what am I even doing?"
g = np.ones(N)
i0, i1 = int(17.8 * SR), int(18.4 * SR)
g[i0:i1] = np.linspace(1, 0.55, i1 - i0); g[i1:int(21.0 * SR)] = 0.55
g[int(21.0 * SR):int(21.3 * SR)] = np.linspace(0.55, 1, int(21.3 * SR) - int(21.0 * SR))
fo = int(2.2 * SR); g[-fo:] *= np.linspace(1, 0, fo) ** 1.4
music *= g[:, None]

# ---------------------------------------------------------------- sfx
sfx = np.zeros((N, 2))
def sub_hit():
    n = int(0.9 * SR); t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 14)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.5)
def swell(dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp_fast(rng.standard_normal(n), 2500)
    return x * (t / dur) ** 2 * 0.8
CUES = [
    (0.85, tick(1900, 0.06), 0.0, 0.16),     # hook serif lands (soft pop)
    (2.90, tick(2600, 0.05), 0.1, 0.2),      # comparison card enters
    (3.35, tick(3000, 0.04), 0.1, 0.12),     # 'everyone online' bar starts
    (5.35, thud(), 0.0, 0.18),               # the short orange 'Me' bar stops
    (6.55, thud(), 0.0, 0.28),               # stat card lands
    (7.0, whoosh(1.4), 0.0, 0.12),           # curve draws
    (11.9, tick(2400, 0.05), -0.1, 0.22),    # feed posts pop in
    (13.5, tick(2700, 0.05), -0.1, 0.22),
    (15.7, tick(3000, 0.05), -0.1, 0.24),
    (21.10, sub_hit(), 0.0, 0.55),           # full-screen cut in
    (21.8, tick(2200, 0.05), 0.0, 0.14),     # 'actually post' lands
    (22.4, whoosh(2.4), 0.0, 0.26),          # camera sinks below the waterline
    (24.8, swell(0.6), 0.0, 0.22),           # swell back to the face
    (31.0, tick(3200, 0.04), 0.0, 0.1),      # tracked question
    (33.65, low_tone(2.0), 0.0, 0.35),       # 'make us feel'
]
for t0, sig, pan, gg in CUES:
    place(sfx, sig, t0, pan, gg)

def write(name, x):
    x = np.clip(x, -1, 1)
    pcm = (x * (2**23 - 1)).astype(np.int32)
    b = np.zeros((len(pcm), 2, 3), np.uint8)
    for c in range(2):
        v = pcm[:, c].astype(np.int64) & 0xFFFFFF
        b[:, c, 0] = v & 0xFF
        b[:, c, 1] = (v >> 8) & 0xFF
        b[:, c, 2] = (v >> 16) & 0xFF
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(b.tobytes())



def norm(x, peak=0.89):
    return x / max(1e-6, np.abs(x).max()) * peak
bed = norm(np.tanh(music * 1.2))
write("music_bed.wav", bed * 0.32)      # quiet on purpose: it sits under a voice
write("sfx.wav", norm(sfx) * 0.7)
write("preview_mix.wav", norm(np.tanh((bed * 0.75 + norm(sfx) * 0.6) * 1.1)))
print("written", OUT)
