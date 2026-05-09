import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/stores/authStore";
import type { ReactNode } from "react";

interface Props {
  roles: AuthUser["role"][];
  children: ReactNode;
}

export default function RequireRole({ roles, children }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
