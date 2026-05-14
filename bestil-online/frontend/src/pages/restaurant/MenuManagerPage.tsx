import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Copy } from "lucide-react";
import { restaurantsApi } from "@/api/restaurants.api";
import { menusApi } from "@/api/menus.api";

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  menuItems: MenuItemData[];
}

function CategoryModal({
  restaurantId,
  initial,
  onClose,
}: {
  restaurantId: string;
  initial?: { id: string; name: string };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      initial
        ? menusApi.updateCategory(restaurantId, initial.id, { name })
        : menusApi.createCategory(restaurantId, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu", restaurantId, "manage"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="mb-4 font-semibold text-gray-900">
          {initial ? "Rediger kategori" : "Ny kategori"}
        </h3>
        <label className="mb-1 block text-sm font-medium text-gray-700">Navn</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          autoFocus
        />
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600">
            Annuller
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !name.trim()}
            className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Gemmer..." : "Gem"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemModal({
  restaurantId,
  categoryId,
  initial,
  categories,
  onClose,
}: {
  restaurantId: string;
  categoryId: string;
  initial?: { id: string; name: string; description: string | null; price: string; isVegetarian: boolean };
  categories: Category[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price ? String(Number(initial.price)) : "");
  const [isVegetarian, setIsVegetarian] = useState(initial?.isVegetarian ?? false);
  const [selCat, setSelCat] = useState(categoryId);
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) throw new Error("Ugyldig pris");
      return initial
        ? menusApi.updateItem(restaurantId, initial.id, {
            name,
            description: description || undefined,
            price: parsedPrice,
            isVegetarian,
            categoryId: selCat,
          })
        : menusApi.createItem(restaurantId, {
            categoryId: selCat,
            name,
            description: description || undefined,
            price: parsedPrice,
            isVegetarian,
          });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu", restaurantId, "manage"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="mb-4 font-semibold text-gray-900">{initial ? "Rediger vare" : "Ny vare"}</h3>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Kategori</label>
            <select
              value={selCat}
              onChange={(e) => setSelCat(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Navn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Beskrivelse</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Pris (kr)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isVegetarian}
              onChange={(e) => setIsVegetarian(e.target.checked)}
              className="accent-brand-500"
            />
            Vegetarisk
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600">
            Annuller
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !name.trim() || !price}
            className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Gemmer..." : "Gem"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyMenuModal({
  restaurantId,
  otherRestaurants,
  onClose,
}: {
  restaurantId: string;
  otherRestaurants: { id: string; name: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [sourceId, setSourceId] = useState(otherRestaurants[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCopy() {
    if (!sourceId) return;
    setRunning(true);
    setStatus("Henter kildemenuen...");
    try {
      const res = await menusApi.getOwnerMenu(sourceId);
      const categories: Category[] = res.data.data as Category[];
      let catCount = 0;
      let itemCount = 0;
      for (const cat of categories) {
        setStatus(`Kopierer kategori: ${cat.name}…`);
        const newCatRes = await menusApi.createCategory(restaurantId, {
          name: cat.name,
          description: cat.description ?? undefined,
        });
        catCount++;
        const newCatId = newCatRes.data.data.id;
        for (const item of cat.menuItems) {
          await menusApi.createItem(restaurantId, {
            categoryId: newCatId,
            name: item.name,
            description: item.description ?? undefined,
            price: Number(item.price),
            isVegetarian: item.isVegetarian,
            isVegan: item.isVegan,
          });
          itemCount++;
        }
      }
      setStatus(`Kopierede ${catCount} kategorier og ${itemCount} varer.`);
      qc.invalidateQueries({ queryKey: ["menu", restaurantId, "manage"] });
      setDone(true);
    } catch {
      setStatus("Fejl under kopiering. Prøv igen.");
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">
        <h3 className="mb-1 font-semibold text-gray-900">Kopier menu</h3>
        <p className="mb-4 text-sm text-gray-500">
          Kopierer alle kategorier og varer fra den valgte restaurant til denne.
        </p>
        {otherRestaurants.length === 0 ? (
          <p className="text-sm text-gray-400">Ingen andre restauranter at kopiere fra.</p>
        ) : (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">Kildrestaurant</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              disabled={running || done}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
            >
              {otherRestaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {status && (
              <p className={`mt-3 text-xs ${done ? "text-green-600" : "text-gray-500"}`}>{status}</p>
            )}
          </>
        )}
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600">
            {done ? "Luk" : "Annuller"}
          </button>
          {!done && otherRestaurants.length > 0 && (
            <button
              onClick={handleCopy}
              disabled={running || !sourceId}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {running ? "Kopierer…" : "Kopier"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuManagerPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [categoryModal, setCategoryModal] = useState<
    null | { mode: "create" } | { mode: "edit"; id: string; name: string }
  >(null);
  const [itemModal, setItemModal] = useState<
    | null
    | { mode: "create"; categoryId: string }
    | { mode: "edit"; categoryId: string; item: { id: string; name: string; description: string | null; price: string; isVegetarian: boolean } }
  >(null);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const { data: ownedData } = useQuery({
    queryKey: ["restaurants", "owned"],
    queryFn: () => restaurantsApi.getOwned(),
  });
  const ownedRestaurants = ownedData?.data?.data ?? [];
  const isOwned = ownedRestaurants.some((r) => r.id === restaurantId);
  const otherRestaurants = ownedRestaurants.filter((r) => r.id !== restaurantId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["menu", restaurantId, "manage"],
    queryFn: () => menusApi.getOwnerMenu(restaurantId!),
    enabled: !!restaurantId,
    retry: false,
  });

  const categories = (data?.data?.data ?? []) as Category[];

  const { mutate: deleteCategory } = useMutation({
    mutationFn: (catId: string) => menusApi.deleteCategory(restaurantId!, catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu", restaurantId, "manage"] }),
  });

  const { mutate: deleteItem } = useMutation({
    mutationFn: (itemId: string) => menusApi.deleteItem(restaurantId!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu", restaurantId, "manage"] }),
  });

  const { mutate: toggleAvailability } = useMutation({
    mutationFn: ({ itemId, isAvailable }: { itemId: string; isAvailable: boolean }) =>
      menusApi.setAvailability(restaurantId!, itemId, isAvailable),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu", restaurantId, "manage"] }),
  });

  if (!restaurantId) return null;

  if (ownedData && !isOwned) {
    navigate("/restaurant/dashboard", { replace: true });
    return null;
  }

  if (isError) {
    const axiosErr = error as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } }; message?: string };
    const status = axiosErr.response?.status;
    const errMsg = axiosErr.response?.data?.error?.message ?? axiosErr.message ?? "Netværksfejl — kan backend nås?";
    const errCode = axiosErr.response?.data?.error?.code;
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
        <p className="font-semibold">Fejl ved indlæsning af menu</p>
        <p className="mt-1 text-red-500">{errMsg}</p>
        {(status || errCode) && (
          <p className="mt-1 text-xs text-red-400">
            {status && `HTTP ${status}`}{status && errCode && " · "}{errCode}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        <div className="flex items-center gap-2">
          {otherRestaurants.length > 0 && (
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" /> Kopier menu
            </button>
          )}
          <button
            onClick={() => setCategoryModal({ mode: "create" })}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" /> Ny kategori
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
          Ingen menukategorier endnu. Opret din første kategori.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{cat.name}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCategoryModal({ mode: "edit", id: cat.id, name: cat.name })}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                    title="Rediger kategori"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Slet kategorien "${cat.name}"?`)) deleteCategory(cat.id); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Slet kategori"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setItemModal({ mode: "create", categoryId: cat.id })}
                    className="flex items-center gap-1 rounded-lg border border-brand-200 px-2 py-1 text-xs text-brand-500 hover:bg-brand-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tilføj vare
                  </button>
                </div>
              </div>

              {cat.menuItems.length === 0 ? (
                <p className="text-sm text-gray-400">Ingen varer i denne kategori.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {cat.menuItems.map((item) => (
                    <li key={item.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {item.isVegetarian && (
                            <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600">V</span>
                          )}
                          {!item.isAvailable && (
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Utilgængelig</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{Number(item.price).toFixed(0)} kr</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => toggleAvailability({ itemId: item.id, isAvailable: !item.isAvailable })}
                          className={`rounded-lg p-1.5 ${item.isAvailable ? "text-green-500 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                          title={item.isAvailable ? "Sæt utilgængelig" : "Sæt tilgængelig"}
                        >
                          {item.isAvailable ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => setItemModal({ mode: "edit", categoryId: cat.id, item: { id: item.id, name: item.name, description: item.description, price: item.price, isVegetarian: item.isVegetarian } })}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Rediger vare"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Slet "${item.name}"?`)) deleteItem(item.id); }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Slet vare"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {categoryModal && (
        <CategoryModal
          restaurantId={restaurantId}
          initial={categoryModal.mode === "edit" ? { id: categoryModal.id, name: categoryModal.name } : undefined}
          onClose={() => setCategoryModal(null)}
        />
      )}

      {itemModal && (
        <ItemModal
          restaurantId={restaurantId}
          categoryId={itemModal.categoryId}
          initial={itemModal.mode === "edit" ? itemModal.item : undefined}
          categories={categories}
          onClose={() => setItemModal(null)}
        />
      )}

      {showCopyModal && (
        <CopyMenuModal
          restaurantId={restaurantId}
          otherRestaurants={otherRestaurants}
          onClose={() => setShowCopyModal(false)}
        />
      )}
    </div>
  );
}
