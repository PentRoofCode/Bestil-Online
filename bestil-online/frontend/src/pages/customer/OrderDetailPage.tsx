import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, XCircle, Package, Truck, Star } from "lucide-react";
import { ordersApi } from "@/api/orders.api";
import { reviewsApi } from "@/api/reviews.api";

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

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      reviewsApi.create(orderId, {
        rating,
        foodRating: foodRating || undefined,
        deliveryRating: deliveryRating || undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      onDone();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? "Anmeldelse kunne ikke gemmes.");
    },
  });

  return (
    <div className="mt-6 rounded-2xl border border-gray-100 p-6">
      <h2 className="mb-4 font-semibold text-gray-900">Skriv en anmeldelse</h2>

      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Samlet vurdering *</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 text-xs text-gray-500">Mad</p>
            <StarPicker value={foodRating} onChange={setFoodRating} />
          </div>
          <div>
            <p className="mb-2 text-xs text-gray-500">Levering</p>
            <StarPicker value={deliveryRating} onChange={setDeliveryRating} />
          </div>
        </div>

        <textarea
          placeholder="Fortæl andre om din oplevelse..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={() => {
            if (rating === 0) { setError("Vælg venligst en samlet vurdering."); return; }
            setError(null);
            mutate();
          }}
          disabled={isPending}
          className="self-start rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {isPending ? "Gemmer..." : "Send anmeldelse"}
        </button>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [reviewDone, setReviewDone] = useState(false);

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

  const hasReview = !!(order as { review?: unknown }).review;
  const showReviewCta = order.status === "DELIVERED" && !hasReview && !reviewDone;

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

      {showReviewCta && (
        <ReviewForm orderId={id!} onDone={() => setReviewDone(true)} />
      )}

      {(reviewDone || (order.status === "DELIVERED" && hasReview)) && (
        <div className="mt-6 rounded-2xl border border-green-100 bg-green-50/50 p-5 text-center text-sm text-green-700">
          Tak for din anmeldelse!
        </div>
      )}
    </div>
  );
}
