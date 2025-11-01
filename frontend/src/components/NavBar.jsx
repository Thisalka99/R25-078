import React from "react";
import { NavLink } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbrand">Wellness Assistant</div>
      <div className="navlinks">
        <NavLink to="/chat" className="navitem">Chat</NavLink>
        <NavLink to="/tasks" className="navitem">Tasks</NavLink>
        <NavLink to="/predict" className="navitem">Structured</NavLink>
        <NavLink to="/text" className="navitem">Text NLP</NavLink>
        <NavLink to="/profile" className="navitem">Profile</NavLink>
      </div>
    </nav>
  );
}
