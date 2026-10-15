// The "?" popover: every keyboard shortcut of the Studio in one place.
import React, { useEffect, useRef } from "react";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? "⌘" : "Ctrl";

const GROUPS: { title: string; keys: [string[], string][] }[] = [
  {
    title: "Playback",
    keys: [
      [["Space"], "Play / pause"],
      [["←", "→"], "Previous / next frame"],
      [["Shift", "← →"], "Back / forward 1 second"],
      [["Home"], "Go to the start"],
      [["End"], "Go to the end"],
    ],
  },
  {
    title: "Editing",
    keys: [
      [[MOD, "Z"], "Undo"],
      [[MOD, "Shift", "Z"], "Redo"],
      [[MOD, "Y"], "Redo"],
    ],
  },
  {
    title: "Timeline",
    keys: [
      [[MOD, "Scroll"], "Zoom in / out at the mouse"],
      [["Drag ruler"], "Scrub the playhead"],
      [["Alt", "Drag"], "Move without snapping"],
      [["?"], "Show / hide this list"],
    ],
  },
];

export const ShortcutsPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(t) && !t.closest?.("[data-shortcuts-toggle]")) onClose();
    };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, [onClose]);
  return (
    <div className="popover shortcuts" ref={ref} role="dialog" aria-label="Keyboard shortcuts" data-testid="shortcuts">
      <div className="popover-head">
        <b>Keyboard shortcuts</b>
        <button className="icon-btn small" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title} className="sc-group">
          <div className="sc-title">{g.title}</div>
          {g.keys.map(([keys, what]) => (
            <div key={what + keys.join()} className="sc-row">
              <span>{what}</span>
              <span className="sc-keys">
                {keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
      <p className="muted small sc-foot">Shortcuts pause while you type in a text field.</p>
    </div>
  );
};
