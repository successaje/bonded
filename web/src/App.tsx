import { MotionConfig } from "framer-motion";
import { Shell } from "./app/Shell";
import { navigate, useHashRoute } from "./app/useHashRoute";
import { AgentDetail } from "./views/AgentDetail";
import { Analytics } from "./views/Analytics";
import { Disputes } from "./views/Disputes";
import { Docs } from "./views/Docs";
import { Jobs } from "./views/Jobs";
import { Landing } from "./views/Landing";
import { Marketplace } from "./views/Marketplace";
import { MyAgent } from "./views/MyAgent";
import { Overview } from "./views/Overview";
import { Pool } from "./views/Pool";
import { Proof } from "./views/Proof";
import { Reputation } from "./views/Reputation";
import { Settings } from "./views/Settings";

function routeView(section: string, sub?: string) {
  switch (section) {
    case "dashboard":
      return <Overview onNavigate={(t) => navigate(t === "agents" ? "#/marketplace" : `#/${t}`)} />;
    case "proof":
      return <Proof />;
    case "marketplace":
      return sub ? <AgentDetail id={sub} /> : <Marketplace />;
    case "jobs":
      return <Jobs filter={sub} />;
    case "my-agent":
      return <MyAgent />;
    case "pool":
      return <Pool />;
    case "reputation":
      return <Reputation />;
    case "disputes":
      return <Disputes />;
    case "analytics":
      return <Analytics />;
    case "settings":
      return <Settings />;
    case "docs":
      return <Docs />;
    default:
      return <Overview onNavigate={(t) => navigate(t === "agents" ? "#/marketplace" : `#/${t}`)} />;
  }
}

export default function App() {
  const route = useHashRoute();

  return (
    <MotionConfig reducedMotion="user">
      {route.section === "landing" ? (
        <Landing />
      ) : (
        <Shell route={route}>{routeView(route.section, route.sub)}</Shell>
      )}
    </MotionConfig>
  );
}
