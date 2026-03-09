import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Star, Clock, MessageCircle, Share2, Navigation, Heart, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useVendor, useVendorMeals, useVendorReviews } from "@/hooks/useVendors";
import { getImageUrl } from "@/hooks/useMeals";
import { formatDistanceToNow } from "date-fns";
import { useVendorFollow } from "@/hooks/useVendorFollow";

const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useVendor(id);
  const { data: meals = [], isLoading: mealsLoading } = useVendorMeals(id);
  const { data: reviews = [], isLoading: reviewsLoading } = useVendorReviews(id);
  const { isFollowing, toggleFollow, isToggling } = useVendorFollow(id);

  if (vendorLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (vendorError || !vendor) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Vendor not found</h1>
          <p className="text-muted-foreground mb-4">This vendor might have been removed or doesn't exist.</p>
          <Button onClick={() => navigate("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hi! I found you on ChowPoint and would like to place an order.`);
    window.open(`https://wa.me/${vendor.phone.replace("+", "")}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open(`tel:${vendor.phone}`, "_self");
  };

  const handleDirections = () => {
    if (!vendor.latitude || !vendor.longitude) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`,
      "_blank"
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
              star <= rating ? "fill-star text-star" : "fill-muted text-muted"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-semibold text-foreground truncate px-2">
            {vendor.name}
          </h1>
          <Button variant="ghost" size="icon" className="w-10 h-10">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Vendor Info Card */}
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl p-5 lg:p-6 shadow-food-card mb-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl lg:text-4xl font-bold text-primary">
                {vendor.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl lg:text-2xl font-bold text-foreground mb-1">
                {vendor.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Star className="w-4 h-4 fill-star text-star" />
                <span className="font-medium text-foreground">{Number(vendor.rating)}</span>
                <span>({vendor.total_reviews} reviews)</span>
                <span>•</span>
                <span>{vendor.total_orders.toLocaleString()}+ orders</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vendor.categories?.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mb-4">{vendor.description}</p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-distance flex-shrink-0" />
              <span>{vendor.address}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Open: {vendor.open_hours || "Contact for hours"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span>{vendor.phone}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-5">
            <Button
              variant={isFollowing ? "secondary" : "outline"}
              className="flex-1 gap-2"
              onClick={toggleFollow}
              disabled={isToggling}
            >
              <Heart className={cn("w-4 h-4", isFollowing && "fill-current text-accent")} />
              {isToggling ? "..." : isFollowing ? "Following" : "Follow"}
            </Button>
            <Button
              onClick={handleWhatsApp}
              className="flex-1 gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="menu" className="mb-6">
          <TabsList className="bg-muted w-full">
            <TabsTrigger value="menu" className="flex-1">Menu</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
            <TabsTrigger value="location" className="flex-1">Location</TabsTrigger>
          </TabsList>

          {/* Menu Tab */}
          <TabsContent value="menu" className="mt-4 space-y-3">
            <h3 className="font-display text-lg font-semibold">
              Menu ({meals.length} items)
            </h3>
            {mealsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : meals.length > 0 ? (
              meals.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/meal/${item.id}`)}
                  className="bg-card rounded-xl p-3 shadow-food-card flex gap-4 cursor-pointer hover:shadow-food-card-hover transition-all duration-300"
                >
                  <img
                    src={getImageUrl(item.image_url)}
                    alt={item.name}
                    className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1">{item.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-price">GHS {Number(item.price)}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="w-3.5 h-3.5 fill-star text-star" />
                        <span>{Number(item.rating)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No menu items yet</p>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">
                Customer Reviews
              </h3>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-star text-star" />
                <span className="font-bold text-foreground">{Number(vendor.rating)}</span>
                <span className="text-sm text-muted-foreground">
                  ({vendor.total_reviews})
                </span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-card rounded-xl p-4 shadow-food-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <Users className="w-5 h-5 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Customer</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-muted-foreground text-sm">{review.comment}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No reviews yet</p>
            )}

            {reviews.length > 0 && (
              <Button variant="outline" className="w-full">
                Load More Reviews
              </Button>
            )}
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="mt-4 space-y-4">
            <h3 className="font-display text-lg font-semibold">
              Find Us
            </h3>
            
            {/* Map */}
            {vendor.latitude && vendor.longitude ? (
              <div className="bg-card rounded-2xl overflow-hidden shadow-food-card">
                <div className="relative aspect-video bg-muted">
                  <iframe
                    title="Vendor Location"
                    src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${vendor.longitude}!3d${vendor.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sgh!4v1234567890`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="p-4">
                  <p className="text-foreground font-medium mb-1">{vendor.name}</p>
                  <p className="text-sm text-muted-foreground mb-4">{vendor.address}</p>
                  <Button onClick={handleDirections} className="w-full gap-2">
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Location not available</p>
            )}

            {/* Contact Card */}
            <div className="bg-card rounded-2xl p-4 shadow-food-card">
              <h4 className="font-semibold text-foreground mb-3">Contact</h4>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleCall}>
                  <Phone className="w-4 h-4" />
                  Call
                </Button>
                <Button
                  className="flex-1 gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white"
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorProfile;
