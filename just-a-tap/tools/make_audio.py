"""Synthesise an original music bed + tactile SFX for JUST A TAP (no samples,
no third-party audio). Frame-locked: 120 BPM = 30 frames per beat at 60 fps.
Writes out/audio/{music,sfx,mix}.wav (48 kHz stereo float -> 24-bit).
usage: python3 tools/make_audio.py"""
import wave
from pathlib import Path
import numpy as np

SR = 48000
DUR = 20.0
N = int(SR * DUR)
OUT = Path(__file__).resolve().parents[1] / "out/audio"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)  # seeded: reproducible noise
BEAT = 0.5


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


# ---------------------------------------------------------------- music
CHORDS = [  # (start beat, notes) – F major colour, 2 bars each
    (0, [53, 57, 60, 64]),    # Fmaj7
    (8, [57, 60, 64, 67]),    # Am7
    (16, [50, 57, 60, 64]),   # Dm9 (D A C E)
    (24, [46, 53, 57, 62]),   # Bbmaj7 (Bb F A D)
    (32, [53, 57, 60, 64, 67]),  # Fmaj9 resolve
]


def chord_at(beat):
    c = CHORDS[0][1]
    for b, notes in CHORDS:
        if beat >= b:
            c = notes
    return c


def pad(notes, t0, t1, gain):
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    sigL = np.zeros(n)
    sigR = np.zeros(n)
    for m in notes:
        f = midi(m)
        for det, side in ((-0.004, 0), (0.004, 1)):
            ph = 2 * np.pi * f * (1 + det) * t
            s = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
            if side == 0:
                sigL += s
            else:
                sigR += s
    a = np.minimum(1, t / 0.9) * np.minimum(1, (n / SR - t) / 0.6)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.25 * t)
    return np.stack([sigL, sigR], 1) * (a * trem * gain / len(notes))[:, None]


def pluck(f, dur=0.6, bright=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + bright * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 18) + 0.2 * np.sin(2 * np.pi * 2 * f * t)
    return s * env(n, 0.004, dur * 0.35)


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


music = np.zeros((N, 2))
# intensity per section (beats): 0-8 calm, 8-15 light, 15-20 build (dark scene), 20-30 groove, 30-35 build, 35.5+ resolve
for b0, notes in CHORDS:
    t0 = b0 * BEAT
    t1 = min(DUR, (b0 + 8) * BEAT + 0.6) if b0 < 32 else DUR
    g = 0.55 if b0 < 32 else 0.7
    p = pad(notes, t0, t1, g)
    music[int(t0 * SR) : int(t0 * SR) + len(p)] += p[: N - int(t0 * SR)]

arp_pattern = [0, 2, 1, 3, 2, 1, 3, 2]
for step in range(0, 80):  # 8th notes
    beat = step / 2
    t = beat * BEAT
    if t >= DUR - 0.3:
        break
    if 17.7 <= t < 18.0:  # breath before the title chord
        continue
    notes = chord_at(beat)
    m = notes[arp_pattern[step % 8] % len(notes)] + 12
    if t < 2.5:
        g = 0.10 + 0.04 * t
    elif t < 7.5:
        g = 0.2
    elif t < 9.6:
        g = 0.16 + 0.05 * (t - 7.5)
    elif t < 17.7:
        g = 0.24
    else:
        g = 0.16 * max(0.0, 1 - (t - 18) / 2.0)
    place(music, pluck(midi(m)), t, pan=0.35 if step % 2 else -0.35, gain=g)

for beat in range(40):
    t = beat * BEAT
    # bass on beats 1 and 3 from 4 s
    if t >= 4.0 and t < 17.7 and beat % 2 == 0:
        place(music, bass(midi(chord_at(beat)[0] - 12), 0.9), t, gain=0.32)
    # heartbeat pulse in the dark NFC scene, full kick from the confirmation
    if 7.5 <= t < 9.6 and beat % 2 == 0:
        place(music, kick(), t, gain=0.35)
    if 9.6 <= t < 17.5:
        place(music, kick(), t, gain=0.55 if beat % 2 == 0 else 0.3)
    if 5.0 <= t < 17.5:
        place(music, hat(), t + BEAT / 2, pan=0.25, gain=0.07 if t < 9.6 else 0.11)
# final low root under the title
place(music, bass(midi(41), 2.4), 17.75, gain=0.3)
# fade out the last 1.2 s
fo = np.ones(N)
k = int(1.2 * SR)
fo[-k:] = np.linspace(1, 0, k) ** 1.5
music *= fo[:, None]

# ---------------------------------------------------------------- sfx
sfx = np.zeros((N, 2))


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


CUES = [
    (fr(16), thud(), 0.0, 0.25),                      # card settles
    (fr(44), tick(2400), -0.1, 0.22),                 # focus hops
    (fr(84), tick(2700), 0.0, 0.22),
    (fr(118), tick(3000), 0.15, 0.24),
    (fr(158), whoosh(0.85), 0.0, 0.32),               # panel -> phone
    (fr(204), tick(1800, 0.06), 0.0, 0.18),           # phone lands
    (fr(318), thud(), 0.4, 0.42),                     # terminal lands
    (fr(352), shimmer(1.05), -0.2, 0.5),              # glyph flight
    (fr(450), pulse(294), 0.0, 0.42),                 # NFC ripples
    (fr(468), pulse(330), 0.0, 0.38),
    (fr(486), pulse(392), 0.0, 0.34),
    (fr(500), texture(1.3), 0.0, 0.18),               # traces running
    (fr(578), chime(), 0.0, 0.75),                    # the one confirmation chime
    (fr(606), whoosh(0.7), 0.0, 0.18),                # panel expands, light returns
    (fr(814), tick(2000, 0.05), -0.1, 0.2),           # rail hops
    (fr(828), tick(2200, 0.05), 0.0, 0.2),
    (fr(848), tick(2600, 0.06), 0.1, 0.26),
    (fr(900), texture(2.3), 0.0, 0.22),               # gesture stroke
    (fr(932), tick(3200, 0.04), 0.3, 0.12),           # fragments pop
    (fr(936), tick(3400, 0.04), 0.4, 0.12),
    (fr(940), tick(3000, 0.04), 0.2, 0.12),
    (fr(1004), snap(), 0.25, 0.45),                   # fragments snap into capsule
    (fr(1046), whoosh(0.6), 0.0, 0.16),               # underline swells into dark
    (fr(1066), low_tone(), 0.0, 0.5),                 # JUST A TAP.
]
for t0, sig, pan, g in CUES:
    place(sfx, sig, t0, pan, g)

# ---------------------------------------------------------------- mix
# gentle ducking of the music under the chime and the title
duck = np.ones(N)
for t0, length in ((fr(578), 0.9), (fr(1066), 1.0)):
    i, k = int(t0 * SR), int(length * SR)
    seg = 1 - 0.35 * np.sin(np.linspace(0, np.pi, k))
    duck[i : i + k] *= seg[: N - i]
mix = music * 0.8 * duck[:, None] + sfx
# soft limiter
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
peak = np.abs(mix).max()
mix *= 0.89 / peak  # ≈ -1 dBFS peak before loudness normalisation


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


write("music.wav", music / max(1e-6, np.abs(music).max()) * 0.89)
write("sfx.wav", sfx / max(1e-6, np.abs(sfx).max()) * 0.89)
write("mix.wav", mix)
print("written", OUT, "duration", N / SR)
