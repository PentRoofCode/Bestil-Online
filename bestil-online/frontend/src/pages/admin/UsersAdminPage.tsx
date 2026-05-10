import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { adminApi } from "@/api/admin.api";

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: "Kunde",
  RESTAURANT_OWNER: "Restaurantejer",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export default function UsersAdminPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", roleFilter, page],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (roleFilter) params.role = roleFilter;
      return adminApi.listUsers(params);
    },
  });

  const users = data?.data?.data ?? [];
  const pagination = data?.data?.meta?.pagination;

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.setUserStatus(id, isActive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Brugere</h1>

      <div className="mb-5 flex gap-2">
        {["", "CUSTOMER", "RESTAURANT_OWNER", "ADMIN"].map((r) => (
          <button
            key={r}
            onClick={() => { setRoleFilter(r); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${roleFilter === r ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600"}`}
          >
            {r === "" ? "Alle" : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Navn</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Rolle</th>
                <th className="px-5 py-3 text-left">Email bekræftet</th>
                <th className="px-5 py-3 text-left">Status</th>
                {isSuperAdmin && <th className="px-5 py-3 text-right">Handling</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={u.emailVerified ? "text-green-500" : "text-amber-500"}>
                      {u.emailVerified ? "Ja" : "Nej"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                      {u.isActive ? "Aktiv" : "Inaktiv"}
                    </span>
                  </td>
                  {isSuperAdmin && (
                    <td className="px-5 py-3 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => toggleStatus({ id: u.id, isActive: !u.isActive })}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                            u.isActive
                              ? "border border-red-200 text-red-500 hover:bg-red-50"
                              : "border border-green-200 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {u.isActive ? "Deaktiver" : "Aktiver"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-400">Side {pagination.page} af {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1 text-xs disabled:opacity-40">Forrige</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="rounded-lg border border-gray-200 px-3 py-1 text-xs disabled:opacity-40">Næste</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
