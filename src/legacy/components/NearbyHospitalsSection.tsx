import { Hospital, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const hospitals = [
  { id: "1", name: "Korle Bu Teaching Hospital", distance: "2.3 km", status: "Open" },
  { id: "2", name: "37 Military Hospital", distance: "4.1 km", status: "Open" },
  { id: "3", name: "Ridge Hospital", distance: "5.7 km", status: "Open" },
];

export function NearbyHospitalsSection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg lg:text-xl font-semibold">
          Nearby Hospitals
        </h2>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
          <MapPin className="w-4 h-4 text-primary" />
          Achimota
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>

      {/* Hospital Cards */}
      <div className="space-y-3 mb-4">
        {hospitals.map((hospital) => (
          <div
            key={hospital.id}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 hover:border-primary/30 transition-all duration-200 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Hospital className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{hospital.name}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{hospital.distance}</span>
                <span className="text-primary text-xs font-medium">● {hospital.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Map Placeholder */}
      <div className="bg-card rounded-2xl overflow-hidden border border-border h-48 lg:h-64 relative">
        <iframe
          title="Nearby Hospitals Map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d127066.27758!2d-0.2628725!3d5.6037168!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf9084b2b7a773%3A0xbed14ed8650e2dd3!2sAccra%2C%20Ghana!5e0!3m2!1sen!2sus!4v1"
          className="w-full h-full border-0 opacity-80"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
