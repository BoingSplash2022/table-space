"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/clips", label: "Clips" },
  { href: "/feed", label: "Feed" },
  { href: "/messages", label: "Messages" },
  { href: "/battles", label: "Battles" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((prev) => !prev);
  }

  function close() {
    setOpen(false);
  }

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        {/* Mobile toggle button */}
        <button
          type="button"
          className="site-nav-toggle"
          onClick={toggle}
        >
          ☰ Menu
        </button>

        {/* Links */}
        <div
          className={
            "site-nav-links" + (open ? " site-nav-links-open" : "")
          }
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="site-nav-button"
              onClick={close}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
