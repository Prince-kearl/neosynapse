import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
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

interface HeroCarouselProps {
  displayName?: string;
}

export function HeroCarousel({ displayName = "there" }: HeroCarouselProps) {
  // Add missing state and handlers for pagination
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const count = promoSlides.length;
  const firstName = displayName.trim().split(/\s+/)[0] || "there";

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap() || 0);
    api.on("select", () => setCurrent(api.selectedScrollSnap() || 0));
  }, [api]);

  return (
    <section className="space-y-4 max-[640px]:space-y-3 max-[480px]:space-y-2.5">
      {/* Greeting */}
      <div>
        <p className="text-sm text-muted-foreground max-[640px]:text-xs">Hello {firstName}</p>
        <h1 className="break-words font-display text-xl font-bold text-foreground lg:text-2xl max-[640px]:text-[1.6rem] max-[640px]:leading-[1.08] max-[480px]:text-[1.24rem] max-[480px]:leading-[1.1] max-[380px]:text-[1.14rem]">
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
        <CarouselContent className="-ml-2 md:-ml-4 max-[820px]:ml-0">
          {promoSlides.map((slide) => (
            <CarouselItem key={slide.id} className="pl-2 md:pl-4 max-[820px]:pl-0">
              <div
                className="relative flex h-[180px] w-full items-stretch overflow-hidden rounded-2xl bg-gradient-to-br from-[#63C88F] to-[#53B67B] p-0 sm:h-[200px] md:h-[190px] max-[820px]:h-[460px] max-[820px]:rounded-[30px] max-[640px]:h-[210px] max-[520px]:h-[178px] max-[480px]:h-[156px]"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary) / 0.72), hsl(var(--accent) / 0.88))",
                }}
              >
                {/* Image on the left */}
                <div className="relative h-full w-[46%] shrink-0 sm:w-[45%] max-[820px]:w-[53%] max-[640px]:w-[50%] max-[480px]:w-[49%]">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                    style={{
                      maskImage: 'linear-gradient(to right, black 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.15) 82%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to right, black 40%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.15) 82%, transparent 100%)',
                    }}
                  />
                </div>
                {/* Content on the right */}
                <div className="z-10 flex flex-1 flex-col justify-center px-4 py-3 sm:px-5 sm:py-4 max-[820px]:justify-center max-[820px]:px-7 max-[820px]:py-6 max-[640px]:px-3 max-[640px]:py-2 max-[480px]:px-2.5 max-[480px]:py-1.5">
                  <h3 className="mb-1 font-display text-2xl font-semibold leading-tight text-primary-foreground md:text-xl max-[820px]:text-[clamp(2.2rem,5.6vw,3.9rem)] max-[820px]:leading-[1.04] max-[640px]:text-[clamp(0.82rem,3.5vw,1.4rem)] max-[640px]:leading-tight">
                    {slide.title}
                  </h3>
                  <p className="mb-3 max-w-full break-words text-base leading-snug text-primary-foreground/90 md:text-base max-[820px]:mb-5 max-[820px]:max-w-[310px] max-[820px]:text-[clamp(1.25rem,3.8vw,2.5rem)] max-[820px]:leading-[1.15] max-[640px]:mb-2 max-[640px]:max-w-[220px] max-[640px]:text-[0.95rem] max-[640px]:leading-tight max-[520px]:max-w-[180px] max-[520px]:text-[0.85rem] max-[480px]:max-w-[160px] max-[480px]:text-[0.75rem]">
                    {slide.subtitle}
                  </p>
                  <Link
                    to={slide.buttonLink}
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-[#2B2B2B] px-5 py-2 text-base text-white md:px-4 md:py-2 md:text-[14px] max-[820px]:gap-3 max-[820px]:px-5 max-[820px]:py-3 max-[820px]:text-[clamp(1.05rem,3.2vw,2rem)] max-[640px]:gap-2 max-[640px]:px-3.5 max-[640px]:py-1.5 max-[640px]:text-[0.95rem] max-[520px]:px-3 max-[520px]:py-1.25 max-[520px]:text-[0.82rem] max-[480px]:gap-1.5 max-[480px]:px-2.5 max-[480px]:py-1 max-[480px]:text-[0.72rem]"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#343230] ring-1 ring-[#4A453F] max-[820px]:h-12 max-[820px]:w-12 max-[640px]:h-7 max-[640px]:w-7 max-[520px]:h-6 max-[520px]:w-6 max-[480px]:h-5 max-[480px]:w-5">
                      <slide.icon className="h-4 w-4 max-[820px]:h-5 max-[820px]:w-5 max-[640px]:h-4 max-[640px]:w-4 max-[480px]:h-3 max-[480px]:w-3" />
                    </span>
                    {slide.buttonLabel}
                  </Link>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-2 max-[640px]:gap-1.5 max-[640px]:mt-1.5">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className="h-2 rounded-full transition-all duration-300 max-[820px]:h-3 max-[480px]:h-2"
            style={{
              width: index === current ? "24px" : "8px",
              backgroundColor: index === current ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)",
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
