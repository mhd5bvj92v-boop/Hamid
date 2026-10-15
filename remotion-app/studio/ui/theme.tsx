// Light / dark theme for the Studio: the user's choice is remembered in this browser,
// otherwise it follows the operating system (prefers-color-scheme).
import React, { useCallback, useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

export type Theme = "dark" | "light";
const KEY = "cds-studio-theme";

const stored = (): Theme | null => {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
};
const system = (): Theme => {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
};
const apply = (t: Theme) => {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
};

// set before the first render, so the page never flashes the wrong theme
if (typeof document !== "undefined") apply(stored() ?? system());

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => stored() ?? system());
  useEffect(() => apply(theme), [theme]);
  // follow the OS while the user has not picked a theme themselves
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia("(prefers-color-scheme: light)");
    } catch {
      return;
    }
    const on = () => {
      if (!stored()) setTheme(mq.matches ? "light" : "dark");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        /* storage blocked: the choice lasts for this page only */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
};

export const ThemeToggle: React.FC<{ theme: Theme; toggle: () => void }> = ({ theme, toggle }) => (
  <button
    className="icon-btn theme-toggle"
    onClick={toggle}
    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    data-testid="theme-toggle"
  >
    {theme === "dark" ? <SunIcon /> : <MoonIcon />}
  </button>
);
