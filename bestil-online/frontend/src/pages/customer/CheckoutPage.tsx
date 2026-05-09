import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, CreditCard } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { addressesApi } from "@/api/addresses.api";
import { ordersApi } from "@/api/orders.api";
import { useCartStore } from "@/stores/cartStore";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      fontFamily: "inherit",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#ef4444" },
  },
};

function CheckoutForm() {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { items, restaurantId, restaurantName, subtotal, clear } = useCartStore();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { data: addressesData, isLoading: loadingAddresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => addressesApi.list(),
  });

  const addresses = addressesData?.data?.data ?? [];
  const activeAddress = selectedAddressId ?? addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

  const VAT_RATE = 0.25;
  const sub = subtotal();
  const tax = sub * VAT_RATE;
  const total = sub + tax;

  async function handlePlaceOrder() {
    if (!restaurantId || !activeAddress || !stripe || !elements) return;
    setError(null);
    setIsPending(true);

    let orderId: string;
    let clientSecret: string | null = null;

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
      orderId = res.data.data.order.id;
      clientSecret = res.data.data.clientSecret;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? "Ordre kunne ikke oprettes. Prøv igen.");
      setIsPending(false);
      return;
    }

    if (clientSecret) {
      const cardElement = elements.getElement(CardElement);
      if (cardElement) {
        const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: { card: cardElement },
        });
        if (stripeError) {
          setError(stripeError.message ?? "Betaling fejlede. Prøv igen.");
          setIsPending(false);
          navigate(`/orders/${orderId}`);
          return;
        }
      }
    }

    clear();
    navigate(`/orders/${orderId}`);
  }

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Betaling</h1>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: address + payment */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Address */}
          <div className="rounded-2xl border border-gray-100 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <MapPin className="h-4 w-4 text-brand-500" />
              Leveringsadresse
            </h2>
            {loadingAddresses ? (
              <p className="text-sm text-gray-400">Indlæser adresser...</p>
            ) : addresses.length === 0 ? (
              <p className="text-sm text-gray-400">Ingen adresser gemt. Tilføj en under Din Konto.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-4 hover:border-brand-200"
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

          {/* Payment */}
          <div className="rounded-2xl border border-gray-100 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <CreditCard className="h-4 w-4 text-brand-500" />
              Kortbetaling
            </h2>
            <div className="rounded-xl border border-gray-200 px-4 py-3">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Brug testkortet <span className="font-mono">4242 4242 4242 4242</span>, en fremtidig udløbsdato og en vilkårlig CVC.
            </p>
          </div>
        </div>

        {/* Right: order summary */}
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
              onClick={handlePlaceOrder}
              disabled={isPending || !activeAddress || !stripe}
              className="mt-4 w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isPending ? "Behandler betaling..." : `Betal ${total.toFixed(0)} kr`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}
