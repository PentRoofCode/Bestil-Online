import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { adminApi } from "@/api/admin.api";

type StatusFilter = "all" | "pending" | "verified";

export default function RestaurantsAdminPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [suspendModal, setSuspendModal] = useState<{ id: string; name: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "restaurants", status],
    queryFn: () => adminApi.listRestaurants({ status }),
  });

  const restaurants = data?.data?.data ?? [];

  const { mutate: verify } = useMutation({
    mutationFn: (id: string) => adminApi.verifyRestaurant(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "restaurants"] }),
  });

  const { mutate: suspend, isPending: suspending } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.suspendRestaurant(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "restaurants"] });
      setSuspendModal(null);
      setSuspendReason("");
    },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Restauranter</h1>

      <div className="mb-5 flex gap-2">
        {(["all", "pending", "verified"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              status === s ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "Alle" : s === "pending" ? "Afventer" : "Godkendte"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : restaurants.length === 0 ? (
        <p className="py-10 text-center text-gray-400">Ingen restauranter fundet</p>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Restaurant</th>
                <th className="px-5 py-3 text-left">Ejer</th>
                <th className="px-5 py-3 text-left">By</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {restaurants.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-5 py-3 text-gray-500">{r.owner.email}</td>
                  <td className="px-5 py-3 text-gray-500">{r.city}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.isVerified && r.isActive
                          ? "bg-green-50 text-green-600"
                          : !r.isVerified
                            ? "bg-amber-50 text-amber-600"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.isVerified && r.isActive ? (
                        <><CheckCircle className="h-3 w-3" /> Aktiv</>
                      ) : !r.isVerified ? (
                        <><Clock className="h-3 w-3" /> Afventer</>
                      ) : (
                        <><XCircle className="h-3 w-3" /> Suspenderet</>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {!r.isVerified && (
                        <button
                          onClick={() => verify(r.id)}
                          className="rounded-lg bg-green-500 px-3 py-1 text-xs font-semibold text-white hover:bg-green-600"
                        >
                          Godkend
                        </button>
                      )}
                      {r.isActive && (
                        <button
                          onClick={() => setSuspendModal({ id: r.id, name: r.name })}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                          Suspender
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-2 font-semibold text-gray-900">Suspender {suspendModal.name}</h3>
            <p className="mb-4 text-sm text-gray-500">Angiv årsagen til suspension:</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              placeholder="Årsag..."
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setSuspendModal(null); setSuspendReason(""); }}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm"
              >
                Annuller
              </button>
              <button
                onClick={() => suspend({ id: suspendModal.id, reason: suspendReason })}
                disabled={suspending || !suspendReason.trim()}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {suspending ? "Suspenderer..." : "Suspender"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
