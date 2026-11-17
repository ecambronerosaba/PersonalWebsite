import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import LandingPage from "../pages/LandingPage";
import ComingSoonPage from "../pages/ComingSoonPage";
import AboutPage from "../pages/AboutPage";
import PortfolioPage from "../pages/PortfolioPage";
import NavBar from "./NavBar";
import WorkPage from "../pages/WorkPage";
import ContactPage from "../pages/ContactPage";
import ExperiencePage from "../pages/ExperiencePage";

function ShowNavBar() {
  const { pathname } = useLocation();
  return pathname === "/" ? null : <NavBar />;
}

function NavRouter() {
  return (
    <div>
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <ShowNavBar />
        <Routes>
          <Route path="/" element={<LandingPage />}></Route>
          <Route
            path="/garden"
            element={
              <ComingSoonPage
                title="Garden"
                blurb="Notes, essays and half-finished ideas, growing over time."
              />
            }
          ></Route>
          <Route
            path="/projects"
            element={
              <ComingSoonPage
                title="Projects"
                blurb="Things I've built: software, 3D prints and woodworking."
              />
            }
          ></Route>
          <Route
            path="/photos"
            element={
              <ComingSoonPage
                title="Photos"
                blurb="A gallery of places, coffee and builds."
              />
            }
          ></Route>
          <Route path="/about" element={<AboutPage />}></Route>
          <Route path="/portfolio" element={<PortfolioPage />}></Route>
          <Route path="/experience" element={<ExperiencePage />}></Route>
          <Route path="/work" element={<WorkPage />}></Route>
          <Route path="/contact" element={<ContactPage />}></Route>
          <Route path="/resume.pdf" element={<div>Here's my resume!</div>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default NavRouter;
