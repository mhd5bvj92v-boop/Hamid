"""Score + sound design for THE PARIS JOB ep.2 "The Competition". Writes ep02/work/audio.wav"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared'))
import numpy as np
from audiolib import Mix, SR, T, fft_filter, env, saw, note, reverb

DUR = 60.0
m = Mix(DUR, seed=21)
BPM = 120; B = 60 / BPM; S16 = B / 4
EM = [40, 40, 52, 40, 43, 40, 45, 46]          # E minor driving ostinato (16ths)

# ---------------- 0 - 2.6 recap: drone + glitch
m.pad(0, 2.7, [40, 41, 52], 0.05, 0.4, 0.1)
for t in (0.0, 1.2, 2.35):
    n = int(0.12 * SR); m.put('sfx', m.noise(n) * np.exp(-T(n) * 18), t, 0.22)
m.whoosh(2.25, 0.4, 0.3, rev=True)

# ---------------- 2.6 - 7.0 TITLE: driving heist theme
m.impact(3.0, 1.0, 1.2); m.stab(3.0, [52, 55, 59, 64], 0.13)
t = 3.0; step = 0
while t < 7.0:
    m.bass(t, EM[step % 8], 0.3 if step % 2 == 0 else 0.22, S16 * 1.6)
    if step % 8 == 0: m.kick(t, 0.9)
    if step % 8 == 4: m.snare(t, 0.5)
    m.hat(t, 0.16 if step % 2 else 0.24)
    t += S16; step += 1
m.pad(3.0, 7.0, [52, 55, 59], 0.05, 0.3, 0.3, cutoff=1500)
for k, nn in enumerate([64, 67, 66, 64, 71, 70]):              # brass-ish riff
    m.stab(3.0 + 1.0 + k * B * 0.5, [nn], 0.05, 0.3)
for ft in np.arange(2.75, 7.0, 0.42): m.click(ft, 0.12, 300, 2200, 0.025, 0.1)   # sneaky steps

# ---------------- 7.0 - 23.2 sneaky comedic pizzicato
sneak_line = [52, 55, 57, 58, 59, 58, 57, 55]
t = 7.0; k = 0
while t < 23.2:
    duck = 0.35 if 16.6 <= t < 19.4 else 1.0
    if k % 2 == 0: m.pluck(t, sneak_line[(k // 2) % 8], 0.42 * duck, 0.22, -0.2)
    if k % 4 == 0: m.bass(t, 40 if (k // 16) % 2 == 0 else 43, 0.4 * duck, 0.18, 600)
    if k % 8 == 4:                                             # finger snap
        n = int(0.05 * SR); m.put('mus', fft_filter(m.noise(n), lo=1800, hi=5000) * np.exp(-T(n) * 90), t, 0.45 * duck, 0.3)
    t += B / 2; k += 1
m.pad(7.0, 23.2, [40, 47], 0.02, 1.0, 0.5, cutoff=500)
m.put('sfx', fft_filter(m.noise(int(0.5 * SR)), lo=1500, hi=7000) * np.sin(np.pi * T(int(0.5 * SR)) / 0.5), 7.6, 0.08)   # bag rustle
# sandwich slide across marble
n = int(2.45 * SR); tt = T(n)
slide = fft_filter(m.noise(n), lo=600, hi=3500) * np.exp(-tt * 0.9) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt))
m.put('sfx', slide, 12.95, 0.22)
m.whoosh(12.75, 0.3, 0.18)
# sniffs, chomps, snore
for st in (15.8, 15.98, 16.2):
    n = int(0.09 * SR); m.put('sfx', fft_filter(m.noise(n), lo=2000, hi=6000) * np.sin(np.pi * T(n) / 0.09), st, 0.18)
for ct in (16.8, 17.25, 17.7, 18.1):
    for j in range(4): m.click(ct + j * 0.018, 0.3, 700, 4500, 0.02)
n = int(0.9 * SR); tt = T(n)
snore = fft_filter(m.noise(n), lo=80, hi=600) * np.sin(np.pi * tt / 0.9) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 28 * tt)))
m.put('sfx', snore, 18.6, 0.35)
m.stab(23.0, [52, 59, 64], 0.06, 0.4)                          # "ta-da"

# ---------------- 23.2 - 28.0 entering: heartbeat, drop to silence
m.pad(23.2, 25.4, [40, 46], 0.04, 0.3, 0.2)
for ft in np.arange(23.3, 25.6, 0.45): m.click(ft, 0.1, 300, 2000, 0.025)
for hb in np.arange(23.4, 25.4, 0.8):
    for dt, g in ((0, 1.0), (0.18, 0.6)):
        n = int(0.3 * SR); tt = T(n); m.put('mus', np.sin(2 * np.pi * (50 + 30 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 12), hb + dt, 0.45 * g)
m.impact(26.6, 0.6, 0.9); m.pad(26.6, 28.1, [28, 40, 41], 0.05, 0.05, 0.3)

# ---------------- 28.0 - 34.0 tension ostinato (crescendo)
m.whoosh(28.3, 1.0, 0.18)
t = 28.0; step = 0
while t < 34.0:
    u = (t - 28.0) / 6.0
    nn = [40, 41][(step // 8) % 2]
    n = int(S16 * 0.9 * SR)
    s = fft_filter(saw(note(nn + 12), n), hi=500 + 1800 * u) * env(n, 0.003, S16 * 0.6)
    m.put('mus', s, t, 0.14 + 0.18 * u)
    if step % 8 == 0: m.kick(t, 0.35 + 0.4 * u)
    t += S16; step += 1
m.pad(28.0, 34.0, [52, 53], 0.03, 1.0, 0.1, cutoff=1200)
m.tom(33.5, 140, 0.5); m.tom(33.62, 120, 0.5); m.tom(33.75, 100, 0.6); m.tom(33.87, 80, 0.7)

# ---------------- 34.0 - 41.0 ACTION
t = 34.0; step = 0
while t < 47.5:
    act = t < 41.0
    g = 1.0 if act else 0.55
    m.bass(t, EM[step % 8] + (0 if (step // 32) % 2 == 0 else 3), 0.33 * g, S16 * 1.5, 900 if act else 500)
    if step % 4 == 0: m.kick(t, 0.95 * g)
    if step % 8 == 4: m.snare(t, 0.6 * g)
    m.hat(t, (0.2 if step % 2 else 0.28) * g, open_=(step % 8 == 6))
    if act and step % 16 == 14: m.tom(t, 100, 0.5); m.tom(t + S16 / 2, 80, 0.5)
    t += S16; step += 1
for k, st in enumerate(np.arange(34.0, 41.0, B * 2)):
    m.stab(st, [[52, 55, 59], [53, 57, 60], [52, 55, 59], [50, 54, 57]][k % 4], 0.08, 0.5)
for ft in np.arange(34.05, 35.45, 0.18): m.click(ft, 0.3, 300, 2500, 0.03)      # running
m.metal(35.55, 0.25, 820); m.metal(35.6, 0.22, 900); m.metal(35.85, 0.22, 760); m.metal(35.9, 0.2, 980)
n = int(0.6 * SR); tt = T(n)
m.put('sfx', reverb(np.sin(2 * np.pi * (55 + 50 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 8) + fft_filter(m.noise(n), lo=150, hi=1400) * np.exp(-tt * 20) * 0.7, 0.8, 0.2), 35.9, 1.0)
# alarm: bell + two-tone siren, 36.4 - 54.6 (lower after 41)
n = int((54.6 - 36.4) * SR); tt = T(n)
bell = np.sign(np.sin(2 * np.pi * 1050 * tt)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * tt)))
siren = np.sin(2 * np.pi * np.cumsum(np.where((tt // 0.45) % 2 == 0, 660, 880)) / SR)
alarm = fft_filter(bell * 0.25 + siren * 0.5, hi=3500)
lvl = np.where(tt < 4.6, 1.0, 0.35)
m.put('sfx', alarm * lvl, 36.4, 0.12)

# ---------------- 41.0 - 47.5 approach: filtered groove (above) + riser
n = int((49.4 - 44.0) * SR); tt = T(n); D = 49.4 - 44.0
ris = np.sin(2 * np.pi * np.cumsum(100 + 700 * (tt / D) ** 2) / SR) * 0.5 + fft_filter(m.noise(n), lo=1500, hi=9000) * (tt / D) ** 2
m.put('mus', ris * (tt / D) ** 1.6, 44.0, 0.3)
m.pad(41.0, 49.4, [40, 46, 52], 0.04, 0.5, 0.05)
for ft in np.arange(41.1, 43.0, 0.5): m.click(ft, 0.18, 300, 2200, 0.03)

# ---------------- reveal
m.whoosh(48.55, 0.35, 0.35, rev=True)
# 49.4 - 50.4 silence (handled at mix) ; 50.4 hit + choir
m.impact(50.4, 1.0, 1.5)
n = int(4.2 * SR); tt = T(n)
choir = sum(np.sin(2 * np.pi * note(nn) * tt * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * tt + i))) for i, nn in enumerate([52, 55, 59, 64, 67]))
choir = fft_filter(choir, hi=2500) * np.minimum(1, tt / 0.3) * np.minimum(1, (4.2 - tt) / 0.2)
m.put('mus', reverb(choir, 2.5, 0.5, 9), 50.4, 0.07)
m.pad(50.4, 54.6, [28, 40], 0.06, 0.05, 0.05)
# ---------------- end card
m.impact(55.4, 0.9, 1.3); m.stab(55.4, [52, 55, 59, 64], 0.1, 2.5)
for k, ct in enumerate(np.arange(56.4, 59.6, 0.5)): m.click(ct, 0.45 if k % 2 == 0 else 0.35, 2500 if k % 2 == 0 else 1800, 7000, 0.015)
for t in (54.3, 54.42, 54.5): n = int(0.08 * SR); m.put('sfx', m.noise(n) * np.exp(-T(n) * 30), t, 0.25)

# ---------------- ambience: exterior wind / interior room tone
n = m.N; tt = T(n)
wind = fft_filter(m.noise(n), lo=300, hi=1200); wind /= np.max(np.abs(wind))
room = fft_filter(m.noise(n), lo=60, hi=300); room /= np.max(np.abs(room))
ext = ((tt > 2.6) & (tt < 7.0)).astype(float); inn = ((tt >= 7.0) & (tt < 54.6)).astype(float)
k = np.ones(2400) / 2400; ext = np.convolve(ext, k, 'same'); inn = np.convolve(inn, k, 'same')
for c in (0, 1):
    m.amb[c] += np.roll(wind, c * 3001) * 0.05 * ext + np.roll(room, c * 977) * 0.03 * inn

m.finish(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'work', 'audio.wav'), silences=[(49.4, 50.38), (54.6, 55.38)])
