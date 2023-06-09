import React from "react";
import { Link } from "react-router-dom";
import "./CSS/NavBar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/">
        <div className="logo" />
      </Link>
      <ol className="navbar-links" type="1">
        <NavbarLink to="/about">About</NavbarLink>
        <NavbarLink to="/experience">Experience</NavbarLink>
        <NavbarLink to="/contact">Contact</NavbarLink>
        <li>
          <Link to="/resume.pdf" className="resume-button draw-border">
            Resume
          </Link>
        </li>
      </ol>
    </nav>
  );
}

function NavbarLink({ to, num, children }) {
  return (
    <li className="navbar-link">
      <Link to={to} className="navbar-link">
        {children}
      </Link>
    </li>
  );
}
export default Navbar;
