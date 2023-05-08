import React from "react";
import { FaEnvelope, FaLinkedin, FaGithub } from "react-icons/fa";
import "./CSS/Contact.css";

function Contact() {
  return (
    <div className="contact-container">
      <h1>Contact Me!</h1>
      <div className="contact-icons">
        <a href="mailto:esteban.cambronerosaba@gmail.com">
          <FaEnvelope className="icon" />
        </a>
        <a href="https://www.linkedin.com/in/estebancambronero/">
          <FaLinkedin className="icon" />
        </a>
        <a href="https://github.com/ecambronerosaba">
          <FaGithub className="icon" />
        </a>
      </div>
    </div>
  );
}

export default Contact;
