import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Clock, XCircle, Package, Truck } from "lucide-react";
import { ordersApi } from "@/api/orders.api";

const STATUS_INFO: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING_PAYMENT: { label: "Afventer betaling", color: "text-yellow-500", icon: Clock },
  PAYMENT_FAILED: { label: "Betaling fejlet", color: "text-red-500", icon: XCircle },
  PENDING_CONFIRMATION: { label: "Afventer bekræftelse", color: "text-blue-500", icon: Clock },
  CONFIRMED: { label: "Bekræftet", color: "text-blue-600", icon: CheckCircle },
  PREPARING: { label: "Forberedes", color: "text-orange-500", icon: Package },
  READY_FOR_PICKUP: { label: "Klar til afhentning", color: "text-green-500", icon: CheckCircle },
  OUT_FOR_DELIVERY: { label: "Undervejs", color: "text-brand-500", icon: Truck },
  DELIVERED: { label: "Leveret", color: "text-green-600", icon: CheckCircle },
  CANCELLED: { label: "Annulleret", color: "text-gray-400", icon: XCircle },
  REFUNDED: { label: "Refunderet", color: "text-gray-400", icon: XCircle },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.getById(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.data?.status;
      const done = ["DELIVERED", "CANCELLED", "REFUNDED", "PAYMENT_FAILED"];
      return status && done.includes(status) ? false : 10000;
    },
    enabled: !!id,
  });

  const order = data?.data?.data;

  if (isLoading) return <div className="py-32 text-center text-gray-400">Indlæser ordre...</div>;
  if (isError || !order) return <div className="py-32 text-center text-gray-400">Ordre ikke fundet</div>;

  const status = STATUS_INFO[order.status] ?? { label: order.status, color: "text-gray-400", icon: Clock };
  const Icon = status.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-xs text-gray-400">{order.orderNumber}</p>
        <div className={`mt-1 flex items-center gap-2 text-lg font-semibold ${status.color}`}>
          <Icon className="h-5 w-5" />
          {status.label}
        </div>
        <p className="mt-0.5 text-sm text-gray-400">
          {order.restaurant.name} · {new Date(order.createdAt).toLocaleString("da-DK")}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Bestilling</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-gray-600">
              <span>
                {item.quantity}× {item.menuItemName}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({item.selectedOptions.map((o) => o.optionName).join(", ")})
                  </span>
                )}
              </span>
              <span>{Number(item.itemTotal).toFixed(0)} kr</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span><span>{Number(order.subtotal).toFixed(0)} kr</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Levering</span><span>{Number(order.deliveryFee).toFixed(0)} kr</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Moms</span><span>{Number(order.tax).toFixed(0)} kr</span>
          </div>
          <div className="flex justify-between pt-1 font-semibold text-gray-900">
            <span>Total</span><span>{Number(order.totalAmount).toFixed(0)} kr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
