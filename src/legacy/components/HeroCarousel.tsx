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
  return (
    <section className="space-y-4">
      {/* Greeting */}
      <div>
        <p className="text-muted-foreground text-sm">Hello {displayName}</p>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground break-words">
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
                className="relative overflow-hidden flex flex-col md:flex-row items-stretch md:items-center h-auto md:h-[190px] w-full rounded-2xl bg-gradient-to-br from-[#5FC88A] to-[#47A66C] p-0"
              >
                {/* Image on top for mobile, left for desktop */}
                <div className="relative w-full md:w-[45%] h-[120px] md:h-full shrink-0 flex items-center justify-center">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
                    style={{
                      maskImage: undefined,
                      WebkitMaskImage: undefined,
                    }}
                  />
                </div>
                {/* Content below image on mobile, right on desktop */}
                <div className="flex-1 flex flex-col justify-center px-4 py-4 z-10">
                  <h3 className="font-display font-semibold mb-1 text-lg md:text-xl text-[#1E1E1E] break-words">
                    {slide.title}
                  </h3>
                  <p className="mb-3 leading-snug text-[14px] md:text-base text-[#EAF7EF] max-w-full break-words">
                    {slide.subtitle}
                  </p>
                  <Link
                    to={slide.buttonLink}
                    className="inline-flex items-center gap-2 w-fit bg-[#2B2B2B] rounded-full px-4 py-2 text-[14px] text-white"
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
    </section>
  );
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
