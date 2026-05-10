import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, DollarSign, TrendingUp, Store, Clock } from "lucide-react";
import { adminApi } from "@/api/admin.api";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30_000,
  });

  const stats = data?.data?.data;

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">I dag</p>
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ordrer i dag"
          value={String(stats?.today.orders ?? 0)}
          icon={ShoppingBag}
          color="bg-brand-500"
        />
        <StatCard
          label="Omsætning i dag"
          value={`${(stats?.today.revenue ?? 0).toFixed(0)} kr`}
          icon={DollarSign}
          color="bg-emerald-500"
        />
        <StatCard
          label="Aktive restauranter"
          value={String(stats?.activeRestaurants ?? 0)}
          icon={Store}
          color="bg-blue-500"
        />
        <StatCard
          label="Afventer godkendelse"
          value={String(stats?.pendingRestaurants ?? 0)}
          icon={Clock}
          color="bg-amber-500"
        />
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Denne måned</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ordrer (30 dage)"
          value={String(stats?.month.orders ?? 0)}
          icon={ShoppingBag}
          color="bg-brand-400"
        />
        <StatCard
          label="Omsætning (30 dage)"
          value={`${(stats?.month.revenue ?? 0).toFixed(0)} kr`}
          icon={TrendingUp}
          color="bg-emerald-400"
        />
        <StatCard
          label="Gns. ordreværdi"
          value={`${(stats?.month.aov ?? 0).toFixed(0)} kr`}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>
    </div>
  );
}
