import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Phone, Star, Clock, MessageCircle, Share2, Navigation, ChevronRight, Loader2, ShoppingBag, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMeal, getImageUrl } from "@/hooks/useMeals";
import { useCart } from "@/contexts/CartContext";

const MealDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  const { data: meal, isLoading, error } = useMeal(id);

  const handleAddToCart = () => {
    if (meal) {
      addToCart(meal, quantity);
      setQuantity(1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Meal not found</h1>
          <p className="text-muted-foreground mb-4">This meal might have been removed or doesn't exist.</p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const vendor = meal.vendor;

  const handleWhatsApp = () => {
    if (!vendor) return;
    const message = encodeURIComponent(`Hi! I'm interested in ordering ${meal.name} from ChowPoint.`);
    window.open(`https://wa.me/${vendor.phone.replace("+", "")}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    if (!vendor) return;
    window.open(`tel:${vendor.phone}`, "_self");
  };

  const handleDirections = () => {
    if (!vendor?.latitude || !vendor?.longitude) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`,
      "_blank"
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Hero Image Section */}
      <div className="relative">
        <div className="aspect-[4/3] lg:aspect-[21/9] w-full overflow-hidden">
          <img
            src={getImageUrl(meal.image_url)}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        {/* Floating Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-card/80 backdrop-blur-sm hover:bg-card w-10 h-10 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-card/80 backdrop-blur-sm hover:bg-card w-10 h-10 rounded-full"
            >
              <Share2 className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSaved(!isSaved)}
              className={cn(
                "bg-card/80 backdrop-blur-sm hover:bg-card w-10 h-10 rounded-full",
                isSaved && "text-accent"
              )}
            >
              <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
            </Button>
          </div>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8">
          <div className="price-badge text-lg lg:text-xl px-4 py-2">
            GHS {Number(meal.price)}
            {meal.original_price && (
              <span className="ml-2 text-sm line-through opacity-70">
                GHS {Number(meal.original_price)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-8 pb-32 lg:pb-8 -mt-8 relative z-10 max-w-4xl mx-auto">
        {/* Main Info Card */}
        <div className="bg-card rounded-2xl p-5 lg:p-6 shadow-food-card mb-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {meal.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Title & Rating */}
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {meal.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-star text-star" />
              <span className="font-medium text-foreground">{Number(meal.rating)}</span>
              <span>({vendor?.total_reviews || 0} reviews)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>15-20 min</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-distance" />
              <span>0.5km</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {meal.description || "Delicious meal prepared fresh daily."}
          </p>
        </div>

        {/* Vendor Card - Clickable */}
        {vendor && (
          <div 
            onClick={() => navigate(`/vendor/${vendor.id}`)}
            className="bg-card rounded-2xl p-5 lg:p-6 shadow-food-card mb-4 cursor-pointer hover:shadow-food-card-hover transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Vendor Info</h2>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary">
                  {vendor.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Star className="w-3.5 h-3.5 fill-star text-star" />
                  <span>{Number(vendor.rating)}</span>
                  <span>•</span>
                  <span>{vendor.total_orders.toLocaleString()}+ orders</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-distance" />
                  <span>{vendor.address}</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-primary mt-3 font-medium">View full menu & reviews →</p>
          </div>
        )}

        {/* Map Preview Card */}
        {vendor?.latitude && vendor?.longitude && (
          <div className="bg-card rounded-2xl overflow-hidden shadow-food-card mb-4">
            <div className="p-5 lg:p-6 pb-3">
              <h2 className="font-display text-lg font-semibold">Location</h2>
            </div>
            {/* Static Map Preview */}
            <div className="relative aspect-[16/9] bg-muted">
              <iframe
                title="Vendor Location"
                src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${vendor.longitude}!3d${vendor.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sgh!4v1234567890`}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              {/* Directions Overlay Button */}
              <Button
                onClick={handleDirections}
                className="absolute bottom-4 right-4 bg-card hover:bg-card/90 text-foreground shadow-lg gap-2"
              >
                <Navigation className="w-4 h-4" />
                Get Directions
              </Button>
            </div>
          </div>
        )}

        {/* Desktop Action Buttons */}
        <div className="hidden lg:flex gap-4">
          <div className="flex items-center gap-3 border border-border rounded-xl px-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-semibold w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleAddToCart}
            size="lg"
            className="flex-1 h-14 text-base gap-3 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <ShoppingBag className="w-5 h-5" />
            Add to Cart • GHS {(Number(meal.price) * quantity).toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Mobile Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 lg:hidden safe-area-bottom z-50">
        <div className="flex gap-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2 border border-border rounded-xl px-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-semibold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleAddToCart}
            size="lg"
            className="flex-1 h-12 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <ShoppingBag className="w-5 h-5" />
            Add • GHS {(Number(meal.price) * quantity).toFixed(2)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MealDetail;
