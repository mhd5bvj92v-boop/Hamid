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
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [done, setDone] = useState(0);
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("style");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.library().then((l) => setMine(l.references)).catch(() => setMine([]));
  }, []);
  const OK = /\.(png|jpe?g|webp|gif|mp4|webm)$/i;
  const pick = (list: FileList | null) => setFiles(Array.from(list ?? []).filter((f) => OK.test(f.name)));
  // one file at a time (IDs stay in order); tags, kind and note apply to every file of the batch
  const add = async () => {
    if (!files.length) return;
    setBusy(true);
    setMsg("");
    setDone(0);
    const added: string[] = [];
    const dups: string[] = [];
    const failed: string[] = [];
    for (const f of files) {
      try {
        const data = await new Promise<string>((ok, bad) => {
          const fr = new FileReader();
          fr.onload = () => ok(String(fr.result).split(",")[1] ?? "");
          fr.onerror = () => bad(fr.error);
          fr.readAsDataURL(f);
        });
        const r = await api.addReference(f.name, data, tags, note, kind);
        setMine(r.references);
        if (r.duplicate) dups.push(`${f.name} = ${r.duplicate.id}`);
        else if (r.added) added.push(r.added);
      } catch (e) {
        failed.push(`${f.name}: ${String((e as Error).message ?? e)}`);
      }
      setDone((n) => n + 1);
    }
    setFiles([]);
    setBusy(false);
    setMsg(
      [
        added.length ? `Added ${added.length} (${added[0]}${added.length > 1 ? `–${added[added.length - 1]}` : ""}). Claude Code reads your library on every request; mention an ID in option D to use it.` : "",
        dups.length ? `Skipped ${dups.length} already in your libraries: ${dups.slice(0, 6).join(", ")}${dups.length > 6 ? ", …" : ""}.` : "",
        failed.length ? `Failed ${failed.length}: ${failed.slice(0, 3).join("; ")}` : "",
      ].filter(Boolean).join(" "),
    );
  };
  useEffect(() => {
    const t = setTimeout(() => api.references(q, cat).then(setRefs).catch(() => setRefs([])), 200);
    return () => clearTimeout(t);
  }, [q, cat]);
  return (
    <div className="refs-panel" data-testid="refs-panel">
      <h2>My library</h2>
      <p className="muted small">Your own references (images or short clips). Claude Code reads them when it builds; tag them so it finds the right one.</p>
      <div
        className={`my-lib-add${drag ? " drag" : ""}`}
        data-testid="my-lib-add"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files);
        }}
      >
        <label className="my-lib-drop">
          <input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" data-testid="my-lib-file" onChange={(e) => pick(e.target.files)} />
          <span>{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} ready` : "Drop images or clips here, or click to choose (many at once)"}</span>
        </label>
        <input placeholder="tags: glow, saas, dashboard" value={tags} onChange={(e) => setTags(e.target.value)} data-testid="my-lib-tags" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} data-testid="my-lib-kind">
          <option value="style">style (look and colour)</option>
          <option value="motion">motion (how it moves)</option>
          <option value="background">background</option>
          <option value="text">text animation</option>
          <option value="ui">UI / on-screen</option>
        </select>
        <input placeholder="what should Claude take from it?" value={note} onChange={(e) => setNote(e.target.value)} data-testid="my-lib-note" />
        <button className="primary small" disabled={!files.length || busy} onClick={add} data-testid="my-lib-upload">
          {busy ? `Adding ${done}/${files.length}…` : files.length > 1 ? `Add ${files.length} to my library` : "Add to my library"}
        </button>
      </div>
      {msg ? <p className="small" data-testid="my-lib-msg">{msg}</p> : null}
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
