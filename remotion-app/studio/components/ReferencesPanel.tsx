import React, { useEffect, useState } from "react";
import { api, Ref } from "../api";

/** Browse the visual reference library (the skill's original images) and pick references for option D. */
export const ReferencesPanel: React.FC<{ picked: string[]; setPicked: (r: string[]) => void }> = ({ picked, setPicked }) => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [refs, setRefs] = useState<Ref[]>([]);
  const [big, setBig] = useState<Ref | null>(null);
  useEffect(() => {
    const t = setTimeout(() => api.references(q, cat).then(setRefs).catch(() => setRefs([])), 200);
    return () => clearTimeout(t);
  }, [q, cat]);
  return (
    <div className="refs-panel" data-testid="refs-panel">
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
