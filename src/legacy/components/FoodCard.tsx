import { Heart, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FoodCardProps {
  id: string;
  name: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  distance: string;
  rating: number;
  image: string;
  tags?: string[];
  isSaved?: boolean;
  onSave?: (id: string) => void;
  onOrder?: (id: string) => void;
}

export function FoodCard({
  id,
  name,
  vendor,
  price,
  originalPrice,
  distance,
  rating,
  image,
  tags = [],
  isSaved = false,
  onSave,
  onOrder,
}: FoodCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/meal/${id}`);
  };

  return (
    <div className="food-card group animate-slide-in cursor-pointer" onClick={handleCardClick}>
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave?.(id);
          }}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
            isSaved
              ? "bg-accent text-accent-foreground"
              : "bg-card/80 backdrop-blur-sm text-muted-foreground hover:bg-card hover:text-accent"
          )}
        >
          <Heart className={cn("w-4 h-4", isSaved && "fill-current")} />
        </button>

        {/* Distance Badge */}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1">
          <MapPin className="w-3 h-3 text-distance" />
          <span>{distance}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Name & Vendor */}
        <div>
          <h3 className="font-display font-semibold text-card-foreground line-clamp-1">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">{vendor}</p>
        </div>

        {/* Price & Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-price">
              GHS {price}
            </span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                GHS {originalPrice}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="w-4 h-4 fill-star text-star" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(id);
            }}
          >
            Wishlist
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onOrder?.(id);
            }}
          >
            Order Now
          </Button>
        </div>
      </div>
    </div>
  );
}
