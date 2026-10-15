import React, { useEffect, useState } from "react";
import { api, Ref } from "../api";

/** Browse the visual reference library (the skill's original images) and pick references for option D. */
export const ReferencesPanel: React.FC<{ picked: string[]; setPicked: (r: string[]) => void }> = ({ picked, setPicked }) => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [refs, setRefs] = useState<Ref[]>([]);
  const [big, setBig] = useState<Ref | null>(null);
  type Mine = { id: string; name: string; tags: string[]; note: string; kind: string };
  const [mine, setMine] = useState<Mine[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("style");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.library().then((l) => setMine(l.references)).catch(() => setMine([]));
  }, []);
  const add = async () => {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const data = await new Promise<string>((ok) => {
        const fr = new FileReader();
        fr.onload = () => ok(String(fr.result).split(",")[1] ?? "");
        fr.readAsDataURL(file);
      });
      const r = await api.addReference(file.name, data, tags, note, kind);
      setMine(r.references);
      setFile(null);
      setTags("");
      setNote("");
      setMsg("Added. Claude Code reads your library on every request; mention its ID (e.g. MY-001) in option D to use it.");
    } catch (e) {
      setMsg(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => api.references(q, cat).then(setRefs).catch(() => setRefs([])), 200);
    return () => clearTimeout(t);
  }, [q, cat]);
  return (
    <div className="refs-panel" data-testid="refs-panel">
      <h2>My library</h2>
      <p className="muted small">Your own references (images or short clips). Claude Code reads them when it builds; tag them so it finds the right one.</p>
      <div className="my-lib-add" data-testid="my-lib-add">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" data-testid="my-lib-file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <input placeholder="tags: glow, saas, dashboard" value={tags} onChange={(e) => setTags(e.target.value)} data-testid="my-lib-tags" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} data-testid="my-lib-kind">
          <option value="style">style (look and colour)</option>
          <option value="motion">motion (how it moves)</option>
          <option value="background">background</option>
          <option value="text">text animation</option>
          <option value="ui">UI / on-screen</option>
        </select>
        <input placeholder="what should Claude take from it?" value={note} onChange={(e) => setNote(e.target.value)} data-testid="my-lib-note" />
        <button className="primary small" disabled={!file || busy} onClick={add} data-testid="my-lib-upload">
          {busy ? "Adding…" : "Add to my library"}
        </button>
      </div>
      {msg ? <p className="small">{msg}</p> : null}
      {mine.length ? (
        <div className="ref-grid" data-testid="my-lib-grid">
          {mine.map((r) => (
            <div key={r.id} className={`ref${picked.includes(r.id) ? " picked" : ""}`}>
              {/\.(mp4|webm)$/i.test(r.name) ? (
                <video src={`/api/library/file/${r.id}`} muted loop autoPlay playsInline />
              ) : (
                <img src={`/api/library/file/${r.id}`} alt={r.id} loading="lazy" />
              )}
              <div className="small">
                <b>{r.id}</b> {r.kind} · {r.tags.join(", ")}
              </div>
              {r.note ? <div className="muted small">{r.note}</div> : null}
              <button className="ghost small" onClick={() => setPicked(picked.includes(r.id) ? picked.filter((x) => x !== r.id) : [...picked, r.id])}>
                {picked.includes(r.id) ? "remove" : "use for D"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <h2>Visual reference library</h2>
      <div className="row">
        <input placeholder="search: stat, glow, editorial, chips…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">all</option>
          <option value="ONS">On-screen</option>
          <option value="TXT">Text</option>
          <option value="FUL">Full-screen</option>
        </select>
      </div>
      {picked.length ? (
        <p className="small">
          Picked for D: {picked.join(", ")}{" "}
          <button className="ghost small" onClick={() => setPicked([])}>
            clear
          </button>
        </p>
      ) : null}
      {big ? (
        <div className="ref-big" onClick={() => setBig(null)}>
          <img src={big.img} alt={big.id} />
          <p>
            <b>{big.id}</b> {big.title} · {big.family}
          </p>
        </div>
      ) : null}
      <div className="ref-grid">
        {refs.map((r) => (
          <div key={r.id} className={`ref${picked.includes(r.id) ? " picked" : ""}`}>
            <img src={r.img} alt={r.id} loading="lazy" onClick={() => setBig(r)} />
            <div className="small">
              <b>{r.id}</b> {r.title}
            </div>
            <button className="ghost small" onClick={() => setPicked(picked.includes(r.id) ? picked.filter((x) => x !== r.id) : [...picked, r.id])}>
              {picked.includes(r.id) ? "remove" : "use for D"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
