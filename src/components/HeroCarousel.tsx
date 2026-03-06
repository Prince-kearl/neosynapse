import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

// Import food images
import foodJollof from "@/assets/food-jollof.jpg";
import foodWaakye from "@/assets/food-waakye.jpg";
import foodBanku from "@/assets/food-banku.jpg";

interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  bgColor: string;
}

const promoSlides: PromoSlide[] = [
  {
    id: "1",
    title: "Our Best Seller!",
    subtitle: "Loved by thousands, now it's your turn!",
    image: foodJollof,
    bgColor: "bg-primary",
  },
  {
    id: "2",
    title: "Fresh & Local",
    subtitle: "Authentic Ghanaian flavors delivered hot!",
    image: foodWaakye,
    bgColor: "bg-orange-500",
  },
  {
    id: "3",
    title: "Special Combo",
    subtitle: "Get more for less with our daily deals!",
    image: foodBanku,
    bgColor: "bg-amber-600",
  },
];

export function HeroCarousel() {
  const { user } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const firstName = user?.email?.split("@")[0] || "Friend";

  return (
    <section className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-sm">Hello {firstName}</p>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          What meal Do You Want?
        </h1>
      </div>

      {/* Carousel */}
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {promoSlides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-2 md:pl-4">
              <div
                className={`${slide.bgColor} rounded-2xl overflow-hidden relative h-40 lg:h-48`}
              >
                <div className="flex h-full">
                  {/* Image with gradient fade */}
                  <div className="w-1/2 relative">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Gradient overlay for smooth blend */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-current"
                      style={{ 
                        background: `linear-gradient(to right, transparent 30%, ${
                          slide.bgColor === 'bg-primary' ? 'hsl(142, 50%, 38%)' :
                          slide.bgColor === 'bg-orange-500' ? 'hsl(25, 95%, 53%)' :
                          'hsl(32, 95%, 44%)'
                        } 100%)` 
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="w-1/2 p-4 lg:p-6 flex flex-col justify-center text-white">
                    <h3 className="font-display text-lg lg:text-xl font-bold mb-1">
                      {slide.title}
                    </h3>
                    <p className="text-white/90 text-sm lg:text-base mb-3 line-clamp-2">
                      {slide.subtitle}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="w-fit bg-white text-foreground hover:bg-white/90 font-semibold"
                    >
                      <Link to="/explore">Order now</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/30"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
