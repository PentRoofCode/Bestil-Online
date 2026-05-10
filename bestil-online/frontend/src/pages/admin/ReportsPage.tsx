import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { adminApi } from "@/api/admin.api";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toISODate(from), to: toISODate(to) };
}

export default function ReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "revenue", range, groupBy],
    queryFn: () =>
      adminApi.revenueReport({ from: `${range.from}T00:00:00.000Z`, to: `${range.to}T23:59:59.999Z`, groupBy }),
    enabled: !!range.from && !!range.to,
  });

  const rows = data?.data?.data ?? [];
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Omsætningsrapport</h1>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Fra</label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Til</label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Gruppe</label>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${groupBy === g ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600"}`}
              >
                {g === "day" ? "Dag" : g === "week" ? "Uge" : "Måned"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Total omsætning</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalRevenue.toFixed(0)} kr</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Antal ordrer</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-sm text-gray-500">Gns. ordreværdi</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0} kr
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        ) : rows.length === 0 ? (
          <p className="py-20 text-center text-gray-400">Ingen data for den valgte periode</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={rows} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value);
                  return name === "revenue" ? [`${v.toFixed(0)} kr`, "Omsætning"] : [v, "Ordrer"];
                }}
              />
              <Legend formatter={(v) => (v === "revenue" ? "Omsætning (kr)" : "Ordrer")} />
              <Bar yAxisId="left" dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
