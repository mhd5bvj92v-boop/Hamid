"""CAMERA 6 — Part 1 sound design. Writes ep01/work/audio.wav (48 kHz stereo).
Buses: CAM (what the app's microphone hears: band-limited, mono, hissy), ROOM (Noor's real room: wide, warm), MUS (drone + motif).
"""
import sys, os, wave, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'the-paris-job', 'shared'))
import numpy as np
from audiolib import SR, T, fft_filter, env, reverb, note

DUR = 60.0
N = int(DUR * SR)
rng = np.random.default_rng(61)
cam = np.zeros(N); room = np.zeros((2, N)); mus = np.zeros((2, N))
noise = lambda n: rng.standard_normal(n)


def put(buf, sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    s = sig[: N - i] * g
    if buf.ndim == 1: buf[i:i + len(s)] += s; return
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[0, i:i + len(s)] += s * l; buf[1, i:i + len(s)] += s * r


def seg(t0, t1, fade=0.08):
    n = int((t1 - t0) * SR); e = np.ones(n); k = int(fade * SR)
    if k: e[:k] = np.linspace(0, 1, k); e[-k:] = np.linspace(1, 0, k)
    return n, e


def load(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2') / 32768.0


# ---------------------------------------------------------------- sound sources
def bell(t, f, g=0.3, bus='mus'):  # soft app chime
    n = int(1.6 * SR); tt = T(n)
    s = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for m, a, d in ((1, 1, 3), (2.0, 0.35, 5), (3.01, 0.12, 8), (4.2, 0.05, 11)))
    s *= np.minimum(1, tt / 0.004)
    put(mus if bus == 'mus' else cam, reverb(s, 1.4, 0.25, 3) if bus == 'mus' else s, t, g)


def dingdong(t, g=0.32):
    bell(t, note(76), g); bell(t + 0.42, note(72), g * 0.95)


def pling(t, g=0.22):
    n = int(0.5 * SR); tt = T(n)
    s = (np.sin(2 * np.pi * 1568 * tt) * 0.7 + np.sin(2 * np.pi * 2093 * tt) * np.exp(-np.maximum(0, tt - 0.06) * 30) * (tt > 0.06)) * np.exp(-tt * 9)
    put(room, s, t, g, 0.1)


def tap(t, g=0.09):
    n = int(0.03 * SR); put(room, fft_filter(noise(n), lo=1800, hi=7000) * np.exp(-T(n) * 220), t, g)


def key(t, g=0.06):
    n = int(0.025 * SR); put(room, fft_filter(noise(n), lo=2500, hi=9000) * np.exp(-T(n) * 260), t, g, rng.uniform(-0.2, 0.2))


def glitch(t, dur=0.35, g=0.35):
    n = int(dur * SR); tt = T(n)
    s = np.sign(np.sin(2 * np.pi * (300 + 2500 * rng.random()) * tt)) * (rng.random(n) < 0.6)
    s = s * (np.sin(2 * np.pi * 37 * tt) > 0) + fft_filter(noise(n), lo=2000) * 0.5
    put(room, s * np.exp(-tt * 4) * 0.5, t, g)


def heartbeat(t0, t1, bpm0, bpm1, g=0.5):
    t = t0
    while t < t1:
        u = (t - t0) / (t1 - t0); bpm = bpm0 + (bpm1 - bpm0) * u
        for dt, a in ((0, 1.0), (0.16, 0.6)):
            n = int(0.3 * SR); tt = T(n)
            put(room, np.sin(2 * np.pi * (42 + 22 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 13), t + dt, g * a)
        t += 60 / bpm


def breath(t, dur=1.6, g=0.12, fast=False):
    n = int(dur * SR); tt = T(n)
    e = np.sin(np.pi * tt / dur) ** 2
    s = fft_filter(noise(n), lo=500, hi=3500) * e
    put(room, s, t, g, -0.1)


def creak(t, dur=1.4, f0=180, g=0.25, bus=None, pan=0.0):
    n = int(dur * SR); tt = T(n)
    f = f0 * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * tt) + 0.1 * rng.standard_normal(n).cumsum() / np.sqrt(np.arange(1, n + 1)) * 0.0)
    ph = 2 * np.pi * np.cumsum(f) / SR
    pulses = (np.sin(ph) > 0.97).astype(float)
    s = fft_filter(pulses, lo=200, hi=3000) * np.sin(np.pi * tt / dur) ** 0.5
    s = reverb(s, 0.8, 0.2, 9)
    if bus is cam: put(cam, s, t, g)
    else: put(room, s, t, g, pan)


def thump(t, g=0.9):
    n = int(1.6 * SR); tt = T(n)
    s = np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-tt * 10)) / SR) * np.exp(-tt * 3)
    s += fft_filter(noise(n), hi=900) * np.exp(-tt * 30) * 0.5
    put(room, reverb(s, 2.0, 0.3, 5), t, g)


def drone(t0, t1, g, root=31, swell=True):
    n, e = seg(t0, t1, 0.6); tt = T(n)
    s = sum(np.sin(2 * np.pi * note(root + iv) * (1 + d) * tt) for iv in (0, 7, 12) for d in (-0.002, 0.002))
    s = s * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * tt)) + fft_filter(noise(n), lo=40, hi=180) * 0.6
    if swell: e = e * np.minimum(1, (tt / (t1 - t0)) ** 1.5 + 0.15)
    put(mus, s * e, t0, g)


def piano(t, m, g=0.2):
    n = int(4 * SR); tt = T(n); f = note(m)
    s = sum(a * np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * tt) * np.exp(-tt * (0.9 + k * 0.6)) for k, a in ((1, 1), (2, 0.5), (3, 0.25), (4, 0.12), (5, 0.06)))
    put(mus, reverb(s * np.minimum(1, tt / 0.003), 3.0, 0.4, 2), t, g)


# ---------------------------------------------------------------- beds
def street_bed(t0, t1, rain=False, g=1.8):
    n, e = seg(t0, t1, 0.05); tt = T(n)
    wind = fft_filter(noise(n), lo=120, hi=900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.13 * tt + t0)) * 0.12
    hum = fft_filter(noise(n), lo=60, hi=250) * 0.05
    buzz = sum(np.sin(2 * np.pi * 100 * k * tt) / k for k in (1, 2, 3)) * 0.01 * (np.sin(tt * 37) > 0.2)
    s = wind + hum + buzz
    if rain: s += fft_filter(noise(n), lo=900, hi=8000) * 0.16 + fft_filter((rng.random(n) < 0.004) * rng.random(n), lo=1500) * 0.6
    put(cam, s * e, t0, g)


def dog(t, g=0.12):
    for k in range(2):
        n = int(0.22 * SR); tt = T(n)
        f = 380 * (1 + 0.5 * np.exp(-tt * 20))
        s = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * fft_filter(noise(n), lo=500, hi=2500)) * np.exp(-tt * 12) * np.minimum(1, tt / 0.01)
        put(cam, reverb(fft_filter(s, hi=1500), 1.5, 0.5, 4), t + k * 0.38, g)


def room_bed(t0, t1, g=2.0):
    n, e = seg(t0, t1, 0.05)
    s = fft_filter(noise(n), lo=40, hi=400) * 0.03 + fft_filter(noise(n), lo=2000, hi=6000) * 0.004
    put(room, s * e, t0, g)
    put(room, np.roll(s, 4000) * e, t0, g * 0.0)


def ir_bed(t0, t1, kind):
    n, e = seg(t0, t1, 0.03); tt = T(n)
    s = fft_filter(noise(n), lo=200, hi=5000) * 0.03
    if kind == 'garden': s += fft_filter(noise(n), lo=150, hi=700) * 0.12 * (0.6 + 0.4 * np.sin(tt * 3))
    if kind == 'hall': s += np.sin(2 * np.pi * 50 * tt) * 0.02
    if kind == 'rain': s += fft_filter(noise(n), lo=700, hi=7000) * 0.22 + fft_filter(noise(n), lo=80, hi=400) * 0.1 * (0.5 + 0.5 * np.sin(tt * 1.7))
    put(cam, s * e, t0)


# ---------------------------------------------------------------- timeline
dingdong(0.0, 0.26); pling(0.25)
street_bed(0.0, 9.0); dog(3.2); dog(7.4, 0.08)
for tt_ in (2.1, 5.0, 14.0, 30.0, 32.2, 34.0, 35.6, 36.8, 41.5, 46.4): tap(tt_)
glitch(5.0); glitch(14.0)
n = int(1.6 * SR); put(cam, fft_filter(noise(n), lo=3000, hi=6000) * np.sin(np.pi * T(n) / 1.6) * 0.04, 2.25)  # zoom servo whine
# bedroom 9-11.6
room_bed(9.0, 11.6); breath(9.1, 1.4, 0.1); breath(10.5, 1.2, 0.12)
n = int(0.8 * SR); put(room, fft_filter(noise(n), lo=300, hi=3000) * np.sin(np.pi * T(n) / 0.8) * 0.12, 9.05, 1, 0.2)  # sheets
piano(9.0, 50, 0.16)
# chat 11.6-14
room_bed(11.6, 14.0)
msg = 'someone’s outside my house'
for i in range(len(msg)): key(11.85 + i * 1.15 / len(msg))
n = int(0.35 * SR); put(room, fft_filter(noise(n), lo=800, hi=5000) * np.sin(np.pi * T(n) / 0.35) ** 2 * 0.25, 13.05)  # send
# 14-30: he is at the gate
street_bed(14.0, 30.0); drone(14.5, 26.0, 0.16); dog(18.5, 0.06)
n, e = seg(22.25, 30.0, 0.02); put(cam, fft_filter(noise(n), lo=400, hi=5000) * 0.09 * e, 22.25)  # two-way audio hiss
n = int(0.12 * SR); put(cam, fft_filter(noise(n), lo=1000, hi=5000) * np.exp(-T(n) * 30) * 0.9, 22.25)  # click on
whisper = load(os.path.join(HERE, 'work', 'noor.wav'))
put(cam, whisper / (np.max(np.abs(whisper)) + 1e-9) * 0.11, 24.55)
put(cam, reverb(whisper, 0.4, 0.15, 8) * 0.0, 24.55)
cam[int(26.0 * SR):int(26.85 * SR)] *= 0.05; mus[:, int(26.0 * SR):int(26.85 * SR)] *= 0.0  # hard silence after the whisper
glitch(28.4, 0.3, 0.3)
drone(26.85, 36.8, 0.2)
# 30-36.8 switching cameras
ir_bed(30.0, 32.2, 'garden'); ir_bed(32.2, 34.0, 'hall'); ir_bed(34.0, 35.6, 'up'); ir_bed(35.6, 36.8, 'up')
heartbeat(29.6, 38.5, 78, 118, 0.55)
for tt_ in (30.0, 32.2, 34.0, 35.6, 36.8): n = int(0.2 * SR); put(cam, np.sin(2 * np.pi * 7800 * T(n)) * np.exp(-T(n) * 25) * 0.05, tt_)
# 36.8-41.5 gate empty, rain
street_bed(36.8, 41.5, rain=True)
thump(36.8, 0.35)
# 41.5-46.4 front door open
ir_bed(41.5, 46.4, 'rain'); drone(41.5, 49.5, 0.16, root=30)
pling(46.2)
# 46.4-49.5 upstairs: her door slowly closes
ir_bed(46.4, 49.5, 'up'); creak(47.2, 2.0, 140, 0.3, bus=cam)
# 49.5-54 the room
room_bed(49.5, 53.3); breath(49.6, 0.9, 0.16); breath(50.5, 0.8, 0.18)
heartbeat(49.5, 53.2, 120, 132, 0.45)
creak(51.0, 0.9, 210, 0.35, pan=0.6)  # a floorboard IN the room
n, e = seg(51.8, 53.3, 0.01); put(room, (np.sin(2 * np.pi * 100 * T(n)) * 0.03 + fft_filter(noise(n), lo=3000) * 0.01) * e * (np.sin(T(n) * 40) > -0.3), 51.8, 1, 0.5)
mus[:, int(53.3 * SR):int(53.35 * SR)] *= 0; room[:, int(53.3 * SR):] *= 0; cam[int(53.3 * SR):] *= 0
thump(53.35, 0.8)
n = int(0.5 * SR); put(room, fft_filter(noise(n), lo=200, hi=2500) * np.exp(-T(n) * 6) * 0.15, 53.4, 1, 0.5)  # an exhale in the dark
# 54: NIGHT 1/5, end card
dingdong(54.2, 0.3); piano(54.2, 43, 0.22)
street_bed(57.6, 60.0, g=1.2)

# ---------------------------------------------------------------- mix
camf = fft_filter(cam, lo=160, hi=6000) * 1.25
camf = np.tanh(camf * 1.6) / 1.6 + fft_filter(noise(N), lo=3000, hi=7000) * 0.003 * (np.abs(cam) > 1e-5)
mix = room.copy() + np.stack([camf, camf]) + mus * 0.55
n = int(1.2 * SR); mix[:, -n:] *= np.linspace(1, 0, n)
mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.95
os.makedirs(os.path.join(HERE, 'work'), exist_ok=True)
with wave.open(os.path.join(HERE, 'work', 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix, -1, 1).T * 32767).astype('<i2').tobytes())
print('wrote audio.wav')
