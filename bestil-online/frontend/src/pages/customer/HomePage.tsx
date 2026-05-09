import Header from "@/components/layout/Header";
import { UtensilsCrossed, Clock, CreditCard } from "lucide-react";

const features = [
  {
    icon: UtensilsCrossed,
    title: "Hundredevis af retter",
    description: "Vælg fra et bredt udvalg af restauranter og køkkener i dit område.",
  },
  {
    icon: Clock,
    title: "Hurtig levering",
    description: "Spor din ordre i realtid og få maden leveret hurtigt til din dør.",
  },
  {
    icon: CreditCard,
    title: "Sikker betaling",
    description: "Betal nemt og sikkert med kort via vores krypterede betalingsløsning.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-50 to-orange-100 px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Mad leveret til din dør
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Bestil fra dine yndlingsrestauranter og få maden leveret hurtigt og nemt.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <input
                type="text"
                placeholder="Indtast din adresse..."
                className="w-full rounded-xl border border-gray-200 px-5 py-3.5 text-sm shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-80"
              />
              <button className="w-full rounded-xl bg-brand-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors sm:w-auto">
                Find restauranter
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              Hvorfor vælge Bestil Online?
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl border border-gray-100 p-8 shadow-sm">
                  <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-3">
                    <Icon className="h-6 w-6 text-brand-500" />
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coming soon banner */}
        <section className="bg-brand-500 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
              Kommer snart
            </p>
            <h2 className="mt-2 text-3xl font-bold">Vi er næsten klar!</h2>
            <p className="mt-4 opacity-80">
              Restauranter og menuer er ved at blive tilføjet. Vend tilbage snart.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
