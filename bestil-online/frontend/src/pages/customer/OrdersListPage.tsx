import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/api/orders.api";

export default function OrdersListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "me"],
    queryFn: () => ordersApi.list(),
  });

  const orders = data?.data?.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mine ordrer</h1>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p>Ingen ordrer endnu</p>
          <Link to="/" className="mt-3 inline-block text-sm text-brand-500 hover:underline">
            Bestil nu
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="block rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{order.restaurant.name}</p>
                    <p className="text-xs text-gray-400">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {Number(order.totalAmount).toFixed(0)} kr
                    </p>
                    <p className="text-xs text-gray-400">{order.status.replace(/_/g, " ")}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
