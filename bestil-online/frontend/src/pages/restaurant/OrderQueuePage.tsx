import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { restaurantsApi } from "@/api/restaurants.api";
import { ordersApi } from "@/api/orders.api";
import { useAuthStore } from "@/stores/authStore";
import { Clock } from "lucide-react";

const NEXT_STATUS: Record<string, string | null> = {
  PENDING_CONFIRMATION: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: null,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Afventer betaling",
  PENDING_CONFIRMATION: "Ny ordre",
  CONFIRMED: "Bekræftet",
  PREPARING: "Forberedes",
  READY_FOR_PICKUP: "Klar",
  OUT_FOR_DELIVERY: "Undervejs",
  DELIVERED: "Leveret",
  CANCELLED: "Annulleret",
};

export default function OrderQueuePage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants", "owned"],
    queryFn: () => restaurantsApi.getOwned(),
    enabled: !!user,
  });

  const restaurantId = restaurants?.data?.data?.[0]?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-orders", restaurantId],
    queryFn: () => ordersApi.getRestaurantOrders(restaurantId!),
    enabled: !!restaurantId,
    refetchInterval: 15000,
  });

  const { mutate: advance } = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      ordersApi.updateStatus(orderId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["restaurant-orders"] }),
  });

  const orders = data?.data?.data ?? [];
  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status));

  if (!restaurantId) {
    return <div className="py-20 text-center text-gray-400">Ingen restaurant fundet</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ordrekø</h1>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> Opdateres hvert 15s
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="py-20 text-center text-gray-400">Ingen aktive ordrer</div>
      ) : (
        <div className="flex flex-col gap-4">
          {activeOrders.map((order) => {
            const next = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className="rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    order.status === "PENDING_CONFIRMATION"
                      ? "bg-yellow-50 text-yellow-600"
                      : "bg-blue-50 text-blue-600"
                  }`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                <ul className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.menuItemName}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {Number(order.totalAmount).toFixed(0)} kr
                  </span>
                  {next && (
                    <button
                      onClick={() => advance({ orderId: order.id, status: next })}
                      className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                    >
                      → {STATUS_LABEL[next] ?? next}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
