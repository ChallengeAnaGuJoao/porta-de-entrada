import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import atende_mais from "../assets/atende+.png";

export function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Teste" },
  ];

  return (
    <nav className="bg-roxo-escuro shadow w-full h-[80px] flex items-center px-5 md:px-8">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 text-amarelo-claro hover:opacity-80">
        <img src={atende_mais} alt="Logo do projeto" className="max-w-[140px] h-auto" />
      </Link>

      {/* Menu desktop */}
      <div className="hidden md:flex gap-6 ml-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium text-base text-amarelo-claro hover:opacity-80 ${
                isActive ? "border-b border-rosa-claro text-rosa-claro" : ""
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Botão mobile */}
      <button
        className="md:hidden text-amarelo-claro ml-auto"
        onClick={() => setOpen(!open)}
        aria-label="Abrir menu"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={
              open
                ? "M6 18L18 6M6 6l12 12"
                : "M4 6h16M4 12h16M4 18h16"
            }
          />
        </svg>
      </button>

      {/* Menu mobile */}
      {open && (
        <div className="absolute top-[80px] left-0 w-full bg-roxo-escuro flex flex-col items-center gap-4 py-4 md:hidden">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`font-medium text-lg text-amarelo-claro hover:opacity-80 ${
                  isActive ? "border-b border-rosa-claro text-rosa-claro" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}