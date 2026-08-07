import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "bonded-theme";

export function initialTheme(): Theme {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  if (saved === "dark" || saved === "light") return saved;
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f5f8fd" : "#070b16");
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    (document.documentElement.dataset.theme as Theme) || initialTheme(),
  );
  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return [theme, toggle];
}

/** A single morphing sun/moon control. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, toggle] = useTheme();
  const dark = theme === "dark";
  return (
    <button
      className={`theme-toggle${compact ? " compact" : ""}`}
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      <motion.span className="tt-track" animate={{ justifyContent: dark ? "flex-start" : "flex-end" }}>
        <motion.span layout className="tt-thumb" transition={{ type: "spring", stiffness: 500, damping: 34 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {dark ? (
              <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
            ) : (
              <>
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" />
              </>
            )}
          </svg>
        </motion.span>
      </motion.span>
      {!compact && <span className="tt-label">{dark ? "Dark" : "Light"}</span>}
    </button>
  );
}
