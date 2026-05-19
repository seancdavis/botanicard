import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { House, Plant, PottedPlant, Leaf, SignOut } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: House },
  { to: "/houseplants", label: "Houseplants", icon: Plant },
  { to: "/planters", label: "Planters", icon: PottedPlant },
  { to: "/garden", label: "Garden", icon: Leaf },
];

export function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text/60">
        Loading…
      </div>
    );
  }

  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between">
        <NavLink to="/" className="text-xl font-heading font-bold tracking-wide">
          Botanicard
        </NavLink>
        <nav className="flex gap-1 items-center">
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
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SignOut size={20} weight="light" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </nav>
      </header>
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
