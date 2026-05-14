import { ShoppingBag, ShoppingCart, LogOut, User, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const totalItems = useCartStore((s) => s.totalItems());
  const clearCart = useCartStore((s) => s.clear);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearCart();
    logout();
    queryClient.clear();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-brand-500" />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Bestil <span className="text-brand-500">Online</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link to="/" className="text-gray-600 hover:text-brand-500 transition-colors">
            Restauranter
          </Link>
          {user ? (
            <>
              {totalItems > 0 && (
                <>
                  <button
                    onClick={() => { if (confirm("Ryd kurven?")) clearCart(); }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Ryd kurv"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link to="/checkout" className="relative">
                    <ShoppingCart className="h-5 w-5 text-gray-600 hover:text-brand-500" />
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">
                      {totalItems}
                    </span>
                  </Link>
                </>
              )}
              <Link to="/orders" className="text-gray-600 hover:text-brand-500">
                Mine ordrer
              </Link>
              {user.role === "RESTAURANT_OWNER" && (
                <Link to="/restaurant/dashboard" className="text-gray-600 hover:text-brand-500">
                  Restaurant
                </Link>
              )}
              <Link to="/account" className="flex items-center gap-2 text-gray-600 hover:text-brand-500">
                <User className="h-4 w-4" />
                <span>{user.firstName}</span>
              </Link>
              {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                <Link to="/admin/dashboard" className="text-gray-600 hover:text-brand-500">
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                aria-label="Log ud"
                className="flex items-center gap-1 text-gray-400 hover:text-red-500"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-brand-500 transition-colors">
                Log ind
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600 transition-colors"
              >
                Opret konto
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
