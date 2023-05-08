import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomePage";
import AboutPage from "../pages/AboutPage";
import PortfolioPage from "../pages/PortfolioPage";
import NavBar from "./NavBar";
import WorkPage from "../pages/WorkPage";
import ContactPage from "../pages/ContactPage";
import ExperiencePage from "../pages/ExperiencePage";

function NavRouter() {
  return (
    <div>
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />}></Route>
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
