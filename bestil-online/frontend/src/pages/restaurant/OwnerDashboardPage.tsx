import { useQuery } from "@tanstack/react-query";
import { restaurantsApi } from "@/api/restaurants.api";
import { Store, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function OwnerDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["restaurants", "owned"],
    queryFn: () => restaurantsApi.getOwned(),
  });

  const restaurants = data?.data?.data ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100" />
      ) : restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
          <Store className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-medium text-gray-500">Ingen restauranter endnu</p>
          <Link
            to="/restaurant/settings"
            className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Opret restaurant
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.city}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {r.isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Aktiv
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <XCircle className="h-3.5 w-3.5" /> Inaktiv
                    </span>
                  )}
                  {r.isVerified ? (
                    <span className="text-xs text-green-600">Verificeret</span>
                  ) : (
                    <span className="text-xs text-yellow-500">Afventer verificering</span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  to="/restaurant/orders"
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Ordrer
                </Link>
                <Link
                  to="/restaurant/menu"
                  className="flex-1 rounded-lg border border-gray-200 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Menu
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
