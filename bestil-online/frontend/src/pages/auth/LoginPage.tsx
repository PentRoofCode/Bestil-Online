import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";

const schema = z.object({
  email: z.string().email("Ugyldig email"),
  password: z.string().min(1, "Påkrævet"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => authApi.login(data),
    onSuccess: (res) => {
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      navigate(params.get("redirect") ?? "/");
    },
    onError: () => {
      setError("password", { message: "Forkert email eller adgangskode" });
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
          <h1 className="mb-6 text-xl font-bold text-gray-900">Log ind</h1>

          <form onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register("email")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Adgangskode</label>
              <input
                type="password"
                {...register("password")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isPending ? "Logger ind..." : "Log ind"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Ingen konto?{" "}
          <Link to="/register" className="font-medium text-brand-500 hover:text-brand-600">
            Opret konto
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-gray-400">
          <Link to="/forgot-password" className="hover:text-brand-500">
            Glemt adgangskode?
          </Link>
        </p>
      </div>
    </div>
  );
}
