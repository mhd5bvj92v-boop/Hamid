"""Sound design + licensed score for THE PARIS JOB Part 2 (serious version). Writes ep02/work/audio.wav"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'shared'))
import numpy as np
from audiolib import Mix, SR, T, fft_filter, env, reverb
from score import build

DUR = 60.0
m = Mix(DUR, seed=33)
N = m.N; tt_all = T(N)


def band_noise(n, lo, hi): return fft_filter(m.noise(n), lo=lo, hi=hi)


def step(t, gain=0.3, hard=True, pan=0.0, wet=False):
    n = int(0.09 * SR); tt = T(n)
    s = band_noise(n, 150, 2500 if hard else 1200) * np.exp(-tt * (60 if hard else 35))
    s += np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 40) * 0.6
    if wet: s += band_noise(n, 2000, 8000) * np.exp(-tt * 25) * 0.5
    m.put('sfx', s, t, gain, pan)


# ---- 0-3 CCTV recap
n = int(3.0 * SR); hum = sum(np.sin(2 * np.pi * 50 * k * T(n)) / k for k in (1, 2, 3, 5)) * 0.06 + band_noise(n, 4000, None) * 0.03
m.put('sfx', hum, 0, 1.0)
for t in (0.0, 2.7, 2.85):
    k = int(0.12 * SR); m.put('sfx', m.noise(k) * np.exp(-T(k) * 18), t, 0.25)
# ---- 3-8.4 rooftop: laptop static
n = int(2.8 * SR); m.put('sfx', band_noise(n, 1500, 7000) * 0.04 * np.minimum(1, T(n) / 0.2), 3.0, 1.0)
# ---- 8.4-12 flashback
m.whoosh(8.05, 0.4, 0.35, rev=True)
m.impact(8.4, 0.55, 0.8)
n = int(1.1 * SR); m.put('sfx', band_noise(n, 800, 5000) * np.sin(np.pi * T(n) / 1.1) * 0.25, 8.6, 1.0)   # photo slide
for tp in (9.85, 10.05): m.metal(tp, 0.12, 2400)                                                     # ring taps
n = int(3.6 * SR); m.put('sfx', np.sin(2 * np.pi * 60 * T(n)) * 0.02 + np.sin(2 * np.pi * 120 * T(n)) * 0.01, 8.4, 1.0)
# ---- 12-16.4 rain + thunder + wet steps
n = int(4.6 * SR); tt = T(n)
rain = band_noise(n, 800, 9000) * 0.18 + band_noise(n, 200, 800) * 0.08
drops = np.zeros(n); r = np.random.default_rng(5)
for _ in range(900):
    i = r.integers(0, n - 200); drops[i:i + 200] += np.exp(-np.arange(200) / 25) * r.random() * 0.4
rain = (rain + fft_filter(drops, lo=1500)) * np.minimum(1, tt / 0.3) * np.minimum(1, (4.6 - tt) / 0.3)
m.put('amb', rain, 12.0, 0.9); m.put('amb', np.roll(rain, 9000), 12.0, 0.6, 0.6)
n = int(4.0 * SR); tt = T(n)
thunder = fft_filter(m.noise(n), hi=160) * (np.exp(-tt * 1.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * tt) ** 2))
m.put('sfx', reverb(thunder, 2.5, 0.4, 7), 12.5, 1.6)
for k, ts in enumerate(np.arange(12.15, 16.3, 0.32)): step(ts, 0.18, hard=False, pan=(-0.3 if k % 2 else 0.3), wet=True)
# ---- 16.4-26.4 corridor
n = int(10.0 * SR); m.put('amb', band_noise(n, 60, 300) * 0.05, 16.4, 1.0)
for b in (18.95, 19.08):
    k = int(0.07 * SR); m.put('sfx', np.sin(2 * np.pi * 1760 * T(k)) * env(k, 0.003, 0.04), b, 0.12)
for ts in np.arange(19.3, 39.5, 1.0):                                        # countdown tick
    k = int(0.02 * SR); m.put('sfx', band_noise(k, 3000, 9000) * np.exp(-T(k) * 300), ts, 0.28)
for ts in np.arange(18.5, 24.0, 0.55):                                       # guard steps approaching
    d = abs(-13.5 + (ts - 18.5) / 5.5 * 12.15 - 0.6)
    step(ts, 0.08 + 0.35 / (1 + d * 0.35), pan=0.15)
for ts in np.arange(25.7, 26.4, 0.55): step(ts, 0.3, pan=0.1)
for hb in np.arange(21.8, 24.6, 0.62):                                       # heartbeat while hiding
    for dt, g in ((0, 1.0), (0.17, 0.6)):
        q = int(0.3 * SR); tq = T(q); m.put('sfx', np.sin(2 * np.pi * (48 + 25 * np.exp(-tq * 25)) * tq) * np.exp(-tq * 12), hb + dt, 0.55 * g)
n = int(1.4 * SR); tt = T(n)                                                 # radio crackle
radio = band_noise(n, 900, 3200) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * tt))) * np.exp(-tt * 1.2) * 0.4
m.put('sfx', radio, 24.85, 0.5, 0.2)
k = int(0.06 * SR); m.put('sfx', band_noise(k, 1000, 4000), 26.25, 0.3)
# ---- 26.4- gallery
for ts in np.arange(26.5, 28.6, 0.5): step(ts, 0.1, hard=False)
n = int(1.3 * SR); m.put('sfx', band_noise(n, 300, 2500) * np.sin(np.pi * T(n) / 1.3) * 0.25, 26.5, 1.0)  # lifting the frame
m.whoosh(31.5, 0.8, 0.12)
n = int(0.3 * SR); m.put('sfx', band_noise(n, 80, 900) * np.exp(-T(n) * 18), 37.95, 0.5)                  # frame set down
for ts in np.arange(38.25, 38.9, 0.22): step(ts, 0.18)
k = int(0.03 * SR); m.put('sfx', band_noise(k, 1500, 6000) * np.exp(-T(k) * 150), 39.38, 0.7)              # button
n = int((55.6 - 39.5) * SR); tt = T(n)
bell = np.sign(np.sin(2 * np.pi * 1000 * tt)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 16 * tt)))
siren = np.sin(2 * np.pi * np.cumsum(np.where((tt // 0.5) % 2 == 0, 640, 860)) / SR)
alarm = fft_filter(bell * 0.25 + siren * 0.5, hi=3500) * np.where(tt < 2.5, 1.0, 0.4) * np.minimum(1, tt / 0.02)
m.put('sfx', alarm, 39.5, 0.13)
m.impact(39.5, 0.5, 0.7)
n = int(3.4 * SR); tt = T(n)                                                 # shutter motor + rattle
motor = (np.sin(2 * np.pi * 42 * tt) + 0.5 * np.sin(2 * np.pi * 84 * tt)) * 0.3 + band_noise(n, 300, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * tt))) * 0.25
m.put('sfx', motor * np.minimum(1, tt / 0.3), 41.8, 0.55)
for ts in np.arange(42.05, 44.8, 0.24): step(ts, 0.25, pan=0.2)
m.impact(45.2, 1.0, 1.0); m.metal(45.2, 0.35, 180); m.metal(45.23, 0.25, 260)
# ---- reveal + ending
m.whoosh(47.25, 0.4, 0.3, rev=True)
m.impact(47.6, 0.8, 1.3)
n = int(5.0 * SR); m.put('sfx', fft_filter(m.noise(n), hi=90) * np.minimum(1, T(n) / 1.0) * 0.6, 50.0, 0.7)
for t in (55.3, 55.42, 55.5):
    k = int(0.08 * SR); m.put('sfx', m.noise(k) * np.exp(-T(k) * 30), t, 0.25)
m.impact(56.4, 1.0, 1.4)
for k, ct in enumerate(np.arange(57.2, 59.8, 0.5)):
    q = int(0.02 * SR); m.put('sfx', band_noise(q, 2500, 9000) * np.exp(-T(q) * 300), ct, 0.35 if k % 2 == 0 else 0.25)
# wind bed on the rooftop / outside
wind = band_noise(N, 300, 1200); wind /= np.max(np.abs(wind))
mask = (((tt_all > 3.0) & (tt_all < 8.4)) | ((tt_all > 12.0) & (tt_all < 16.4))).astype(float)
mask = np.convolve(mask, np.ones(2400) / 2400, 'same')
m.amb[0] += wind * 0.05 * mask; m.amb[1] += np.roll(wind, 3001) * 0.05 * mask

m.stem(os.path.join(HERE, 'work', 'sfx.wav'))
build(os.path.join(HERE, 'work', 'sfx.wav'), [
    # track,               src,   t0,    t1,   dB,  fadeIn, fadeOut
    ('Long_Note_Four',      30.0,  0.0,   3.1, -2,  0.2,  0.3),
    ('Crypto',               0.0,  3.0,   8.5,  0,  0.4,  0.3),
    ('Unseen_Horrors',      50.0,  8.4,  12.1,  8,  0.3,  0.3),
    ('Five_Armies',         12.0, 12.0,  16.7,  0,  0.4,  0.5),
    ('The_Descent',          0.0, 16.4,  26.7,  1,  0.5,  0.5),
    ('Hitman',              37.9, 26.4,  39.55, 5,  0.6,  0.05),
    ('Hitman',              51.0, 39.5,  47.0,  0,  0.05, 0.6),
    ('Impact_Prelude',     131.6, 47.6,  55.6, -1,  0.02, 0.1),
    ('Five_Armies',        114.0, 56.4,  60.0, -1,  0.05, 1.4),
], os.path.join(HERE, 'work', 'audio.wav'), DUR, silences=[(55.6, 56.38)], ducks=[(21.8, 24.4, -7)])
