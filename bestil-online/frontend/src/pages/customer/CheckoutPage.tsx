import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ArrowLeft } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
  PaymentElement,
} from "@stripe/react-stripe-js/checkout";
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

  const PEEK_COUNT = 2;
  const [addressesExpanded, setAddressesExpanded] = useState(false);
  // Selected address always floats to the top so it's visible without expanding
  const sortedAddresses = [...addresses].sort((a, b) => {
    if (a.id === activeAddress) return -1;
    if (b.id === activeAddress) return 1;
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return 0;
  });
  const showAllAddresses = addressesExpanded || sortedAddresses.length <= PEEK_COUNT;
  const visibleAddresses = showAllAddresses ? sortedAddresses : sortedAddresses.slice(0, PEEK_COUNT);

  const VAT_RATE = parseFloat(import.meta.env.VITE_VAT_RATE ?? "0.25");
  const sub = subtotal();
  const tax = sub * VAT_RATE;
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
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Tilbage
      </button>
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
              <div>
                <div className="relative">
                  <div className="flex flex-col gap-2">
                    {visibleAddresses.map((a) => (
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
                          onChange={() => { setSelectedAddressId(a.id); setAddressesExpanded(false); }}
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
                  {!showAllAddresses && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                {!showAllAddresses && (
                  <button
                    onClick={() => setAddressesExpanded(true)}
                    className="mt-1 w-full py-1.5 text-center text-sm text-brand-500 hover:underline"
                  >
                    Vis {sortedAddresses.length - PEEK_COUNT} mere
                  </button>
                )}
                {showAllAddresses && addresses.length > PEEK_COUNT && (
                  <button
                    onClick={() => setAddressesExpanded(false)}
                    className="mt-2 w-full py-1 text-center text-sm text-gray-400 hover:text-gray-600"
                  >
                    Vis færre
                  </button>
                )}
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

function PaymentForm({ orderId, total, onBack }: { orderId: string; total: number; onBack: () => void }) {
  const navigate = useNavigate();
  const checkoutState = useCheckoutElements();
  const { clear } = useCartStore();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handlePay() {
    if (checkoutState.type !== "success") return;
    setError(null);
    setIsPending(true);

    try {
      const result = await checkoutState.checkout.confirm({ redirect: "if_required" });

      if (result.type === "error") {
        setError(result.error.message ?? "Betaling fejlede. Prøv igen.");
        setIsPending(false);
        return;
      }

      clear();
      navigate(`/orders/${orderId}`);
    } catch {
      setError("Der opstod en uventet fejl. Prøv igen.");
      setIsPending(false);
    }
  }

  async function handleBack() {
    setCancelling(true);
    try { await ordersApi.cancel(orderId, "Kunden gik tilbage fra betaling"); } catch { /* order may already be gone */ }
    onBack();
  }

  const isLoading = checkoutState.type === "loading";

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <button
        onClick={handleBack}
        disabled={cancelling || isPending}
        className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" />
        {cancelling ? "Annullerer..." : "Tilbage"}
      </button>
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
          disabled={isPending || isLoading}
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
    <CheckoutElementsProvider
      stripe={stripePromise}
      options={{
        clientSecret: session.clientSecret,
        elementsOptions: {
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#f97316",
              borderRadius: "12px",
              fontFamily: "inherit",
            },
          },
        },
      }}
    >
      <PaymentForm orderId={session.orderId} total={session.total} onBack={() => setSession(null)} />
    </CheckoutElementsProvider>
  );
}
