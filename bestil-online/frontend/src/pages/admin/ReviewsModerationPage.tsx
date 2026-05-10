import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Star } from "lucide-react";
import { reviewsApi } from "@/api/reviews.api";

export default function ReviewsModerationPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews", page, filter],
    queryFn: () => reviewsApi.adminList({ page, limit: 20, isVisible: filter }),
  });

  const { mutate: toggleVisibility } = useMutation({
    mutationFn: ({ id, isVisible }: { id: string; isVisible: boolean }) =>
      reviewsApi.setVisibility(id, isVisible),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });

  const reviews = data?.data?.data ?? [];
  const pagination = data?.data?.meta?.pagination;

  const FILTERS = [
    { label: "Alle", value: undefined },
    { label: "Synlige", value: true },
    { label: "Skjulte", value: false },
  ] as const;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Anmeldelser</h1>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Indlæser...</p>
      ) : reviews.length === 0 ? (
        <p className="text-gray-400">Ingen anmeldelser fundet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Kunde</th>
                <th className="px-4 py-3">Vurdering</th>
                <th className="px-4 py-3">Kommentar</th>
                <th className="px-4 py-3">Dato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${!r.isVisible ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.restaurant.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.user.firstName} {r.user.lastName}
                    <span className="block text-xs text-gray-400">{r.user.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="line-clamp-2 text-gray-600">{r.comment ?? <span className="italic text-gray-300">Ingen kommentar</span>}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("da-DK")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.isVisible ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.isVisible ? "Synlig" : "Skjult"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisibility({ id: r.id, isVisible: !r.isVisible })}
                      title={r.isVisible ? "Skjul anmeldelse" : "Vis anmeldelse"}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      {r.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{pagination.total} anmeldelser</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
            >
              Forrige
            </button>
            <span className="px-2 py-1.5">
              {page} / {pagination.totalPages}
            </span>
            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
            >
              Næste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
