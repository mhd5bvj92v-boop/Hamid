import React, { useState } from "react";
import type { EditDoc } from "../../src/kit/project";
import { PLATFORM_ZONES, PlatformZone } from "../../src/kit/Guides";

type Platform = keyof typeof PLATFORM_ZONES;
const SIDES = ["left", "top", "right", "bottom"] as const;

/**
 * Edit the platform UI zones shown by the guides (preview-only). The presets are approximate and unverified;
 * the user's own values (e.g. measured on a screenshot of their app) are saved in edit.json
 * (constants.platformZones) and labelled as theirs. Values are percentages of the frame.
 */
export const PlatformZonesEditor: React.FC<{ doc: EditDoc; platform: Platform; setDoc: (d: EditDoc) => void }> = ({ doc, platform, setDoc }) => {
  const [open, setOpen] = useState(false);
  const c = doc.constants ?? ({} as NonNullable<EditDoc["constants"]>);
  const mine = c.platformZones?.[platform];
  const zones: PlatformZone[] = mine ?? PLATFORM_ZONES[platform].zones;
  const save = (next: PlatformZone[] | null) => {
    const pz = { ...(c.platformZones ?? {}) };
    if (next) pz[platform] = next;
    else delete pz[platform];
    setDoc({ ...doc, constants: { ...c, platformZones: pz } });
  };
  const setBox = (i: number, side: number, pct: number) => {
    const v = Math.min(100, Math.max(0, pct)) / 100;
    save(zones.map((z, j) => (j === i ? { ...z, box: z.box.map((b, k) => (k === side ? v : b)) as PlatformZone["box"] } : z)));
  };
  return (
    <span className="zones-edit">
      <button className={`chip${open ? " active" : ""}`} onClick={() => setOpen(!open)} data-testid="zones-edit" title="edit the platform zones">
        {mine ? "your zones" : "unverified preset"} ✎
      </button>
      {open ? (
        <div className="zones-pop" data-testid="zones-pop">
          <div className="small">
            <b>{PLATFORM_ZONES[platform].label}</b>{" "}
            {mine ? (
              <span className="badge ok" data-testid="zones-status">your values (saved in this project)</span>
            ) : (
              <span className="badge warn" data-testid="zones-status">unverified preset: {PLATFORM_ZONES[platform].checked}</span>
            )}
          </div>
          <p className="muted small">Percent of the frame. Measure on a screenshot of the app you post to; the guides are never rendered.</p>
          <table className="small">
            <thead>
              <tr>
                <th />
                {SIDES.map((s) => (
                  <th key={s}>{s} %</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((z, i) => (
                <tr key={z.name}>
                  <td>{z.name}</td>
                  {SIDES.map((s, k) => (
                    <td key={s}>
                      <input type="number" min={0} max={100} step={0.5} value={Math.round(z.box[k] * 1000) / 10} onChange={(e) => setBox(i, k, Number(e.target.value))} data-testid={`zone-${i}-${s}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {mine ? (
            <button className="ghost small" onClick={() => save(null)} data-testid="zones-reset">
              back to the approximate preset
            </button>
          ) : null}
        </div>
      ) : null}
    </span>
  );
};
