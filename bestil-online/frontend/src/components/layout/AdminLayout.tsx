import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Store, ShoppingBag, Users, BarChart3, ShoppingCart, LogOut, ExternalLink, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";

const NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/restaurants", icon: Store, label: "Restauranter" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Ordrer" },
  { to: "/admin/users", icon: Users, label: "Brugere" },
  { to: "/admin/reports", icon: BarChart3, label: "Rapporter" },
  { to: "/admin/reviews", icon: MessageSquare, label: "Anmeldelser" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const logoutStore = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    logoutStore();
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 px-5">
          <ShoppingCart className="h-5 w-5 text-brand-500" />
          <span className="font-bold text-gray-900">Admin</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
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
        <div className="shrink-0 border-t border-gray-100 p-3 flex flex-col gap-0.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Gå til sitet
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Log ud
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
