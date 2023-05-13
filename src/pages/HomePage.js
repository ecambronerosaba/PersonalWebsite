import React, { useState } from "react";
import "./CSS/Home.css";
import { TypeAnimation } from "react-type-animation";

const CURSOR_CLASS_NAME = "cursor-type-animation-cursor";

function HomePage() {
  const [showSecondAnimation, setShowSecondAnimation] = useState(false);

  return (
    <div className="home-header">
      <h1>Hi, my name is</h1>
      <div>
        <TypeAnimation
          sequence={[
            // Same String at the start will only be typed once, initially
            "Esteban Cambronero Saba",
            1000,
            () => setShowSecondAnimation(true),
          ]}
          speed={50}
          style={{ fontSize: "5em" }}
          repeat={Infinity}
          className="name"
          cursor={false}
        />
      </div>
      {showSecondAnimation && (
        <TypeAnimation
          sequence={[
            "I'm a creator",
            1000,
            "I'm a developer",
            1000,
            "I'm a maker",
            1000,
            "I'm an innovator",
            1000,
            (el) => el.classList.remove(CURSOR_CLASS_NAME),
            2000,
            (el) => el.classList.add(CURSOR_CLASS_NAME),
          ]}
          speed={50}
          className="subheading"
        />
      )}
      <p>
        I graduated from Stanford University with a degree in Computer Science.
        I'm a software engineer with an interest in security and privacy.
        Currently, I'm working on the privacy team at Netflix
      </p>
    </div>
  );
}

export default HomePage;
