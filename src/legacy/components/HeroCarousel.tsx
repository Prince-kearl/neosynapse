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

import heroHealth from "@/assets/hero-health-assistant.jpg";
import heroTele from "@/assets/hero-telemedicine.jpg";
import heroReports from "@/assets/hero-medical-reports.jpg";

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
    title: "AI Health Assistant",
    subtitle: "Ask health questions & get reliable guidance anytime.",
    image: heroHealth,
    bgColor: "from-primary/90 to-primary",
  },
  {
    id: "2",
    title: "Telemedicine",
    subtitle: "Connect with certified doctors from the comfort of home.",
    image: heroTele,
    bgColor: "from-secondary to-accent",
  },
  {
    id: "3",
    title: "Medical Reports",
    subtitle: "Track your health data and get AI-powered insights.",
    image: heroReports,
    bgColor: "from-accent to-primary/80",
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

  const firstName = user?.email?.split("@")[0] || "User";

  return (
    <section className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-sm">Hello {firstName}</p>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          How are you feeling today?
        </h1>
      </div>

      {/* Carousel */}
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: true }}
        plugins={[
          Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {promoSlides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-2 md:pl-4">
              <div className="bg-card rounded-2xl overflow-hidden relative h-40 lg:h-48">
                <div className="flex h-full">
                  {/* Image */}
                  <div className="w-1/2 relative">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to right, transparent 20%, hsl(215, 25%, 15%) 100%)`,
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="w-1/2 p-4 lg:p-6 flex flex-col justify-center">
                    <h3 className="font-display text-lg lg:text-xl font-bold mb-1 text-primary">
                      {slide.title}
                    </h3>
                    <p className="text-muted-foreground text-sm lg:text-base mb-3 line-clamp-2">
                      {slide.subtitle}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="w-fit bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full"
                    >
                      <Link to="/explore">Ask Now</Link>
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
