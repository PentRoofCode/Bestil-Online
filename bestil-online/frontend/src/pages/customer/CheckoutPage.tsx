import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { addressesApi } from "@/api/addresses.api";
import { ordersApi } from "@/api/orders.api";
import { useCartStore } from "@/stores/cartStore";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

// ── Step 1: Address + order summary ──────────────────────────────────────────

interface Session { clientSecret: string; orderId: string; total: number }

function Step1({ onProceed }: { onProceed: (s: Session) => void }) {
  const navigate = useNavigate();
  const { items, restaurantId, restaurantName, subtotal } = useCartStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { data: addressesData, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => addressesApi.list(),
  });

  const addresses = addressesData?.data?.data ?? [];
  const activeAddress =
    selectedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

  const sub = subtotal();
  const tax = sub * 0.25;
  const total = sub + tax;

  if (items.length === 0) {
    return (
      <div className="py-32 text-center text-gray-400">
        <p>Din kurv er tom.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-brand-500 hover:underline text-sm">
          Find restauranter
        </button>
      </div>
    );
  }

  async function handleProceed() {
    if (!restaurantId || !activeAddress) return;
    setError(null);
    setIsPending(true);
    try {
      const res = await ordersApi.create({
        restaurantId,
        deliveryAddressId: activeAddress,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          selectedOptions: i.selectedOptions,
          specialInstructions: i.specialInstructions,
        })),
        specialInstructions: instructions || undefined,
      });
      onProceed({
        clientSecret: res.data.data.clientSecret,
        orderId: res.data.data.order.id,
        total,
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? "Ordre kunne ikke oprettes. Prøv igen.");
      setIsPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Betaling</h1>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Address */}
          <div className="rounded-2xl border border-gray-100 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-brand-500" />
              Leveringsadresse
            </h2>
            {isLoading ? (
              <p className="text-sm text-gray-400">Indlæser adresser...</p>
            ) : addresses.length === 0 ? (
              <p className="text-sm text-gray-400">
                Ingen adresser gemt.{" "}
                <button onClick={() => navigate("/account")} className="text-brand-500 hover:underline">
                  Tilføj en her
                </button>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                      activeAddress === a.id
                        ? "border-brand-400 bg-brand-50/40"
                        : "border-gray-100 hover:border-brand-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={a.id}
                      checked={activeAddress === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="mt-0.5 accent-brand-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.label}</p>
                      <p className="text-xs text-gray-500">
                        {a.street}, {a.postalCode} {a.city}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Special instructions */}
          <div className="rounded-2xl border border-gray-100 p-6">
            <h2 className="mb-3 font-semibold text-gray-900">Særlige ønsker</h2>
            <textarea
              placeholder="Allergi, ringklokke, etage..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-gray-100 p-6">
            <h2 className="mb-4 font-semibold text-gray-900">{restaurantName}</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {items.map((item) => (
                <li key={item.menuItemId} className="flex justify-between text-gray-600">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span>
                    {(
                      (item.price + item.selectedOptions.reduce((s, o) => s + o.priceModifier, 0)) *
                      item.quantity
                    ).toFixed(0)}{" "}
                    kr
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{sub.toFixed(0)} kr</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Moms (25%)</span>
                <span>{tax.toFixed(0)} kr</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1">
                <span>Total</span>
                <span>{total.toFixed(0)} kr</span>
              </div>
            </div>

            {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

            <button
              onClick={handleProceed}
              disabled={isPending || !activeAddress}
              className="mt-4 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isPending ? "Opretter ordre..." : `Gå til betaling — ${total.toFixed(0)} kr`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Payment methods ───────────────────────────────────────────────────

function Step2({ orderId, total }: { orderId: string; total: number }) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { clear } = useCartStore();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setError(null);
    setIsPending(true);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Betaling fejlede. Prøv igen.");
      setIsPending(false);
      return;
    }

    clear();
    navigate(`/orders/${orderId}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Vælg betalingsmetode</h1>
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <PaymentElement
          options={{
            layout: "accordion",
            fields: {
              billingDetails: {
                address: { postalCode: "never", country: "never" },
              },
            },
          }}
        />

        {error && <p className="mt-4 text-xs text-red-500">{error}</p>}

        <button
          onClick={handlePay}
          disabled={isPending || !stripe}
          className="mt-5 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {isPending ? "Behandler betaling..." : `Betal ${total.toFixed(0)} kr`}
        </button>
      </div>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) {
    return <Step1 onProceed={setSession} />;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: session.clientSecret,
        locale: "da",
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#f97316",
            borderRadius: "12px",
            fontFamily: "inherit",
          },
        },
      }}
    >
      <Step2 orderId={session.orderId} total={session.total} />
    </Elements>
  );
}
