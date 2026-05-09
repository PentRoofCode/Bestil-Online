import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  firstName: z.string().min(1, "Påkrævet"),
  lastName: z.string().min(1, "Påkrævet"),
  email: z.string().email("Ugyldig email"),
  password: z.string().min(8, "Mindst 8 tegn"),
  role: z.enum(["CUSTOMER", "RESTAURANT_OWNER"]),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: "CUSTOMER" } });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      await authApi.register(data);
      return authApi.login({ email: data.email, password: data.password });
    },
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      navigate("/");
    },
    onError: (err: { response?: { data?: { error?: { message?: string } } } }) => {
      const msg = err.response?.data?.error?.message ?? "Registrering fejlede";
      setError("email", { message: msg });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <ShoppingBag className="h-8 w-8 text-brand-500" />
          <span className="text-2xl font-bold">Bestil Online</span>
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-xl font-bold">Opret konto</h1>

          <form onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fornavn</label>
                <input
                  {...register("firstName")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Efternavn</label>
                <input
                  {...register("lastName")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register("email")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Adgangskode</label>
              <input
                type="password"
                {...register("password")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Kontoetype</label>
              <select
                {...register("role")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
              >
                <option value="CUSTOMER">Kunde</option>
                <option value="RESTAURANT_OWNER">Restaurantejer</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isPending ? "Opretter..." : "Opret konto"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Har du allerede en konto?{" "}
          <Link to="/login" className="font-medium text-brand-500 hover:text-brand-600">
            Log ind
          </Link>
        </p>
      </div>
    </div>
  );
}
