import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { apiClient } from "@/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError("");
    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Noget gik galt. Prøv igen.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <ShoppingBag className="h-8 w-8 text-brand-500" />
          <span className="text-2xl font-bold">Bestil Online</span>
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-gray-900">Glemt adgangskode</h1>

          {sent ? (
            <div>
              <p className="text-sm text-gray-600">
                Hvis der er en konto tilknyttet <strong>{email}</strong>, har vi sendt et link til nulstilling af adgangskode.
              </p>
              <p className="mt-2 text-sm text-gray-500">Tjek din indbakke (og spam-mappen).</p>
            </div>
          ) : (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Indtast din email, og vi sender dig et link til at nulstille din adgangskode.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  type="submit"
                  disabled={isPending}
                  className="mt-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {isPending ? "Sender..." : "Send nulstillingslink"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-brand-500 hover:text-brand-600">
            Tilbage til login
          </Link>
        </p>
      </div>
    </div>
  );
}
