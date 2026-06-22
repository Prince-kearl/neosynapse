import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  label?: string;
};

export function BrandMark({ className, label = "Neo Synapse" }: BrandMarkProps) {
  return (
    <span
      className={cn("relative block h-10 w-10 shrink-0 overflow-hidden rounded-md", className)}
      role="img"
      aria-label={label}
    >
      <img
        src="/favicon.ico"
        alt={label}
        className="h-full w-full object-contain"
        loading="eager"
        decoding="sync"
        onError={(event) => {
          const target = event.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.classList.add("bg-primary/15", "border", "border-primary/30");
            parent.setAttribute("aria-label", `${label} logo fallback`);
          }
        }}
      />
    </span>
  );
}
