import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/restaurant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/restaurant/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/restaurant/orders", label: "Ordrer", icon: ClipboardList },
  { to: "/restaurant/settings", label: "Indstillinger", icon: Settings },
];

export default function OwnerLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-gray-50 px-3 py-6">
        <p className="mb-6 px-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Restaurant
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-600 hover:bg-gray-100",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
