import { X, Trash2, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: Props) {
  const { items, restaurantName, removeItem, updateQuantity, subtotal, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  function handleCheckout() {
    if (!user) {
      onClose();
      navigate("/login?redirect=/checkout");
      return;
    }
    onClose();
    navigate("/checkout");
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}
      <div
        className={`fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <ShoppingCart className="h-5 w-5 text-brand-500" />
            Din ordre
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {restaurantName && (
          <p className="border-b border-gray-100 px-5 py-2 text-xs text-gray-400">
            Fra {restaurantName}
          </p>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Kurven er tom
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => {
                const optExtra = item.selectedOptions.reduce((s, o) => s + o.priceModifier, 0);
                const unitPrice = item.price + optExtra;
                return (
                  <li key={item.menuItemId} className="flex items-start gap-3">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                        className="px-2 py-1 text-gray-600 hover:text-brand-500"
                      >
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                        className="px-2 py-1 text-gray-600 hover:text-brand-500"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {item.selectedOptions.map((o) => o.optionName).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {(unitPrice * item.quantity).toFixed(0)} kr
                      </span>
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="text-gray-300 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-100 p-5">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold">{subtotal().toFixed(0)} kr</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Gå til betaling
            </button>
            <button
              onClick={() => { if (confirm("Ryd hele kurven?")) clear(); }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs text-gray-500 hover:border-red-200 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Ryd kurv
            </button>
          </div>
        )}
      </div>
    </>
  );
}
