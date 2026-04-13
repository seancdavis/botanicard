import { Outlet, NavLink } from "react-router-dom";
import { House, Plant, PottedPlant, Leaf } from "@phosphor-icons/react";

const navItems = [
  { to: "/", label: "Dashboard", icon: House },
  { to: "/houseplants", label: "Houseplants", icon: Plant },
  { to: "/planters", label: "Planters", icon: PottedPlant },
  { to: "/garden", label: "Garden", icon: Leaf },
];

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <NavLink to="/" className="text-xl font-heading font-bold tracking-wide">
          Botanicard
        </NavLink>
        <nav className="flex gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`
              }
            >
              <item.icon size={20} weight="light" />
              <span className="hidden md:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
