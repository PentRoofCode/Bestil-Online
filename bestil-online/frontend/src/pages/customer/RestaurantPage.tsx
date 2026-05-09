import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, Bike, ShoppingCart, Plus } from "lucide-react";
import { restaurantsApi } from "@/api/restaurants.api";
import { useCartStore } from "@/stores/cartStore";
import CartDrawer from "@/components/restaurant/CartDrawer";
import type { MenuItem, MenuOptionGroup } from "@/api/restaurants.api";

function ItemModal({
  item,
  restaurantId,
  restaurantSlug,
  restaurantName,
  onClose,
}: {
  item: MenuItem;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  onClose: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const clear = useCartStore((s) => s.clear);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);
  const [qty, setQty] = useState(1);
  const [selections, setSelections] = useState<Record<string, string | string[]>>({});
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  function toggleOption(group: MenuOptionGroup, optionName: string) {
    setSelections((prev) => {
      if (group.isMultiSelect) {
        const current = (prev[group.id] as string[] | undefined) ?? [];
        return {
          ...prev,
          [group.id]: current.includes(optionName)
            ? current.filter((n) => n !== optionName)
            : [...current, optionName],
        };
      }
      return { ...prev, [group.id]: optionName };
    });
  }

  function handleAdd() {
    const selectedOptions: { groupName: string; optionName: string; priceModifier: number }[] = [];
    for (const group of item.optionGroups) {
      const sel = selections[group.id];
      if (!sel || (Array.isArray(sel) && sel.length === 0)) continue;
      const names = Array.isArray(sel) ? sel : [sel];
      for (const name of names) {
        const opt = group.options.find((o) => o.name === name);
        if (opt) selectedOptions.push({ groupName: group.name, optionName: opt.name, priceModifier: Number(opt.priceModifier) });
      }
    }

    const success = addItem(restaurantId, restaurantSlug, restaurantName, {
      menuItemId: item.id,
      name: item.name,
      price: Number(item.price),
      quantity: qty,
      selectedOptions,
    });

    if (!success && cartRestaurantId !== restaurantId) {
      setConfirmSwitch(true);
      return;
    }
    onClose();
  }

  if (confirmSwitch) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6">
          <h3 className="font-semibold text-gray-900">Start ny ordre?</h3>
          <p className="mt-2 text-sm text-gray-500">
            Din kurv indeholder varer fra en anden restaurant. Vil du rydde kurven og starte forfra?
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setConfirmSwitch(false)}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm"
            >
              Annuller
            </button>
            <button
              onClick={() => {
                clear();
                handleAdd();
              }}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white"
            >
              Ryd og tilføj
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
        {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}

        {item.optionGroups.map((group) => (
          <div key={group.id} className="mt-5">
            <p className="text-sm font-semibold text-gray-900">
              {group.name}
              {group.isRequired && <span className="ml-1 text-xs text-red-500">*</span>}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {group.options.map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-3">
                  <input
                    type={group.isMultiSelect ? "checkbox" : "radio"}
                    name={group.id}
                    checked={
                      group.isMultiSelect
                        ? ((selections[group.id] as string[] | undefined) ?? []).includes(opt.name)
                        : selections[group.id] === opt.name
                    }
                    onChange={() => toggleOption(group, opt.name)}
                    className="accent-brand-500"
                  />
                  <span className="flex-1 text-sm text-gray-700">{opt.name}</span>
                  {Number(opt.priceModifier) > 0 && (
                    <span className="text-xs text-gray-400">+{opt.priceModifier} kr</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="text-gray-600">−</button>
            <span className="min-w-[1.5rem] text-center font-semibold">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="text-gray-600">+</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">
              Luk
            </button>
            <button
              onClick={handleAdd}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Tilføj — {(Number(item.price) * qty).toFixed(0)} kr
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantPage() {
  const { slug } = useParams<{ slug: string }>();
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const totalItems = useCartStore((s) => s.totalItems());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["restaurant", slug],
    queryFn: () => restaurantsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const restaurant = data?.data?.data;

  if (isLoading) return <div className="py-32 text-center text-gray-400">Indlæser...</div>;
  if (isError || !restaurant) return <div className="py-32 text-center text-gray-400">Restaurant ikke fundet</div>;

  return (
    <>
      {/* Banner */}
      <div className="h-48 bg-gradient-to-br from-brand-100 to-orange-100">
        {restaurant.bannerUrl && (
          <img src={restaurant.bannerUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Restaurant info */}
        <div className="flex items-start justify-between py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-sm text-gray-500">{restaurant.cuisines.join(" · ")}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                {restaurant.avgRating.toFixed(1)} ({restaurant.reviewCount} anmeldelser)
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {restaurant.deliveryTimeMin} min
              </span>
              <span className="flex items-center gap-1">
                <Bike className="h-4 w-4" />
                {Number(restaurant.deliveryFee) === 0 ? "Gratis levering" : `${restaurant.deliveryFee} kr levering`}
              </span>
            </div>
          </div>
          {totalItems > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <ShoppingCart className="h-4 w-4" />
              Se kurv ({totalItems})
            </button>
          )}
        </div>

        {/* Menu */}
        <div className="pb-20">
          {restaurant.categories.map((cat) => (
            <div key={cat.id} className="mb-10">
              <h2 className="mb-4 text-lg font-bold text-gray-900">{cat.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {cat.menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.isVegetarian && (
                          <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">
                            V
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{item.description}</p>
                      )}
                      <p className="mt-2 font-semibold text-gray-900">{Number(item.price).toFixed(0)} kr</p>
                    </div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        <Plus className="h-5 w-5 text-brand-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          restaurantId={restaurant.id}
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
          onClose={() => setSelectedItem(null)}
        />
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
