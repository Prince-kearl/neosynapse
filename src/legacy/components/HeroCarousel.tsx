import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/auth/hooks/useUserRole";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Bot, Stethoscope, Video } from "lucide-react";

import heroAI from "@/assets/hero-ai-assistant.png";
import heroSymptom from "@/assets/hero-symptom-checker.png";
import heroTele from "@/assets/hero-telemedicine.png";

interface PromoSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  buttonLabel: string;
  buttonLink: string;
  icon: React.ElementType;
}

const promoSlides: PromoSlide[] = [
  {
    id: "1",
    title: "AI Health Assistant",
    subtitle: "Ask health questions & get reliable guidance anytime.",
    image: heroAI,
    buttonLabel: "Ask Now",
    buttonLink: "/patient/ai-assistant",
    icon: Bot,
  },
  {
    id: "2",
    title: "Symptom Checker",
    subtitle: "Analyze your symptoms and get possible health insights.",
    image: heroSymptom,
    buttonLabel: "Check Symptoms",
    buttonLink: "/patient/symptom-checker",
    icon: Stethoscope,
  },
  {
    id: "3",
    title: "Telemedicine",
    subtitle: "Speak with a doctor through secure video consultation.",
    image: heroTele,
    buttonLabel: "Start Consultation",
    buttonLink: "/patient/telemedicine",
    icon: Video,
  },
];

export function HeroCarousel() {
  const { user } = useAuth();
  const { profile } = useUserRole();
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

  const displayName =
    profile?.full_name || profile?.display_name || user?.email?.split("@")[0] || "there";

  return (
    <section className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-sm">Hello {displayName}</p>
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
              <div
                className="relative overflow-hidden flex items-center h-[170px] lg:h-[190px]"
                style={{
                  background: "linear-gradient(135deg, #5FC88A, #47A66C)",
                  borderRadius: "28px",
                  padding: "0",
                }}
              >
                {/* Left: Image with fade mask */}
                <div className="relative w-[45%] h-full shrink-0">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ borderRadius: "28px 0 0 28px" }}
                  />
                  {/* Gradient fade from image into green card */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to right, transparent 30%, #5FC88A 95%)",
                    }}
                  />
                  {/* Circular/oval soft mask */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(ellipse 70% 80% at 30% 50%, transparent 50%, #5FC88A 100%)",
                    }}
                  />
                </div>

                {/* Right: Content */}
                <div className="flex-1 flex flex-col justify-center pr-5 pl-2 py-4 z-10">
                  <h3
                    className="font-display font-semibold mb-1"
                    style={{ fontSize: "20px", color: "#1E1E1E" }}
                  >
                    {slide.title}
                  </h3>
                  <p
                    className="mb-3 leading-snug"
                    style={{
                      fontSize: "14px",
                      color: "#EAF7EF",
                      maxWidth: "220px",
                    }}
                  >
                    {slide.subtitle}
                  </p>
                  <Link
                    to={slide.buttonLink}
                    className="inline-flex items-center gap-2 w-fit"
                    style={{
                      background: "#2B2B2B",
                      borderRadius: "999px",
                      padding: "10px 18px",
                      fontSize: "14px",
                      color: "#ffffff",
                    }}
                  >
                    <slide.icon className="w-4 h-4" />
                    {slide.buttonLabel}
                  </Link>
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
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: index === current ? "24px" : "8px",
              backgroundColor: index === current ? "#22C55E" : "rgba(161,161,170,0.3)",
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
