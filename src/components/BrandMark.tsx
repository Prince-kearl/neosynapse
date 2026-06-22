import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  label?: string;
};

export function BrandMark({ className, label = "Neo Synapse" }: BrandMarkProps) {
  // Use window.location.origin to ensure proper URL resolution in both web and mobile (Capacitor) contexts
  const logoUrl = `${window.location.origin}/favicon.ico`;

  return (
    <span
      className={cn("relative block h-10 w-10 shrink-0 overflow-hidden rounded-md", className)}
      role="img"
      aria-label={label}
    >
      <img
        src={logoUrl}
        alt={label}
        className="h-full w-full object-contain"
        loading="eager"
        decoding="sync"
        onError={(event) => {
          const target = event.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent) {
            parent.classList.add("bg-primary/15", "border", "border-primary/30", "text-primary", "font-semibold", "grid", "place-items-center");
            parent.textContent = "N";
            parent.setAttribute("aria-label", `${label} logo fallback`);
          }
        }}
      />
    </span>
  );
}
