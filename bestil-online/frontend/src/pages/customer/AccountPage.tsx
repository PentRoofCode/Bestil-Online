import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, MapPin, Lock, Plus, Trash2 } from "lucide-react";
import { usersApi } from "@/api/users.api";
import { addressesApi } from "@/api/addresses.api";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";

function ProfileSection() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => usersApi.getProfile() });
  const profile = data?.data?.data;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  function startEdit() {
    setFirstName(profile?.firstName ?? "");
    setLastName(profile?.lastName ?? "");
    setPhone(profile?.phone ?? "");
    setEditing(true);
    setSaved(false);
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => usersApi.updateProfile({ firstName, lastName, phone: phone || undefined }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (accessToken) setAuth(res.data.data as never, accessToken);
      setEditing(false);
      setSaved(true);
    },
  });

  return (
    <div className="rounded-2xl border border-gray-100 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
        <User className="h-4 w-4 text-brand-500" /> Profil
      </h2>
      {!editing ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-400">Fornavn</p>
              <p className="text-sm font-medium text-gray-900">{profile?.firstName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Efternavn</p>
              <p className="text-sm font-medium text-gray-900">{profile?.lastName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-700">{profile?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Telefon</p>
              <p className="text-sm text-gray-700">{profile?.phone ?? "–"}</p>
            </div>
          </div>
          {saved && <p className="mt-3 text-xs text-green-500">Profil gemt</p>}
          <button onClick={startEdit} className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
            Rediger
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Fornavn</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Efternavn</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Annuller</button>
            <button onClick={() => save()} disabled={isPending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isPending ? "Gemmer..." : "Gem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddressesSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["addresses"], queryFn: () => addressesApi.list() });
  const addresses = data?.data?.data ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", street: "", city: "", postalCode: "", isDefault: false });
  const [error, setError] = useState("");

  const { mutate: addAddress, isPending } = useMutation({
    mutationFn: () => addressesApi.create({ ...form, country: "DK" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["addresses"] }); setAdding(false); setForm({ label: "", street: "", city: "", postalCode: "", isDefault: false }); },
    onError: () => setError("Kunne ikke tilføje adressen"),
  });

  const { mutate: deleteAddress } = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/me/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });

  return (
    <div className="rounded-2xl border border-gray-100 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <MapPin className="h-4 w-4 text-brand-500" /> Adresser
        </h2>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600">
          <Plus className="h-4 w-4" /> Tilføj
        </button>
      </div>

      {addresses.length === 0 && !adding && (
        <p className="text-sm text-gray-400">Ingen adresser tilføjet endnu.</p>
      )}

      <div className="flex flex-col gap-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start justify-between rounded-xl border border-gray-100 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {a.label} {a.isDefault && <span className="ml-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">Standard</span>}
              </p>
              <p className="text-xs text-gray-500">{a.street}, {a.postalCode} {a.city}</p>
            </div>
            <button onClick={() => deleteAddress(a.id)} className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Label (fx Hjem)", key: "label" as const },
              { label: "Vejnavn og nummer", key: "street" as const },
              { label: "By", key: "city" as const },
              { label: "Postnummer", key: "postalCode" as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-gray-500">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="accent-brand-500" />
            Sæt som standardadresse
          </label>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex gap-3">
            <button onClick={() => setAdding(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Annuller</button>
            <button onClick={() => addAddress()} disabled={isPending} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {isPending ? "Tilføjer..." : "Tilføj"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => { setSuccess(true); setCurrent(""); setNext(""); setError(""); },
    onError: (e: { response?: { data?: { error?: { message?: string } } } }) => {
      setError(e.response?.data?.error?.message ?? "Kunne ikke skifte adgangskode");
    },
  });

  return (
    <div className="rounded-2xl border border-gray-100 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
        <Lock className="h-4 w-4 text-brand-500" /> Skift adgangskode
      </h2>
      <div className="flex flex-col gap-3 max-w-sm">
        <div>
          <label className="mb-1 block text-xs text-gray-500">Nuværende adgangskode</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Ny adgangskode</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-500">Adgangskode skiftet</p>}
        <button onClick={() => mutate()} disabled={isPending || !current || next.length < 8} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 self-start">
          {isPending ? "Skifter..." : "Skift adgangskode"}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">Min konto</h1>
      <div className="flex flex-col gap-6">
        <ProfileSection />
        <AddressesSection />
        <PasswordSection />
      </div>
    </div>
  );
}
