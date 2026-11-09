"""Mix licensed music tracks (cue list) with an episode's SFX/ambience stem.

Music: Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0.
Cue = (track_name, src_offset_s, t_start, t_end, gain_db, fade_in_s, fade_out_s)
"""
import subprocess, wave, os
import numpy as np

SR = 48000
MUSIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'music')


def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return (np.frombuffer(raw, '<i2').reshape(-1, 2).T / 32768.0).astype(np.float64)


def build(stem_wav, cues, out_wav, dur, sfx_gain=0.9, music_gain=0.75, silences=(), fade_end=1.5, ducks=()):
    N = int(dur * SR)
    music = np.zeros((2, N))
    cache = {}
    for name, off, t0, t1, gdb, fi, fo in cues:
        if name not in cache: cache[name] = load_audio(os.path.join(MUSIC_DIR, name + '.mp3'))
        src = cache[name]
        n = int((t1 - t0) * SR); a = int(off * SR)
        seg = src[:, a:a + n]
        if seg.shape[1] < n: seg = np.pad(seg, ((0, 0), (0, n - seg.shape[1])))
        tt = np.arange(n) / SR
        e = np.minimum(1, tt / max(fi, 1e-3)) * np.minimum(1, (t1 - t0 - tt) / max(fo, 1e-3))
        i = int(t0 * SR)
        music[:, i:i + n] += seg * e * 10 ** (gdb / 20)
    # optional ducking ranges (t0, t1, db)
    g = np.ones(N)
    for a, b, db in ducks:
        ia, ib = int(a * SR), int(b * SR); g[ia:ib] = 10 ** (db / 20)
    g = np.convolve(g, np.ones(4800) / 4800, mode='same')
    music *= g
    stem = load_audio(stem_wav)[:, :N]
    if stem.shape[1] < N: stem = np.pad(stem, ((0, 0), (0, N - stem.shape[1])))
    mix = music * music_gain + stem * sfx_gain
    for a, b in silences: mix[:, int(a * SR):int(b * SR)] = 0
    n = int(fade_end * SR); mix[:, -n:] *= np.linspace(1, 0, n)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 1.2
    mix = np.tanh(mix) / np.tanh(1.2) * 0.89
    with wave.open(out_wav, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype('<i2').tobytes())
    print('wrote', out_wav)
