"""Synthesized score + sound design for THE PARIS JOB ep.1 (all generated, no samples).
Writes work/audio.wav (48 kHz stereo, 61 s)."""
import numpy as np, wave, os

SR = 48000
DUR = 61.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
mus = np.zeros((2, N))   # music bus
sfx = np.zeros((2, N))   # effects bus
amb = np.zeros((2, N))   # ambience bus


def T(n): return np.arange(n) / SR


def fft_filter(x, lo=None, hi=None, slope=1.5):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    return np.fft.irfft(X * g, len(x))


def put(bus, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    s = sig[: max(0, N - i)] * gain
    if i < 0: s = s[-i:]; i = 0
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[0, i:i + len(s)] += s * l * 1.414
    bus[1, i:i + len(s)] += s * r * 1.414


def env(n, a=0.005, d=0.2, curve=1.0):
    t = T(n)
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4) * curve)
    return e


def saw(freq, n, detune=0.0):
    t = T(n); out = np.zeros(n)
    for k in range(1, 24):
        if freq * k > 9000: break
        out += np.sin(2 * np.pi * freq * (1 + detune) * k * t) / k
    return out * 0.6


def note(m): return 440 * 2 ** ((m - 69) / 12)


def reverb(x, secs=2.0, mix=0.3, seed=1):
    n = int(SR * secs)
    r = np.random.default_rng(seed)
    ir = r.standard_normal(n) * np.exp(-T(n) / (secs / 5))
    ir = fft_filter(ir, hi=5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - mix) + y * mix


# ------------------------------------------------------------------ MUSIC
BPM = 100; BEAT = 60 / BPM; BAR = BEAT * 4
roots = [38, 34, 36, 33]          # D2, Bb1, C2, A1
chords = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]]  # Dm, Bb, C, A


def groove_level(t):
    if t < 3.6: return 0.0
    if 35.0 <= t < 37.15: return 0.0   # comedic drop
    if t >= 41.0: return 0.0
    if 6.2 <= t < 16.6 or 24.0 <= t < 35.0: return 0.75
    return 1.0


start = 3.6
bass = np.zeros(N); drums = np.zeros(N); hats = np.zeros(N); pad = np.zeros(N); lead = np.zeros(N)
nb = int((41.0 - start) / BAR) + 2
for b in range(nb):
    bt = start + b * BAR
    ri = b % 4
    for e in range(8):           # bass eighths
        t = bt + e * BEAT / 2
        if t >= 41.0: break
        g = groove_level(t)
        if g == 0: continue
        n = int(0.28 * SR)
        m = roots[ri] + (12 if e in (3, 7) else 0)
        s = saw(note(m), n) * env(n, 0.004, 0.12)
        i = int(t * SR); bass[i:i + n] += s[: N - i] * g * (1.0 if e % 2 == 0 else 0.75)
    for beat in range(4):         # kick / snare
        t = bt + beat * BEAT
        if t >= 41.0: break
        g = groove_level(t)
        if g == 0: continue
        i = int(t * SR)
        if beat in (0, 2):
            n = int(0.4 * SR); tt = T(n)
            f = 45 + 80 * np.exp(-tt * 30)
            k = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)
            drums[i:i + n] += k[: N - i] * g * 1.0
        else:
            n = int(0.25 * SR)
            s = fft_filter(rng.standard_normal(n), lo=900, hi=6000) * np.exp(-T(n) * 22) * 0.8
            s += np.sin(2 * np.pi * 185 * T(n)) * np.exp(-T(n) * 30) * 0.5
            drums[i:i + n] += s[: N - i] * g * 0.6
    for e in range(16):           # hats (16ths only when intense)
        t = bt + e * BEAT / 4
        if t >= 41.0: break
        g = groove_level(t)
        if g == 0: continue
        intense = 37.15 <= t < 41.0
        if e % 2 == 1 and not intense: continue
        n = int(0.06 * SR)
        h = fft_filter(rng.standard_normal(n), lo=7000) * np.exp(-T(n) * (60 if e % 4 else 35))
        i = int(t * SR); hats[i:i + n] += h[: N - i] * g * (0.5 if e % 4 == 2 else 0.3)

# pad follows the chord progression (also present in drops, quietly)
for b in range(int((DUR) / BAR) + 1):
    bt = start + b * BAR
    if bt >= 41.0: break
    n = int(BAR * SR)
    tt = T(n)
    ch = chords[b % 4]
    s = sum(saw(note(m), n, d) for m in ch for d in (-0.003, 0.003))
    e = np.minimum(1, tt / 0.6) * np.minimum(1, (BAR - tt) / 0.3)
    i = int(bt * SR); seg = s * e
    lvl = np.array([0.55 if groove_level(bt + x) > 0 else 0.35 for x in np.linspace(0, BAR, 8)])
    seg *= np.interp(tt, np.linspace(0, BAR, 8), lvl)
    pad[i:i + n] += seg[: N - i]

# spy motif (tremolo pluck) on title and during the plan
motif = [(0, 62, 0.5), (0.5, 65, 0.5), (1.0, 64, 0.5), (1.5, 62, 0.5), (2.0, 61, 1.0), (3.0, 62, 1.0)]
for mstart in [start + BAR * 0, start + BAR * 2, start + BAR * 8, start + BAR * 10]:
    for off, m, dur in motif:
        t = mstart + off * BEAT
        if t >= 35.0: continue
        n = int(dur * BEAT * SR)
        tt = T(n)
        sq = np.sign(np.sin(2 * np.pi * note(m + 12) * tt)) * 0.4 + np.sin(2 * np.pi * note(m + 12) * tt)
        s = fft_filter(sq, hi=2500) * env(n, 0.005, dur * BEAT * 0.8) * (0.75 + 0.25 * np.sin(2 * np.pi * 9 * tt))
        i = int(t * SR); lead[i:i + n] += s[: N - i]

# opening pad (before the groove) and outro pad
def chord_pad(t0, t1, ch, gain, fade_in=1.0, fade_out=1.0):
    n = int((t1 - t0) * SR); tt = T(n)
    s = sum(saw(note(m), n, d) for m in ch for d in (-0.004, 0.004))
    s = fft_filter(s, hi=900)
    e = np.minimum(1, tt / fade_in) * np.minimum(1, (t1 - t0 - tt) / fade_out)
    put(mus, s * e, t0, gain)

chord_pad(0.0, 3.7, [38, 50, 53, 57], 0.06, 2.5, 0.1)
chord_pad(41.0, 44.0, [38, 39], 0.05, 0.3, 0.4)              # dissonant drone (CCTV)
chord_pad(44.0, 47.7, [38, 44], 0.05, 0.5, 0.2)              # tritone tension
chord_pad(47.6, 50.7, [37, 38, 50], 0.06, 0.1, 0.3)
chord_pad(50.6, 56.0, [38, 39, 44], 0.06, 0.4, 0.01)
chord_pad(56.9, 61.0, [38, 50, 53, 57, 62], 0.07, 0.05, 2.0)

bass = fft_filter(bass, hi=700)
pad = fft_filter(pad, hi=1400)
mixm = bass * 0.33 + drums * 0.55 + hats * 0.22 + pad * 0.06 + lead * 0.09
for ch in (0, 1): mus[ch] += mixm
mus[0] += fft_filter(pad, lo=200) * 0.03; mus[1] -= fft_filter(pad, lo=200) * 0.02   # width

# heartbeat pulse 44 - 47.6
for k, t in enumerate(np.arange(44.0, 47.6, 0.75)):
    for dt, g in ((0, 1.0), (0.18, 0.6)):
        n = int(0.3 * SR); tt = T(n)
        s = np.sin(2 * np.pi * (50 + 30 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 12)
        put(mus, s, t + dt, 0.5 * g)

# ------------------------------------------------------------------ SFX
def whoosh(t, dur=0.5, gain=0.4, pan=0.0, rev=False):
    n = int(dur * SR); tt = T(n)
    x = rng.standard_normal(n)
    # sweep: blend low and high band
    lo = fft_filter(x, lo=200, hi=900); hi = fft_filter(x, lo=1500, hi=6000)
    u = tt / dur
    if rev: u = u ** 2
    mixw = lo * (1 - u) + hi * u
    e = np.sin(np.pi * np.clip(u, 0, 1)) ** (1.5 if not rev else 3)
    put(sfx, mixw * e, t, gain, pan)


def impact(t, gain=0.9, size=1.0):
    n = int(2.2 * SR); tt = T(n)
    f = 32 + 70 * np.exp(-tt * 8 / size)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2 / size)
    s += fft_filter(rng.standard_normal(n), hi=1800) * np.exp(-tt * 14) * 0.6
    put(sfx, reverb(s, 2.5, 0.35, seed=int(t * 10)), t, gain)


def click(t, gain=0.2, lo=2000, hi=7000, dur=0.012, pan=0.0):
    n = int(dur * SR)
    s = fft_filter(rng.standard_normal(n), lo=lo, hi=hi) * np.exp(-T(n) * 400)
    put(sfx, s, t, gain, pan)


def stab(t, ch, gain=0.18, dur=1.2):
    n = int(dur * SR); tt = T(n)
    s = sum(saw(note(m), n, d) for m in ch for d in (-0.004, 0.004))
    s = fft_filter(s, hi=2200) * env(n, 0.01, 0.35)
    put(mus, reverb(s, 2.0, 0.4, seed=3), t, gain)


# title
whoosh(3.15, 0.5, 0.35, rev=True)
impact(3.72, 1.0, 1.2)
stab(3.72, [50, 53, 57, 62], 0.12)
# Victor turn
whoosh(6.4, 0.45, 0.12, 0.3)
# freeze frames: whoosh in + hit
for tin, tf, pan in ((16.6, 17.05, -0.3), (19.0, 19.45, 0.3), (21.4, 21.88, -0.2)):
    whoosh(tin, tf - tin, 0.35, pan, rev=True)
    impact(tf, 0.75, 0.7)
    click(tf, 0.5, 1500, 9000, 0.02)                              # shutter
    n = int(0.05 * SR); put(sfx, fft_filter(rng.standard_normal(n), lo=3000) * np.exp(-T(n) * 120), tf + 0.06, 0.3)
# gum bubble growing (19.0) + Marco bite crunch (21.85)
n = int(0.45 * SR); tt = T(n); put(sfx, np.sin(2 * np.pi * np.cumsum(300 + 500 * tt / 0.45) / SR) * 0.3 * np.minimum(1, tt / 0.1), 19.0, 0.18)
for k in range(5): click(21.82 + k * 0.025, 0.35, 800, 5000, 0.02)
# hand slam on table
n = int(0.6 * SR); tt = T(n)
thud = np.sin(2 * np.pi * (60 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9) + fft_filter(rng.standard_normal(n), lo=200, hi=1600) * np.exp(-tt * 25) * 0.8
put(sfx, reverb(thud, 0.8, 0.2), 23.88, 0.9)
whoosh(23.55, 0.3, 0.15)
# paper slide when camera reaches the sandwich polaroid
n = int(0.5 * SR); put(sfx, fft_filter(rng.standard_normal(n), lo=2500, hi=8000) * np.sin(np.pi * T(n) / 0.5), 27.2, 0.06)
# comedic beat: record-scratch-ish slide down at 35.0
n = int(0.35 * SR); tt = T(n)
put(sfx, np.sin(2 * np.pi * np.cumsum(900 * np.exp(-tt * 6) + 120) / SR) * np.exp(-tt * 4) * fft_filter(rng.standard_normal(n), lo=200, hi=4000) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(700 * np.exp(-tt * 7) + 90) / SR)) * np.exp(-tt * 5) * 0.25, 34.98, 0.35)
# typing
tt0 = 37.2
r2 = np.random.default_rng(3)
t = tt0
while t < 41.0:
    click(t, 0.18 + r2.random() * 0.12, 1500, 6000, 0.01, 0.2)
    t += 0.05 + r2.random() * 0.09
# access granted beep
for k, f in enumerate((880, 1320)):
    n = int(0.12 * SR); put(sfx, np.sin(2 * np.pi * f * T(n)) * env(n, 0.005, 0.08), 39.4 + k * 0.13, 0.12)
# CCTV cuts: static bursts + hum
for tc in (41.0, 50.6):
    n = int(0.15 * SR); put(sfx, rng.standard_normal(n) * np.exp(-T(n) * 15), tc, 0.25)
for a, b in ((41.0, 44.0), (50.6, 56.0)):
    n = int((b - a) * SR); tt = T(n)
    hum = sum(np.sin(2 * np.pi * 50 * k * tt) / k for k in (1, 2, 3, 5)) * 0.5
    hiss = fft_filter(rng.standard_normal(n), lo=4000) * 0.25
    put(sfx, (hum * 0.06 + hiss * 0.12) * np.minimum(1, tt / 0.05) * np.minimum(1, (b - a - tt) / 0.02), a, 1.0)
# figure crossing background (42.4) - low sting
whoosh(42.45, 1.0, 0.12, 0.0)
n = int(1.5 * SR); tt = T(n); put(sfx, reverb(np.sin(2 * np.pi * 73.4 * tt) * np.exp(-tt * 2) * 0.6, 2, 0.4), 42.9, 0.35)
# bubble stretch + POP
n = int(0.9 * SR); tt = T(n)
stretch = np.sin(2 * np.pi * np.cumsum(220 + 380 * (tt / 0.9) ** 1.5 + 12 * np.sin(2 * np.pi * 7 * tt)) / SR) * np.minimum(1, tt / 0.2)
put(sfx, stretch, 44.2, 0.06)
n = int(0.12 * SR); tt = T(n)
pop = np.sin(2 * np.pi * np.cumsum(1500 * np.exp(-tt * 40) + 250) / SR) * np.exp(-tt * 45) + rng.standard_normal(n) * np.exp(-tt * 300)
put(sfx, pop, 45.1, 0.7)
# Victor whip + sting
whoosh(47.55, 0.35, 0.4, 0.4)
impact(48.05, 0.55, 0.6)
stab(48.05, [37, 49, 50, 56], 0.1, 1.6)
# masked figure footsteps (50.6-53.4)
for k, ft in enumerate(np.arange(50.75, 53.4, 0.39)):
    click(ft, 0.25, 300, 2500, 0.03, 0.1)
# riser to the glitch, hard cut at 56.0
n = int((56.0 - 52.4) * SR); tt = T(n); D = 56.0 - 52.4
ris = np.sin(2 * np.pi * np.cumsum(120 + 900 * (tt / D) ** 2) / SR) * 0.5
ris += fft_filter(rng.standard_normal(n), lo=1500, hi=9000) * (tt / D) ** 2
put(sfx, ris * (tt / D) ** 1.6, 52.4, 0.35)
# glitch bursts
r3 = np.random.default_rng(9)
t = 55.0
while t < 56.0:
    n = int((0.02 + r3.random() * 0.06) * SR)
    f = 200 + r3.random() * 3000
    g = np.sign(np.sin(2 * np.pi * f * T(n))) * 0.5 + r3.standard_normal(n) * 0.5
    put(sfx, np.round(g * 4) / 4, t, 0.15 + (t - 55) * 0.25, r3.random() * 1.6 - 0.8)
    t += 0.03 + r3.random() * 0.08
# silence at 56.0 then end sting
impact(56.85, 1.0, 1.4)
stab(56.85, [38, 50, 53, 57, 62], 0.12, 2.5)
# ticking clock (episode 2 tease)
for k, ct in enumerate(np.arange(57.6, 60.8, 0.5)):
    click(ct, 0.25 if k % 2 == 0 else 0.18, 2500 if k % 2 == 0 else 1800, 7000, 0.015)

# ------------------------------------------------------------------ AMBIENCE
roof_mask = np.zeros(N)
for a, b in ((0, 41.0), (44.0, 50.6)):
    roof_mask[int(a * SR):int(b * SR)] = 1
roof_mask = np.convolve(roof_mask, np.ones(2400) / 2400, mode='same')
city = fft_filter(np.cumsum(rng.standard_normal(N)) * 0.02, lo=40, hi=400)
city /= np.max(np.abs(city)) + 1e-9
wind = fft_filter(rng.standard_normal(N), lo=300, hi=1200)
wind /= np.max(np.abs(wind)) + 1e-9
gust = 0.5 + 0.5 * np.sin(2 * np.pi * T(N) * 0.13) * np.sin(2 * np.pi * T(N) * 0.07 + 1)
amb[0] += (city * 0.09 + wind * 0.035 * gust) * roof_mask
amb[1] += (np.roll(city, 977) * 0.09 + np.roll(wind, 3001) * 0.035 * gust) * roof_mask
# distant two-tone siren in the opening
n = int(5.5 * SR); tt = T(n)
f = np.where((tt // 0.65) % 2 == 0, 435, 580)
sir = np.sin(2 * np.pi * np.cumsum(f) / SR)
sir = fft_filter(sir, hi=1200) * np.minimum(1, tt / 1.5) * np.minimum(1, (5.5 - tt) / 1.5)
put(amb, reverb(sir, 2.5, 0.6, 4), 0.2, 0.03, 0.6)

# ------------------------------------------------------------------ MIX
music = reverb(mus[0], 1.6, 0.15, 11), reverb(mus[1], 1.6, 0.15, 12)
mix = np.stack(music) * 0.9 + sfx * 0.85 + amb
# hard silence at the cut to black (56.0 - 56.85)
cut = np.ones(N); a, b = int(56.0 * SR), int(56.84 * SR)
cut[a:b] = 0.0
mix *= cut
# fade out end
mix[:, -int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
# gentle limiter
peak = np.max(np.abs(mix))
mix = mix / peak * 1.25
mix = np.tanh(mix) / np.tanh(1.25) * 0.89
os.makedirs('work', exist_ok=True)
# SFX + ambience stem (licensed music is mixed in by score.py)
stem = sfx * 0.85 + amb
stem *= cut
stem = np.clip(stem / (np.max(np.abs(stem)) + 1e-9) * 0.9, -1, 1)
with wave.open('work/sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stem.T * 32767).astype('<i2').tobytes())
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared'))
from score import build
build('work/sfx.wav', [
    ('Five_Armies',           0.0,  0.0, 16.9, 1, 0.8, 0.5),
    ('Rynos_Theme',          29.5, 16.6, 37.4, -1, 0.1, 0.4),
    ('Volatile_Reaction',    29.6, 37.15, 41.3, 0, 0.1, 0.4),
    ('Crypto',                0.0, 41.0, 56.0, 1, 0.3, 0.02),
    ('Impact_Prelude',      131.6, 56.85, 61.0, -1, 0.02, 1.5),
], 'work/audio_scored.wav', DUR, silences=[(56.0, 56.84)], ducks=[(35.0, 37.1, -10)])
with wave.open('work/audio_synth.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype('<i2').tobytes())
print('wrote work/audio.wav', mix.shape, 'rms', np.sqrt(np.mean(mix ** 2)))
