import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { NAV_BY_ID } from "./routes";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./theme";
import { navigate, type Route } from "./useHashRoute";

/** App layout: fixed sidebar on desktop, slide-over drawer on mobile. */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const section = NAV_BY_ID[route.section];
  const title = section?.label ?? "Dashboard";
  const subLabel = route.sub && section?.children?.find((c) => c.path.endsWith(`/${route.sub}`))?.label;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Sidebar route={route} onNavigate={() => setDrawer(false)} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="drawer-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              className="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <Sidebar route={route} onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="main">
        <header className="appbar">
          <button className="icon-btn only-mobile" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Icon.menu />
          </button>
          <div className="crumb">
            <span className="crumb-top">{title}</span>
            {subLabel && (
              <>
                <Icon.chevron className="crumb-sep" />
                <span className="crumb-sub">{subLabel}</span>
              </>
            )}
          </div>
          <div className="appbar-right">
            <ThemeToggle compact />
            <span className="net-pill">
              <span className="net-dot" /> Arc Testnet
            </span>
            <a className="btn sm" href="#/marketplace" onClick={(e) => { e.preventDefault(); navigate("#/marketplace"); }}>
              Hire an agent
            </a>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={route.section + (route.sub ?? "")}
            className="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
