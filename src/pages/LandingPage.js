import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { initBrickScene } from "../brick/scene";
import "./CSS/Landing.css";

const NAV = [
  { to: "/garden", label: "Garden", className: "red" },
  { to: "/projects", label: "Projects", className: "blue" },
  { to: "/photos", label: "Photos", className: "green" },
  { to: "/about", label: "About", className: "yellow" },
];

function LandingPage() {
  const rootRef = useRef(null);
  const hostRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cleanup;
    try {
      cleanup = initBrickScene(rootRef.current, hostRef.current);
    } catch (e) {
      setFailed(true);
    }
    return () => cleanup && cleanup();
  }, []);

  return (
    <div className="brick-landing" ref={rootRef}>
      <div className="canvas-host" ref={hostRef} />
      <div className="ui">
        <header>
          <div className="brand">esteban cambronero</div>
          <div className="tabs" id="tabs"></div>
        </header>
        <Link className="skip" to="/about">
          Skip to site &rarr;
        </Link>
        {!failed && (
          <div className="hint">
            click things to play &middot; right-click to break it apart
            &middot; drag to look around
          </div>
        )}
        <footer>
          <div className="tag">
            <h1>Hey, I'm Esteban.</h1>
            <p id="caption">
              {failed ? "Software engineer, maker and coffee nerd." : ""}
            </p>
            <div id="act" className="act"></div>
          </div>
          <div>
            <nav>
              {NAV.map((n) => (
                <Link key={n.to} to={n.to} className={n.className}>
                  {n.label}
                </Link>
              ))}
            </nav>
            {!failed && (
              <div className="actions">
                <button id="rebuild">Rebuild</button>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
