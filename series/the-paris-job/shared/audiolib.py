"""Shared synthesis helpers for The Paris Job soundtracks (numpy only)."""
import numpy as np, wave, os

SR = 48000


class Mix:
    def __init__(self, dur, seed=7):
        self.N = int(SR * dur)
        self.mus = np.zeros((2, self.N))
        self.sfx = np.zeros((2, self.N))
        self.amb = np.zeros((2, self.N))
        self.rng = np.random.default_rng(seed)

    def put(self, bus, sig, t, gain=1.0, pan=0.0):
        b = getattr(self, bus)
        i = int(t * SR)
        if i >= self.N: return
        s = sig[: max(0, self.N - i)] * gain
        if i < 0: s = s[-i:]; i = 0
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        b[0, i:i + len(s)] += s * l * 1.414
        b[1, i:i + len(s)] += s * r * 1.414

    def noise(self, n): return self.rng.standard_normal(n)

    # ---- effects
    def whoosh(self, t, dur=0.5, gain=0.4, pan=0.0, rev=False):
        n = int(dur * SR); tt = T(n); x = self.noise(n)
        lo = fft_filter(x, lo=200, hi=900); hi = fft_filter(x, lo=1500, hi=6000)
        u = tt / dur
        if rev: u = u ** 2
        e = np.sin(np.pi * np.clip(u, 0, 1)) ** (1.5 if not rev else 3)
        self.put('sfx', (lo * (1 - u) + hi * u) * e, t, gain, pan)

    def impact(self, t, gain=0.9, size=1.0):
        n = int(2.2 * SR); tt = T(n)
        f = 32 + 70 * np.exp(-tt * 8 / size)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2 / size)
        s += fft_filter(self.noise(n), hi=1800) * np.exp(-tt * 14) * 0.6
        self.put('sfx', reverb(s, 2.5, 0.35, seed=int(t * 10) + 1), t, gain)

    def click(self, t, gain=0.2, lo=2000, hi=7000, dur=0.012, pan=0.0):
        n = int(dur * SR)
        self.put('sfx', fft_filter(self.noise(n), lo=lo, hi=hi) * np.exp(-T(n) * 400), t, gain, pan)

    def stab(self, t, ch, gain=0.18, dur=1.2, bus='mus', cutoff=2200):
        n = int(dur * SR)
        s = sum(saw(note(m), n, d) for m in ch for d in (-0.004, 0.004))
        s = fft_filter(s, hi=cutoff) * env(n, 0.01, 0.35)
        self.put(bus, reverb(s, 2.0, 0.4, seed=3), t, gain)

    def pad(self, t0, t1, ch, gain, fade_in=1.0, fade_out=1.0, cutoff=900):
        n = int((t1 - t0) * SR); tt = T(n)
        s = sum(saw(note(m), n, d) for m in ch for d in (-0.004, 0.004))
        s = fft_filter(s, hi=cutoff)
        e = np.minimum(1, tt / fade_in) * np.minimum(1, (t1 - t0 - tt) / fade_out)
        self.put('mus', s * e, t0, gain)

    def kick(self, t, gain=1.0):
        n = int(0.4 * SR); tt = T(n)
        f = 45 + 80 * np.exp(-tt * 30)
        self.put('mus', np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9), t, gain)

    def snare(self, t, gain=0.6):
        n = int(0.25 * SR)
        s = fft_filter(self.noise(n), lo=900, hi=6000) * np.exp(-T(n) * 22) * 0.8 + np.sin(2 * np.pi * 185 * T(n)) * np.exp(-T(n) * 30) * 0.5
        self.put('mus', s, t, gain)

    def hat(self, t, gain=0.3, open_=False):
        n = int((0.2 if open_ else 0.06) * SR)
        self.put('mus', fft_filter(self.noise(n), lo=7000) * np.exp(-T(n) * (14 if open_ else 50)), t, gain)

    def tom(self, t, f0=110, gain=0.6):
        n = int(0.5 * SR); tt = T(n)
        self.put('mus', np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-tt * 20))) / SR) * np.exp(-tt * 7), t, gain)

    def pluck(self, t, m, gain=0.3, dur=0.25, pan=0.0):
        n = int(dur * SR); tt = T(n); f = note(m)
        s = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(4 * np.pi * f * tt) + 0.15 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 18)
        self.put('mus', s, t, gain, pan)

    def bass(self, t, m, gain=0.35, dur=0.2, cutoff=700):
        n = int(dur * SR)
        s = fft_filter(saw(note(m), n), hi=cutoff) * env(n, 0.004, dur * 0.5)
        self.put('mus', s, t, gain)

    def metal(self, t, gain=0.3, base=900):
        n = int(1.2 * SR); tt = T(n)
        s = sum(np.sin(2 * np.pi * base * r * tt) * np.exp(-tt * (3 + i * 2)) / (i + 1) for i, r in enumerate((1, 2.76, 5.4, 8.93)))
        self.put('sfx', s, t, gain)

    def stem(self, path):
        """Write SFX + ambience only (music comes from licensed tracks via score.py)."""
        mix = self.sfx * 0.85 + self.amb
        mix = np.clip(mix / (np.max(np.abs(mix)) + 1e-9) * 0.9, -1, 1)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((mix.T * 32767).astype('<i2').tobytes())
        print('wrote', path)

    def finish(self, path, music_gain=0.9, sfx_gain=0.85, silences=(), fade_end=1.5):
        mus = np.stack([reverb(self.mus[0], 1.6, 0.15, 11), reverb(self.mus[1], 1.6, 0.15, 12)])
        mix = mus * music_gain + self.sfx * sfx_gain + self.amb
        for a, b in silences:
            mix[:, int(a * SR):int(b * SR)] = 0
        n = int(fade_end * SR); mix[:, -n:] *= np.linspace(1, 0, n)
        mix = mix / (np.max(np.abs(mix)) + 1e-9) * 1.25
        mix = np.tanh(mix) / np.tanh(1.25) * 0.89
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with wave.open(path, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((mix.T * 32767).astype('<i2').tobytes())
        print('wrote', path)


def T(n): return np.arange(n) / SR


def fft_filter(x, lo=None, hi=None, slope=1.5):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    return np.fft.irfft(X * g, len(x))


def env(n, a=0.005, d=0.2):
    t = T(n)
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))


def saw(freq, n, detune=0.0):
    t = T(n); out = np.zeros(n)
    for k in range(1, 24):
        if freq * k > 9000: break
        out += np.sin(2 * np.pi * freq * (1 + detune) * k * t) / k
    return out * 0.6


def note(m): return 440 * 2 ** ((m - 69) / 12)


def reverb(x, secs=2.0, mix=0.3, seed=1):
    n = int(SR * secs); r = np.random.default_rng(seed)
    ir = fft_filter(r.standard_normal(n) * np.exp(-T(n) / (secs / 5)), hi=5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    L = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return x * (1 - mix) + y * mix
