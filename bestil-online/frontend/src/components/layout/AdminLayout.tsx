import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Store, ShoppingBag, Users, BarChart3, ShoppingCart } from "lucide-react";

const NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/restaurants", icon: Store, label: "Restauranter" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Ordrer" },
  { to: "/admin/users", icon: Users, label: "Brugere" },
  { to: "/admin/reports", icon: BarChart3, label: "Rapporter" },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <ShoppingCart className="h-5 w-5 text-brand-500" />
          <span className="font-bold text-gray-900">Admin</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
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
