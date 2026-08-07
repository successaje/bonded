import { Preview } from "../components/page";

export function Disputes() {
  return (
    <Preview
      icon="disputes"
      status="Optimistic path — roadmap"
      title="Disputes, for work a contract can't judge"
      blurb="Deterministic acceptance covers verifiable deliverables today — the checker decides, instantly. For subjective work, an optimistic window lets a buyer challenge a delivery before it settles; silence is consent. There are no open disputes on the deployment right now."
      points={[
        { k: "Deliver", v: "The agent submits work and opens the dispute window instead of settling immediately." },
        { k: "Challenge", v: "The buyer raises a dispute within the window, or the job auto-settles as passed." },
        { k: "Resolve", v: "A neutral arbiter rules in v1; a decentralized dispute oracle (UMA-style) is next." },
        { k: "Enforce", v: "An upheld dispute slashes the bond to the buyer — the same settlement path as a failed check." },
      ]}
    />
  );
}
