import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";

import CustomerLayout from "@/components/layout/CustomerLayout";
import OwnerLayout from "@/components/layout/OwnerLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireRole from "@/routes/RequireRole";

import HomePage from "@/pages/customer/HomePage";
import RestaurantPage from "@/pages/customer/RestaurantPage";
import CheckoutPage from "@/pages/customer/CheckoutPage";
import OrderDetailPage from "@/pages/customer/OrderDetailPage";
import OrdersListPage from "@/pages/customer/OrdersListPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import OwnerDashboardPage from "@/pages/restaurant/OwnerDashboardPage";
import MenuManagerPage from "@/pages/restaurant/MenuManagerPage";
import OrderQueuePage from "@/pages/restaurant/OrderQueuePage";

export default function App() {
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        const token = useAuthStore.getState().accessToken;
        if (token) setAuth(res.data.data, token);
      })
      .catch(() => {
        // attempt refresh
        authApi
          .refresh()
          .then((r) => {
            const accessToken = r.data.data.accessToken;
            useAuthStore.getState().setAccessToken(accessToken);
            return authApi.me();
          })
          .then((r) => {
            const token = useAuthStore.getState().accessToken;
            if (token) setAuth(r.data.data, token);
          })
          .catch(() => {});
      });
  }, [setAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants/:slug" element={<RestaurantPage />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders"
            element={
              <RequireAuth>
                <OrdersListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RequireAuth>
                <OrderDetailPage />
              </RequireAuth>
            }
          />
        </Route>

        {/* Restaurant owner routes */}
        <Route
          path="/restaurant"
          element={
            <RequireRole roles={["RESTAURANT_OWNER", "ADMIN", "SUPER_ADMIN"]}>
              <OwnerLayout />
            </RequireRole>
          }
        >
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="menu" element={<MenuManagerPage />} />
          <Route path="orders" element={<OrderQueuePage />} />
          <Route path="settings" element={<div className="text-gray-400">Indstillinger (kommer snart)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
