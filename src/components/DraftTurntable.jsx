import { DsoLogo } from "./DsoLogo.jsx";
import deckSrc from "../assets/dco-turntable-draft.webp";
import armSrc from "../assets/dco-turntable-draft-arm.webp";
import "./DraftTurntable.css";

/**
 * Draft 1 turntable with the existing <DsoLogo /> spinning on the platter.
 * Layers: deck image → spinning logo → tonearm cut-out (so the arm stays on top).
 */
export function DraftTurntable({ className }) {
  return (
    <div
      className={`dco-draft ${className ?? ""}`.trim()}
      role="img"
      aria-label="DCO turntable"
    >
      <img className="dco-draft__deck" src={deckSrc} alt="" draggable={false} />
      <div className="dco-draft__record">
        <DsoLogo className="dco-draft__logo" />
      </div>
      <img className="dco-draft__arm" src={armSrc} alt="" draggable={false} />
    </div>
  );
}
