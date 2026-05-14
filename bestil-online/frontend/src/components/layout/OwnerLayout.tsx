import { NavLink, Outlet, useParams, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, ClipboardList, Settings, ChevronLeft, ShoppingCart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { restaurantsApi } from "@/api/restaurants.api";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { authApi } from "@/api/auth.api";

export default function OwnerLayout() {
  const { restaurantId } = useParams<{ restaurantId?: string }>();
  const navigate = useNavigate();
  const logoutStore = useAuthStore((s) => s.logout);
  const clearCart = useCartStore((s) => s.clear);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["restaurants", "owned"],
    queryFn: () => restaurantsApi.getOwned(),
  });
  const restaurants = data?.data?.data ?? [];
  const current = restaurants.find((r) => r.id === restaurantId);

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearCart();
    logoutStore();
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-white flex flex-col">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 px-5">
          <ShoppingCart className="h-5 w-5 text-brand-500" />
          <span className="font-bold text-gray-900 truncate">
            {current ? current.name : "Restaurant"}
          </span>
        </div>

        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          {restaurantId ? (
            <>
              <Link
                to="/restaurant/dashboard"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors mb-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Alle restauranter
              </Link>
              <div className="h-px bg-gray-100 mb-1" />
              {[
                { to: `/restaurant/${restaurantId}/menu`, icon: UtensilsCrossed, label: "Menu" },
                { to: `/restaurant/${restaurantId}/orders`, icon: ClipboardList, label: "Ordrer" },
                { to: `/restaurant/${restaurantId}/settings`, icon: Settings, label: "Indstillinger" },
              ].map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </>
          ) : (
            <NavLink
              to="/restaurant/dashboard"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="shrink-0 border-t border-gray-100 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
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
