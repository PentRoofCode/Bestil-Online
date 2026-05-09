import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { restaurantsApi } from "@/api/restaurants.api";
import RestaurantCard from "@/components/restaurant/RestaurantCard";

const CUISINES = ["Pizza", "Sushi", "Burger", "Mexicansk", "Kylling", "Asiatisk", "Salat"];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState<string | undefined>();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["restaurants", { search: debouncedSearch, cuisine: selectedCuisine }],
    queryFn: () =>
      restaurantsApi.list({ search: debouncedSearch || undefined, cuisine: selectedCuisine }),
  });

  const restaurants = data?.data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Search */}
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">
          Bestil mad til din dør
        </h1>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Søg restauranter..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                clearTimeout((window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st);
                (window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(() => setDebouncedSearch(e.target.value), 400);
              }}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50">
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>
        </div>

        {/* Cuisine chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(selectedCuisine === c ? undefined : c)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                selectedCuisine === c
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-gray-200 text-gray-600 hover:border-brand-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant grid */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <p className="text-lg">Ingen restauranter fundet</p>
          <p className="mt-1 text-sm">Prøv en anden søgning</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}
    </div>
  );
}
