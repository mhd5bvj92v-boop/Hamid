import React, { useEffect, useState } from "react";
import type { EditDoc, Preference } from "../../src/kit/project";
import { api } from "../api";

const KIND_LABEL: Record<Preference["kind"], string> = { like: "I like", avoid: "avoid", rule: "always" };
const SCOPE_LABEL: Record<Preference["scope"], string> = { scene: "this scene", project: "this project", future: "future videos" };

export const nextPrefId = (all: Preference[]) => `P-${String(all.reduce((n, p) => Math.max(n, Number(p.id.slice(2)) || 0), 0) + 1).padStart(3, "0")}`;

/**
 * The user's saved feedback preferences (brief §35): scene and project ones live in edit.json
 * (doc.preferences), future-videos ones in the local library (library/preferences.json). A preference is
 * never promoted to a wider scope by itself: changing its scope is an explicit choice here.
 */
export const PreferencesPanel: React.FC<{ doc: EditDoc; segId: string | null; setDoc: (d: EditDoc) => void }> = ({ doc, segId, setDoc }) => {
  const [future, setFuture] = useState<Preference[]>([]);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Preference["kind"]>("avoid");
  const [scope, setScope] = useState<Preference["scope"]>(segId ? "scene" : "project");
  useEffect(() => {
    api.preferences().then((r) => setFuture(r.preferences)).catch(() => setFuture([]));
  }, []);
  const local = doc.preferences ?? [];
  const all = [...local, ...future];
  const saveFuture = async (list: Preference[]) => setFuture((await api.savePreferences(list)).preferences);
  const add = async () => {
    const p: Preference = { id: nextPrefId(all), text: text.trim(), kind, scope, active: true, at: new Date().toISOString(), source: "manual", ...(scope === "scene" && segId ? { segmentId: segId } : {}) };
    if (scope === "future") await saveFuture([...future, p]);
    else setDoc({ ...doc, preferences: [...local, p] });
    setText("");
  };
  const update = async (p: Preference, patch: Partial<Preference>) => {
    const n = { ...p, ...patch };
    const fromFuture = p.scope === "future";
    const toFuture = n.scope === "future";
    if (n.scope === "scene" && !n.segmentId) n.segmentId = segId ?? undefined;
    if (n.scope !== "scene") delete n.segmentId;
    const nextLocal = local.filter((x) => x.id !== p.id);
    const nextFuture = future.filter((x) => x.id !== p.id);
    if (toFuture) await saveFuture([...nextFuture, n]);
    else if (fromFuture) await saveFuture(nextFuture);
    if (!toFuture) setDoc({ ...doc, preferences: [...nextLocal, n] });
    else if (!fromFuture) setDoc({ ...doc, preferences: nextLocal });
  };
  const remove = async (p: Preference) => {
    if (p.scope === "future") await saveFuture(future.filter((x) => x.id !== p.id));
    else setDoc({ ...doc, preferences: local.filter((x) => x.id !== p.id) });
  };
  const shown = all.filter((p) => p.scope !== "scene" || !segId || p.segmentId === segId);

  return (
    <div className="prefs" data-testid="prefs">
      <b>Saved preferences</b> <span className="muted small">Claude Code reads the active ones with every request; scene ones stay on their scene.</span>
      {shown.length ? (
        <ul className="pref-list">
          {shown.map((p) => (
            <li key={p.id} className={p.active ? "" : "off"} data-testid={`pref-${p.id}`}>
              <input type="checkbox" checked={p.active} onChange={(e) => update(p, { active: e.target.checked })} title="active" data-testid={`pref-active-${p.id}`} />
              <span className="badge">{KIND_LABEL[p.kind]}</span>
              <input className="pref-text" value={p.text} onChange={(e) => update(p, { text: e.target.value })} data-testid={`pref-text-${p.id}`} />
              <select value={p.scope} onChange={(e) => update(p, { scope: e.target.value as Preference["scope"] })} data-testid={`pref-scope-${p.id}`}>
                {(Object.keys(SCOPE_LABEL) as Preference["scope"][]).map((k) => (
                  <option key={k} value={k} disabled={k === "scene" && !segId && !p.segmentId}>
                    {SCOPE_LABEL[k]}
                    {k === "scene" && p.segmentId ? ` (${p.segmentId})` : ""}
                  </option>
                ))}
              </select>
              <button className="ghost small" onClick={() => remove(p)} data-testid={`pref-remove-${p.id}`}>
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">None yet. Save one here, or tick "Remember this" when you ask for changes.</p>
      )}
      <div className="row small pref-add">
        <select value={kind} onChange={(e) => setKind(e.target.value as Preference["kind"])} data-testid="pref-new-kind">
          {(Object.keys(KIND_LABEL) as Preference["kind"][]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <input placeholder="e.g. less glow on text; keep cards on the left third" value={text} onChange={(e) => setText(e.target.value)} data-testid="pref-new-text" />
        <select value={scope} onChange={(e) => setScope(e.target.value as Preference["scope"])} data-testid="pref-new-scope">
          {(Object.keys(SCOPE_LABEL) as Preference["scope"][]).map((k) => (
            <option key={k} value={k} disabled={k === "scene" && !segId}>
              {SCOPE_LABEL[k]}
            </option>
          ))}
        </select>
        <button className="small" disabled={!text.trim()} onClick={add} data-testid="pref-add">
          Save preference
        </button>
      </div>
    </div>
  );
};
