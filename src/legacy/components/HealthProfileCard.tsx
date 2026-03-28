import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface HealthProfileCardProps {
  completionPercent?: number;
}

export function HealthProfileCard({ completionPercent = 66 }: HealthProfileCardProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="bg-gradient-to-b from-card to-card/95 rounded-2xl p-6 border border-border/20 shadow-lg shadow-black/5 dark:shadow-black/20">
      <div className="flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-bold text-xl sm:text-2xl text-primary">
            {completionPercent}%
          </span>
        </div>
        {/* Text & Button */}
        <div className="flex-1 flex flex-col gap-2 items-center sm:items-start text-center sm:text-left">
          <div className="font-semibold text-base sm:text-lg text-foreground break-words">Health Profile Completion</div>
          <div className="text-muted-foreground text-sm mb-2 break-words">
            Complete your health profile for better care.
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link to="/patient/profile">
              Complete Profile
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
