"""Sound design for THE PARIS JOB Part 3 "Lockdown" (no music: the series' music is added later from the owner's own library).
Writes ep03/work/audio.wav"""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'shared'))
import numpy as np
from audiolib import Mix, SR, T, fft_filter, env, reverb

DUR = 60.0
m = Mix(DUR, seed=303)
N = m.N
bn = lambda n, lo=None, hi=None: fft_filter(m.noise(n), lo=lo, hi=hi)


def seg(t0, t1, fade=0.15):
    n = int((t1 - t0) * SR); tt = T(n)
    return n, tt, np.minimum(1, tt / fade) * np.minimum(1, (t1 - t0 - tt) / fade)


def siren(t0, t1, g=0.1, dist=1.0, pan=0.0, rate=0.42, f=(440, 587)):
    n, tt, e = seg(t0, t1, 0.6)
    fr = np.where((tt // rate) % 2 == 0, f[0], f[1]) * (1 + 0.004 * np.sin(2 * np.pi * 5 * tt))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    s = fft_filter(s, hi=2500 / dist)
    m.put('amb', reverb(s * e, 2.5, 0.5, int(t0) + 3), t0, g, pan)


def heli(t0, t1, g=0.25):
    n, tt, e = seg(t0, t1, 1.5)
    chop = (0.5 + 0.5 * np.sin(2 * np.pi * 5.4 * tt)) ** 4
    s = bn(n, 30, 320) * (0.3 + chop) + np.sin(2 * np.pi * 44 * tt) * chop * 0.4
    m.put('amb', s * e, t0, g)


def rain(t0, t1, g=0.16, roof=False):
    n, tt, e = seg(t0, t1, 0.08)
    s = bn(n, 900, 9000) * 0.6 + bn(n, 150, 900) * 0.25
    drops = np.zeros(n); r = np.random.default_rng(int(t0 * 10))
    for i in r.integers(0, n - 300, int((t1 - t0) * (260 if roof else 120))): drops[i:i + 300] += np.exp(-np.arange(300) / 30) * r.random()
    s += fft_filter(drops, lo=1200) * (0.8 if roof else 0.4)
    m.put('amb', s * e, t0, g); m.put('amb', np.roll(s, 7000) * e, t0, g * 0.6, 0.7)


def step(t, g=0.25, hard=True, wet=False, metal=False, pan=0.0):
    n = int(0.12 * SR); tt = T(n)
    s = bn(n, 150, 2600 if hard else 1200) * np.exp(-tt * (60 if hard else 35)) + np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 40) * 0.6
    if wet: s += bn(n, 2000, 8000) * np.exp(-tt * 22) * 0.6
    if metal: s += sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 25) for f in (620, 1370, 2210)) * 0.25
    m.put('sfx', s, t, g, pan)


def duct_thump(t, g=0.2):
    n = int(0.5 * SR); tt = T(n)
    s = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in ((95, 9), (210, 14), (480, 22))) + bn(n, 200, 1500) * np.exp(-tt * 40) * 0.5
    m.put('sfx', reverb(s, 0.6, 0.35, int(t * 7)), t, g)


def rustle(t, dur=0.5, g=0.08):
    n = int(dur * SR); m.put('sfx', bn(n, 400, 4000) * np.sin(np.pi * T(n) / dur) ** 2, t, g)


def radio(t0, t1, g=0.35, pan=0.0):
    n, tt, e = seg(t0, t1, 0.03)
    voice = bn(n, 300, 3000) * (0.4 + 0.6 * (np.sin(2 * np.pi * 4.3 * tt) * np.sin(2 * np.pi * 1.7 * tt + 1) > 0))
    s = fft_filter(np.tanh(voice * 3), lo=400, hi=2800) + bn(n, 2000, 6000) * 0.25
    m.put('sfx', s * e, t0, g, pan)
    for tb in (t0 - 0.06, t1):
        k = int(0.06 * SR); m.put('sfx', bn(k, 1000, 5000) * np.exp(-T(k) * 40), tb, g * 1.2, pan)


def heartbeat(t0, t1, bpm=88, g=0.5):
    t = t0
    while t < t1:
        for dt, a in ((0, 1.0), (0.17, 0.6)):
            q = int(0.3 * SR); tq = T(q); m.put('sfx', np.sin(2 * np.pi * (48 + 25 * np.exp(-tq * 25)) * tq) * np.exp(-tq * 12), t + dt, g * a)
        t += 60 / bpm


def engine(t0, t1, g=0.3, rev=None):
    n, tt, e = seg(t0, t1, 0.4)
    rpm = np.full(n, 28.0)
    if rev: a, b = rev; rpm += np.clip((tt - (a - t0)) / (b - a), 0, 1) * 22
    ph = 2 * np.pi * np.cumsum(rpm) / SR
    s = np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3) + 0.3 * np.sin(4 * ph) + bn(n, 40, 400) * 0.4
    m.put('amb', fft_filter(s, hi=900) * e, t0, g)


def passby(tc, g=0.5, pan_dir=1):  # police car passing at speed: doppler siren + tyres on wet road
    n = int(3.0 * SR); tt = T(n) - 1.5
    shift = 1 + 0.12 * -np.tanh(tt * 2.2)
    amp = 1 / (1 + (tt * 2.4) ** 2)
    fr = np.where((T(n) // 0.42) % 2 == 0, 440, 587) * shift
    s = np.sin(2 * np.pi * np.cumsum(fr) / SR) * amp + bn(n, 300, 5000) * amp * 0.6
    l = np.clip(0.5 - 0.5 * np.tanh(tt * 2) * pan_dir, 0, 1)
    i = int((tc - 1.5) * SR); k = min(n, N - i)
    m.amb[0, i:i + k] += (s * (1 - l) * g)[:k]; m.amb[1, i:i + k] += (s * l * g)[:k]


def bang(t, g=0.6, size=1.0):
    n = int(1.2 * SR); tt = T(n)
    s = bn(n, 60, 2500) * np.exp(-tt * 18) + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 9) * 0.8
    m.put('sfx', reverb(s, 1.0 * size, 0.3, int(t * 3)), t, g)


# ---------------------------------------------------------------- 0-20 gallery under lockdown
m.impact(0.0, 0.55, 1.0)
n, tt, e = seg(0, 20.2, 0.05)
bell = np.sign(np.sin(2 * np.pi * 1000 * tt)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 16 * tt)))
m.put('sfx', fft_filter(bell, hi=2500) * e * 0.035, 0, 1.0)  # the alarm, still ringing, muffled
pulse = 0.5 + 0.5 * np.cos(((tt * 1.6) % 1) * 2 * np.pi)
m.put('amb', bn(n, 40, 200) * 0.05 * e, 0, 1.0)
siren(0.3, 20, 0.05, dist=3, pan=-0.5); siren(4.0, 20, 0.05, dist=3, pan=0.6, rate=0.45, f=(430, 575))
for t in np.arange(0.8, 12, 2.7): step(t, 0.05, hard=False, pan=-0.3)  # the shutters creak under pressure
heli(11.0, 20.0, 0.18)
radio(12.3, 14.85, 0.3, 0.2)
m.whoosh(14.55, 0.4, 0.3, rev=True)
# ---------------------------------------------------------------- 14.9-17 exterior cordon
rain(14.9, 17.0, 0.2); siren(14.9, 17.0, 0.16, dist=1.2, pan=-0.3); siren(14.9, 17.0, 0.12, dist=1.5, pan=0.4, rate=0.46, f=(435, 580)); heli(14.9, 17.0, 0.35)
m.impact(15.1, 0.7, 1.2)
# vent
m.metal(17.9, 0.12, 330); rustle(17.2, 0.6, 0.06)
m.whoosh(19.75, 0.35, 0.25, rev=True)
# ---------------------------------------------------------------- 20-34 the duct
n, tt, e = seg(20, 34, 0.3)
m.put('amb', (np.sin(2 * np.pi * 57 * tt) * 0.04 + bn(n, 60, 400) * 0.06 + bn(n, 2000, 5000) * 0.006) * e, 20, 1.0)
for t in np.arange(20.15, 34, 0.98):
    if 29.6 < t < 33.4: continue
    duct_thump(t, 0.12 + 0.05 * np.random.default_rng(int(t * 9)).random()); rustle(t + 0.2, 0.55, 0.05)
k = int(0.05 * SR); m.put('sfx', bn(k, 1500, 6000) * np.exp(-T(k) * 120), 24.5, 0.35)  # tracker clicks onto the tube
m.metal(24.52, 0.05, 2600)
m.metal(26.3, 0.06, 410)  # a duct seam pops
for t in np.arange(27.5, 30.6, 0.55): step(t, 0.09, pan=0.2)  # officers below
for t in np.arange(27.5, 30.2, 0.17): k = int(0.015 * SR); m.put('sfx', bn(k, 2500, 8000) * np.exp(-T(k) * 300), t, 0.05, -0.2)  # dog claws on tiles
for t in (30.45, 30.62, 30.9, 31.05, 31.5, 31.7, 32.0): k = int(0.12 * SR); m.put('sfx', bn(k, 600, 3500) * np.sin(np.pi * T(k) / 0.12), t, 0.14)  # sniffing
n = int(0.9 * SR); m.put('sfx', fft_filter(np.sin(2 * np.pi * np.cumsum(95 + 20 * np.sin(T(n) * 30)) / SR) * (1 + bn(n, 100, 800) * 2), hi=600) * np.sin(np.pi * T(n) / 0.9), 31.2, 0.14)  # low growl
heartbeat(29.6, 33.6, 92, 0.42)
radio(32.95, 33.9, 0.12, 0.3)
for t in np.arange(32.9, 34.0, 0.5): step(t, 0.1, pan=0.2)
# ---------------------------------------------------------------- 34-37.6 Louvre roof
rain(34.0, 37.6, 0.22); heli(34.0, 37.6, 0.42); siren(34.0, 37.6, 0.1, dist=1.6, pan=0.3)
n, tt, e = seg(34.0, 37.6, 0.1); m.put('amb', bn(n, 200, 1400) * 0.12 * e * (0.6 + 0.4 * np.sin(tt * 2.1)), 34.0, 1.0)
for i, t in enumerate(np.arange(34.05, 37.6, 0.24)): step(t, 0.2, metal=True, wet=True, pan=[-0.3, 0, 0.3][i % 3])
# ---------------------------------------------------------------- 37.6-44 the quay and the van
rain(37.6, 44.0, 0.2)
n, tt, e = seg(37.6, 44.0, 0.2); m.put('amb', bn(n, 80, 700) * 0.07 * (0.6 + 0.4 * np.sin(tt * 1.3)) * e, 37.6, 1.0)  # the Seine lapping
engine(37.6, 44.0, 0.12, rev=(42.4, 43.6))
for i, t in enumerate(np.arange(37.7, 40.3, 0.21)): step(t, 0.16, wet=True, pan=-0.4 + 0.25 * (i % 3))
n = int(0.6 * SR); m.put('sfx', bn(n, 300, 3000) * np.sin(np.pi * T(n) / 0.6) * 0.5, 40.0, 0.4)  # sliding door
bang(40.58, 0.5, 0.6)
k = int(0.04 * SR); m.put('sfx', bn(k, 2000, 7000) * np.exp(-T(k) * 150), 42.25, 0.35)  # seatbelt click
passby(42.95, 0.45, 1); passby(43.45, 0.38, 1)
siren(40.8, 44.0, 0.07, dist=2, pan=0.5)
# ---------------------------------------------------------------- 44-52.4 inside the van
n, tt, e = seg(44.0, 52.4, 0.05)
m.put('amb', (bn(n, 30, 250) * 0.16 * (1 + 0.2 * np.sin(tt * 13)) + bn(n, 1500, 8000) * 0.03) * e, 44.0, 1.0)
rain(44.0, 52.4, 0.09, roof=True)
k = int(0.03 * SR); m.put('sfx', bn(k, 1500, 6000) * np.exp(-T(k) * 150), 45.55, 0.4)  # UV lamp click
n, tt, e = seg(45.6, 50.4, 0.1); m.put('sfx', (np.sin(2 * np.pi * 120 * tt) * 0.02 + bn(n, 6000, 9000) * 0.006) * e, 45.6, 1.0)  # lamp hum
m.whoosh(49.55, 0.3, 0.3, rev=True); m.impact(49.85, 0.35, 0.8)
bang(50.4, 0.7, 1.0)
n, tt, e = seg(50.4, 52.4, 0.02); m.put('amb', (bn(n, 200, 6000) * 0.25 + bn(n, 40, 300) * 0.2) * e, 50.4, 1.0)  # wind + road roar through open doors
rain(50.4, 52.4, 0.25)
for t in np.arange(50.9, 52.4, 0.55): m.metal(t, 0.04, 260)  # loose door rattling
# ---------------------------------------------------------------- 52.4-55.6 Camille in the road
rain(52.4, 55.35, 0.2)
engine(52.4, 55.3, 0.06)
siren(52.4, 55.35, 0.04, dist=3, pan=-0.6)
for t in (52.6, 53.0, 53.45, 53.9): step(t, 0.12, wet=True, pan=0.1)
for tb in (54.4, 55.2):
    k = int(0.06 * SR); m.put('sfx', np.sin(2 * np.pi * 3100 * T(k)) * env(k, 0.002, 0.02), tb, 0.06)  # the tracker LED blips
# ---------------------------------------------------------------- end card
m.impact(55.62, 0.9, 1.4)
m.whoosh(57.0, 0.45, 0.25, rev=True); m.impact(57.2, 0.6, 1.0)
for i, ct in enumerate(np.arange(57.8, 59.8, 0.5)):
    q = int(0.02 * SR); m.put('sfx', bn(q, 2500, 9000) * np.exp(-T(q) * 300), ct, 0.3 if i % 2 == 0 else 0.2)

m.finish(os.path.join(HERE, 'work', 'audio.wav'), music_gain=0.0, sfx_gain=0.9, silences=[(55.35, 55.6)], fade_end=1.2)
