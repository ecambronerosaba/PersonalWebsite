import React from "react";
import { Link } from "react-router-dom";
import "./CSS/ComingSoon.css";

function ComingSoonPage({ title, blurb }) {
  return (
    <div className="coming-soon">
      <h1>{title}</h1>
      <p>{blurb}</p>
      <p className="coming-soon-tag">Coming soon.</p>
      <Link to="/" className="coming-soon-back">
        &larr; Back to the bricks
      </Link>
    </div>
  );
}

export default ComingSoonPage;
