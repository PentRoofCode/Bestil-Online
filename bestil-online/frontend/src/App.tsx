import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";

import CustomerLayout from "@/components/layout/CustomerLayout";
import OwnerLayout from "@/components/layout/OwnerLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireRole from "@/routes/RequireRole";

import HomePage from "@/pages/customer/HomePage";
import RestaurantPage from "@/pages/customer/RestaurantPage";
import CheckoutPage from "@/pages/customer/CheckoutPage";
import OrderDetailPage from "@/pages/customer/OrderDetailPage";
import OrdersListPage from "@/pages/customer/OrdersListPage";
import AccountPage from "@/pages/customer/AccountPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import OwnerDashboardPage from "@/pages/restaurant/OwnerDashboardPage";
import MenuManagerPage from "@/pages/restaurant/MenuManagerPage";
import OrderQueuePage from "@/pages/restaurant/OrderQueuePage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import RestaurantsAdminPage from "@/pages/admin/RestaurantsAdminPage";
import OrdersAdminPage from "@/pages/admin/OrdersAdminPage";
import UsersAdminPage from "@/pages/admin/UsersAdminPage";
import ReportsPage from "@/pages/admin/ReportsPage";

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Customer routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants/:slug" element={<RestaurantPage />} />
          <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><OrdersListPage /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
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
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="menu" element={<MenuManagerPage />} />
          <Route path="orders" element={<OrderQueuePage />} />
          <Route path="settings" element={<div className="text-gray-400">Indstillinger (kommer snart)</div>} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <RequireRole roles={["ADMIN", "SUPER_ADMIN"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="restaurants" element={<RestaurantsAdminPage />} />
          <Route path="orders" element={<OrdersAdminPage />} />
          <Route path="users" element={<UsersAdminPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
