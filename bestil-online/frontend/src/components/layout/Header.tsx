import { ShoppingBag } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="/" className="flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-brand-500" />
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Bestil <span className="text-brand-500">Online</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
          <a href="/login" className="hover:text-brand-500 transition-colors">
            Log ind
          </a>
          <a
            href="/register"
            className="rounded-lg bg-brand-500 px-4 py-2 text-white hover:bg-brand-600 transition-colors"
          >
            Opret konto
          </a>
        </nav>
      </div>
    </header>
  );
}
