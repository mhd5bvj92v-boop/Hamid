import React from "react";
import type { EditDoc, SfxFamily, SfxItem } from "../../src/kit/project";
import { GAIN_PRESETS, fmtTime } from "../../src/kit/project";
import { SoundMeta, sfxEventTime } from "../../src/kit/studio";

type Props = { doc: EditDoc; setDoc: (d: EditDoc) => void; sounds: SoundMeta[]; segmentId: string | null; seek: (t: number) => void };
const CATS: Record<SfxFamily, string[]> = { whoosh: ["WSH"], texture: ["POP", "UI", "SCI", "MEC", "TEX"], riser: ["RIS"], hit: ["HIT"] };

export const SoundPanel: React.FC<Props> = ({ doc, setDoc, sounds, segmentId, seek }) => {
  const fps = doc.source.fps;
  const items = doc.sfx.filter((s) => !segmentId || s.segmentId === segmentId || !s.segmentId);
  const upd = (id: string, patch: Partial<SfxItem>) => setDoc({ ...doc, sfx: doc.sfx.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  return (
    <div className="sound" data-testid="sound-panel">
      <h2>Sound design (System D)</h2>
      <p className="muted small">
        Sounds are linked to animation events (they move with the animation) or to a time. Gains start at Joseph's presets: whoosh −12 (max −10), texture −6…−7, riser −5, hit −6;
        music −19 under the talking head only. The final mix (scripts/sound_mix.py) uses the original dialogue, untouched.
      </p>
      {!sounds.length ? (
        <div className="warn" data-testid="no-sounds">
          No sound effects are indexed yet. Index your authorised SFX folder (python3 scripts/sfx_index.py scan /path/to/SFX); until then sounds stay unassigned and nothing is
          added to the mix.
        </div>
      ) : null}
      {segmentId ? <p className="muted small">Showing segment {segmentId} (and unlinked sounds).</p> : null}
      {items.map((s) => {
        const t = sfxEventTime(doc, s);
        const p = GAIN_PRESETS[s.family];
        const outside = s.gainDb < p.min || s.gainDb > p.max;
        return (
          <div key={s.id} className={`sfx-row${s.enabled ? "" : " off"}`} data-testid={`sfxrow-${s.id}`}>
            <div className="row">
              <b className={`fam fam-${s.family}`}>{s.family}</b>
              <span>{s.label}</span>
              <span className="muted small">{"beatId" in s.link ? `→ ${s.link.beatId} · ${s.link.intent}` : "fixed time"}</span>
              <button className="ghost small" onClick={() => t !== null && seek(t)}>
                {t === null ? "--" : fmtTime(t)} ▶
              </button>
            </div>
            <div className="row">
              <select value={s.sound ?? ""} onChange={(e) => upd(s.id, { sound: e.target.value || null })} data-testid={`sfx-sound-${s.id}`}>
                <option value="">— no sound assigned —</option>
                {sounds
                  .filter((x) => !x.category || CATS[s.family].includes(x.category))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.id} {x.role ? `(${x.role})` : ""} {x.duration.toFixed(2)} s
                    </option>
                  ))}
              </select>
              <label>
                gain
                <input type="number" step={0.5} value={s.gainDb} onChange={(e) => upd(s.id, { gainDb: +e.target.value })} data-testid={`sfx-gain-${s.id}`} /> dB
              </label>
              <label>
                offset
                <input type="number" step={1} value={s.offsetFrames} onChange={(e) => upd(s.id, { offsetFrames: Math.round(+e.target.value) })} data-testid={`sfx-offset-${s.id}`} /> fr
              </label>
              <label>
                <input type="checkbox" checked={s.enabled} onChange={(e) => upd(s.id, { enabled: e.target.checked })} /> on
              </label>
            </div>
            {outside ? (
              <input className="reason" placeholder={`Outside the ${s.family} preset (${p.min}…${p.max} dB): why?`} value={s.gainReason ?? ""} onChange={(e) => upd(s.id, { gainReason: e.target.value })} />
            ) : null}
            <span className="muted small">offset {(s.offsetFrames / fps * 1000).toFixed(0)} ms from the animation event</span>
          </div>
        );
      })}
      {!items.length ? <p className="muted">No sound effects yet: choosing a visual concept proposes them from its animation events.</p> : null}
    </div>
  );
};
