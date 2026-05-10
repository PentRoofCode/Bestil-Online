import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { adminApi } from "@/api/admin.api";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Afventer betaling",
  PAYMENT_FAILED: "Betaling fejlet",
  PENDING_CONFIRMATION: "Afventer bekræftelse",
  CONFIRMED: "Bekræftet",
  PREPARING: "Forberedes",
  READY_FOR_PICKUP: "Klar til afhentning",
  OUT_FOR_DELIVERY: "Leveres",
  DELIVERED: "Leveret",
  CANCELLED: "Annulleret",
  REFUNDED: "Refunderet",
};

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: "bg-green-50 text-green-600",
  CANCELLED: "bg-red-50 text-red-500",
  REFUNDED: "bg-red-50 text-red-500",
  PAYMENT_FAILED: "bg-red-50 text-red-500",
  PENDING_PAYMENT: "bg-amber-50 text-amber-600",
  PENDING_CONFIRMATION: "bg-amber-50 text-amber-600",
  CONFIRMED: "bg-blue-50 text-blue-600",
  PREPARING: "bg-blue-50 text-blue-600",
  READY_FOR_PICKUP: "bg-purple-50 text-purple-600",
  OUT_FOR_DELIVERY: "bg-purple-50 text-purple-600",
};

export default function OrdersAdminPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", statusFilter, page],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      return adminApi.listOrders(params);
    },
  });

  const orders = data?.data?.data ?? [];
  const pagination = data?.data?.meta?.pagination;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Ordrer</h1>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => { setStatusFilter(""); setPage(1); }}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!statusFilter ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600"}`}
        >
          Alle
        </button>
        {Object.keys(STATUS_LABELS).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${statusFilter === s ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600"}`}
          >
            {STATUS_LABELS[s]}
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
                <th className="px-5 py-3 text-left">Ordre</th>
                <th className="px-5 py-3 text-left">Restaurant</th>
                <th className="px-5 py-3 text-left">Kunde</th>
                <th className="px-5 py-3 text-left">Total</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Dato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link to={`/orders/${o.id}`} className="font-mono text-xs text-brand-600 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{o.restaurant.name}</td>
                  <td className="px-5 py-3 text-gray-500">{o.user.email}</td>
                  <td className="px-5 py-3 font-medium">{Number(o.totalAmount).toFixed(0)} kr</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {new Date(o.createdAt).toLocaleDateString("da-DK")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-400">Side {pagination.page} af {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs disabled:opacity-40"
                >
                  Forrige
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs disabled:opacity-40"
                >
                  Næste
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
