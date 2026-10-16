import React, { useEffect, useMemo, useState } from "react";
import type { ConceptOption, CreativeSegment, EditDoc, RefAttachment, RefScope } from "../../src/kit/project";
import { INFLUENCE_LABEL, ROLE_LABEL, SCOPE_LABEL, kindOf, resolveRefs } from "../../src/kit/refs";
import { api, Ref } from "../api";
import { RefAnalysis } from "./RefAnalysis";
import { attach, detach, draftOf, editDraft, moveScope, sceneAttachments, thumbOf, toggleInherit, updateAttachment } from "../dDraft";

type Mine = { id: string; name: string; tags: string[]; note: string; kind: string };
const OPTS: ConceptOption[] = ["A", "B", "C"];
const HINTS = ["composition", "animation", "typography", "background", "sound"] as const;

const readB64 = (f: File) =>
  new Promise<string>((ok, bad) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).split(",")[1] ?? "");
    fr.onerror = () => bad(fr.error);
    fr.readAsDataURL(f);
  });

/**
 * Option D, "My own idea": select a scene -> type the idea -> optionally attach references right here
 * (search the libraries, upload, paste/drop, a link) -> save for Claude Code. The draft lives in edit.json
 * (seg.dDraft), so switching tabs, options or scenes and reloading never lose it.
 */
export const DEditor: React.FC<{
  doc: EditDoc;
  seg: CreativeSegment;
  setDoc: (d: EditDoc) => void;
  busy: string | null;
  wrap: (label: string, fn: () => Promise<void>) => Promise<void>;
  onSave: () => void;
}> = ({ doc, seg, setDoc, busy, wrap, onSave }) => {
  const d = draftOf(seg);
  const [q, setQ] = useState("");
  const [lib, setLib] = useState<Ref[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [url, setUrl] = useState("");
  const [showHints, setShowHints] = useState(!!Object.values(d.hints ?? {}).some(Boolean));
  const [drag, setDrag] = useState(false);
  const hasClaude = OPTS.some((k) => seg.concepts[k]);

  useEffect(() => {
    api.library().then((l) => setMine(l.references)).catch(() => setMine([]));
  }, []);
  useEffect(() => {
    if (!q.trim()) return setLib([]);
    const t = setTimeout(() => api.references(q, "").then((r) => setLib(r.slice(0, 8))).catch(() => setLib([])), 200);
    return () => clearTimeout(t);
  }, [q]);

  const ql = q.trim().toLowerCase();
  const mineHits = ql ? mine.filter((m) => `${m.id} ${m.name} ${m.tags.join(" ")} ${m.note}`.toLowerCase().includes(ql)).slice(0, 6) : [];
  const all = sceneAttachments(doc, seg);
  const resolved = useMemo(() => resolveRefs(doc, seg), [doc, seg]);
  const attachedHere = new Set(all.map((x) => x.a.id));

  const upload = (files: File[], note?: string) =>
    wrap("d-upload", async () => {
      let next = doc;
      for (const f of files) {
        if (!/\.(png|jpe?g|webp|gif)$/i.test(f.name)) continue;
        const r = await api.upload(doc.slug, f.name, await readB64(f));
        next = attach(next, seg.id, `UP-${r.path.split(/[\\/]/).pop()}`, "upload", { path: r.path, ...(note ? { note } : {}) });
      }
      setDoc(next);
    });
  // "upload instead" for a link that could not be opened: the upload keeps a note pointing to the link
  const fallback = React.useRef<HTMLInputElement>(null);
  const [fallbackFor, setFallbackFor] = useState("");

  const row = ({ a, at }: { a: RefAttachment; at: RefScope }) => {
    const thumb = thumbOf(doc.slug, a);
    const off = at === "project" && (seg.refExclude ?? []).includes(a.id);
    return (
      <div key={`${at}-${a.id}`} className={`d-att${off || a.influence === "exclude" ? " off" : ""}`} data-testid={`d-att-${a.id}`}>
        {thumb ? <img src={thumb} alt={a.id} className={a.kind === "upload" ? "upload-thumb" : undefined} /> : <span className="d-att-link">🔗</span>}
        <div className="d-att-body">
          <div className="d-att-top">
            <b>{a.id}</b>
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer" className="small">
                {a.url.slice(0, 40)}
              </a>
            ) : null}
            {at === "project" ? <span className="badge">inherited from project</span> : null}
          </div>
          <div className="d-att-ctl">
            <select value={at} onChange={(e) => setDoc(moveScope(doc, seg.id, a.id, at, e.target.value as RefScope))} data-testid={`d-att-scope-${a.id}`} title="where this reference applies">
              {(Object.keys(SCOPE_LABEL) as RefScope[]).map((k) => (
                <option key={k} value={k}>
                  {SCOPE_LABEL[k]}
                </option>
              ))}
            </select>
            <select value={a.role} onChange={(e) => setDoc(updateAttachment(doc, seg.id, a.id, at, { role: e.target.value as RefAttachment["role"] }))} data-testid={`d-att-role-${a.id}`} title="what to take from it">
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select value={a.influence} onChange={(e) => setDoc(updateAttachment(doc, seg.id, a.id, at, { influence: e.target.value as RefAttachment["influence"] }))} data-testid={`d-att-influence-${a.id}`}>
              {Object.entries(INFLUENCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <input
            className="small"
            placeholder="What should we take from this? (or avoid)"
            value={a.note ?? ""}
            onChange={(e) => setDoc(updateAttachment(doc, seg.id, a.id, at, { note: e.target.value }))}
            data-testid={`d-att-note-${a.id}`}
          />
        </div>
        <div className="d-att-analysis">
          <RefAnalysis
            slug={doc.slug}
            segId={seg.id}
            att={a}
            onUploadInstead={
              a.kind === "url"
                ? () => {
                    setFallbackFor(a.url ?? a.id);
                    fallback.current?.click();
                  }
                : undefined
            }
          />
        </div>
        {at === "project" ? (
          <button className="ghost small" onClick={() => setDoc(toggleInherit(doc, seg.id, a.id))} data-testid={`d-att-inherit-${a.id}`}>
            {off ? "use here" : "not in this scene"}
          </button>
        ) : (
          <button className="ghost small" onClick={() => setDoc(detach(doc, seg.id, a.id, at))} data-testid={`d-att-remove-${a.id}`} title="removes it from here; the saved reference stays in its library">
            remove
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={`d-editor${drag ? " drag" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDrag(true);
        }
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDrag(false);
        upload(Array.from(e.dataTransfer.files));
      }}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length) {
          e.preventDefault();
          upload(files);
        }
      }}
    >
      <textarea
        value={d.text}
        onChange={(e) => setDoc(editDraft(doc, seg.id, { text: e.target.value }))}
        data-testid="d-text"
        placeholder="e.g. Take B's card, but make it red, slide it in from the right, and add a soft glitch when it leaves."
      />
      {hasClaude ? (
        <div className="row small">
          <label>
            based on
            <select value={d.basedOn ?? ""} onChange={(e) => setDoc(editDraft(doc, seg.id, { basedOn: e.target.value as ConceptOption | "" }))} data-testid="d-based">
              <option value="">—</option>
              {OPTS.filter((k) => seg.concepts[k]).map((k) => (
                <option key={k} value={k}>
                  {k}: {seg.concepts[k]!.title}
                </option>
              ))}
            </select>
          </label>
          <span>combine</span>
          {OPTS.filter((k) => seg.concepts[k]).map((k) => (
            <label key={k}>
              <input
                type="checkbox"
                checked={(d.combine ?? []).includes(k)}
                onChange={(e) =>
                  setDoc(editDraft(doc, seg.id, { combine: e.target.checked ? [...(d.combine ?? []), k] : (d.combine ?? []).filter((x) => x !== k) }))
                }
                data-testid={`d-combine-${k}`}
              />{" "}
              {k}
            </label>
          ))}
        </div>
      ) : null}

      <div className="d-refs">
        <div className="d-refs-head">
          <b>References for this idea</b> <span className="muted small">optional · drop or paste images anywhere in this box</span>
        </div>
        <div className="d-add">
          <input placeholder="search your libraries: glow, stat, MY-003…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="d-ref-search" />
          <label className="file small">
            Upload images
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple data-testid="d-upload" onChange={(e) => upload(Array.from(e.target.files ?? []))} />
          </label>
        </div>
        {lib.length || mineHits.length ? (
          <div className="d-hits" data-testid="d-ref-hits">
            {[...mineHits.map((m) => ({ id: m.id, title: m.note || m.name, img: `/api/library/file/${m.id}` })), ...lib.map((r) => ({ id: r.id, title: r.title, img: r.img }))].map((h) => (
              <button
                key={h.id}
                className="d-hit"
                disabled={attachedHere.has(h.id)}
                onClick={() => setDoc(attach(doc, seg.id, h.id, kindOf(h.id)))}
                data-testid={`d-ref-add-${h.id}`}
                title={h.title}
              >
                <img src={h.img} alt={h.id} />
                <span>{attachedHere.has(h.id) ? "✓ " : "+ "}{h.id}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="d-add">
          <input placeholder="or paste a link to a reference (video, post, site)" value={url} onChange={(e) => setUrl(e.target.value)} data-testid="d-ref-url" />
          <button
            className="small"
            disabled={!/^https?:\/\//.test(url.trim())}
            onClick={() => {
              const n = all.filter((x) => x.a.kind === "url").length + 1;
              setDoc(attach(doc, seg.id, `URL-${n}`, "url", { url: url.trim() }));
              setUrl("");
            }}
            data-testid="d-ref-url-add"
          >
            Add link
          </button>
        </div>
        {all.length ? <div className="d-atts">{all.map(row)}</div> : null}
        <input
          ref={fallback}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: "none" }}
          data-testid="d-upload-fallback"
          onChange={(e) => upload(Array.from(e.target.files ?? []), fallbackFor ? `instead of the link ${fallbackFor}` : undefined)}
        />
      </div>

      <button className="ghost small" onClick={() => setShowHints(!showHints)} data-testid="d-hints-toggle">
        {showHints ? "▾" : "▸"} Optional hints (composition, animation, type, background, sound)
      </button>
      {showHints ? (
        <div className="d-hints">
          {HINTS.map((k) => (
            <label key={k} className="field">
              <span>{k}</span>
              <input value={d.hints?.[k] ?? ""} onChange={(e) => setDoc(editDraft(doc, seg.id, { hints: { ...(d.hints ?? {}), [k]: e.target.value } }))} data-testid={`d-hint-${k}`} />
            </label>
          ))}
        </div>
      ) : null}

      <div className="d-summary" data-testid="d-summary">
        <b>This scene will use</b>
        <ul>
          <li>
            Option <b>D</b>: {d.text.trim() ? <i>“{d.text.trim().split("\n")[0].slice(0, 90)}{d.text.length > 90 ? "…" : ""}”</i> : <span className="warn">no idea written yet</span>}
            {d.basedOn ? `, based on ${d.basedOn}` : ""}
            {d.combine?.length ? `, combining ${d.combine.join(" + ")}` : ""}
          </li>
          <li data-testid="d-summary-refs">
            References:{" "}
            {resolved.active.length ? resolved.active.map((a) => `${a.id} (${INFLUENCE_LABEL[a.influence]}, ${ROLE_LABEL[a.role]}${a.from !== "idea" ? `, from ${a.from}` : ""})`).join(" · ") : "none (that's fine: D works without references)"}
          </li>
          {resolved.excluded.length ? <li data-testid="d-summary-excluded">Not used: {resolved.excluded.map((x) => x.id).join(", ")}</li> : null}
          <li className="muted">Your text wins over any reference; the locked footage and timing never change.</li>
        </ul>
      </div>

      <button className="primary small" disabled={!d.text.trim() || !!busy} onClick={onSave} data-testid="choose-D">
        Save my idea (D) for Claude Code
      </button>
    </div>
  );
};
