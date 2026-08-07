import { AnimatePresence, motion } from "framer-motion";
import { BondedMark } from "../components/ui";
import { Icon } from "./icons";
import { NAV, type NavItem } from "./routes";
import { navigate, type Route } from "./useHashRoute";

function itemActive(item: NavItem, route: Route): boolean {
  return item.id === route.section || (item.id === "dashboard" && route.section === "landing");
}

function NavRow({ item, route, onNavigate }: { item: NavItem; route: Route; onNavigate: () => void }) {
  const active = itemActive(item, route);
  const IconCmp = Icon[item.icon];
  const go = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
    onNavigate();
  };

  return (
    <div className="nav-group">
      <a href={item.path} className={`nav-item${active ? " active" : ""}`} onClick={go(item.path)}>
        {active && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
        <span className="nav-ico"><IconCmp /></span>
        <span className="nav-label">{item.label}</span>
        {item.preview && <span className="nav-tag">soon</span>}
      </a>

      <AnimatePresence initial={false}>
        {active && item.children && (
          <motion.div
            className="nav-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {item.children.map((c) => {
              const childActive = route.path === c.path.replace(/^#/, "") || (!route.sub && c === item.children![0]);
              return (
                <a key={c.path} href={c.path} className={`nav-child${childActive ? " active" : ""}`} onClick={go(c.path)}>
                  {c.label}
                </a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ route, onNavigate }: { route: Route; onNavigate: () => void }) {
  return (
    <div className="sidebar-inner">
      <a href="#/dashboard" className="sb-brand" onClick={(e) => { e.preventDefault(); navigate("#/dashboard"); onNavigate(); }}>
        <BondedMark size={30} />
        <span>Bonded</span>
      </a>

      <nav className="nav" aria-label="Primary">
        {NAV.map((item) => (
          <NavRow key={item.id} item={item} route={route} onNavigate={onNavigate} />
        ))}
      </nav>

      <a className="sb-foot" href="https://testnet.arcscan.app/address/0x7dc16d44789283279b28C940359011F2649897dA?tab=contract" target="_blank" rel="noreferrer">
        <span className="sb-dot" />
        <span>Live on Arc testnet</span>
        <Icon.external />
      </a>
    </div>
  );
}
