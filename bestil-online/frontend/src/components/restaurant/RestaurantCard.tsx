import { Link } from "react-router-dom";
import { Star, Clock, Bike } from "lucide-react";
import type { RestaurantSummary } from "@/api/restaurants.api";

export default function RestaurantCard({ restaurant }: { restaurant: RestaurantSummary }) {
  return (
    <Link
      to={`/restaurants/${restaurant.slug}`}
      className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="h-40 bg-gradient-to-br from-brand-100 to-orange-100 relative">
        {restaurant.bannerUrl ? (
          <img src={restaurant.bannerUrl} alt={restaurant.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-30">🍽️</div>
        )}
        <div className="absolute bottom-3 left-3">
          {restaurant.logoUrl && (
            <img
              src={restaurant.logoUrl}
              alt=""
              className="h-12 w-12 rounded-xl border-2 border-white object-cover shadow"
            />
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
          {restaurant.name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500">{restaurant.cuisines.join(" · ")}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
            {restaurant.avgRating.toFixed(1)} ({restaurant.reviewCount})
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {restaurant.deliveryTimeMin} min
          </span>
          <span className="flex items-center gap-1">
            <Bike className="h-3.5 w-3.5" />
            {Number(restaurant.deliveryFee) === 0 ? "Gratis levering" : `${restaurant.deliveryFee} kr`}
          </span>
        </div>
      </div>
    </Link>
  );
}
