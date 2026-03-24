import { Hospital, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const hospitals = [
  { id: "1", name: "Korle Bu Teaching Hospital", lat: 5.5600, lng: -0.1750, status: "Open" },
  { id: "2", name: "37 Military Hospital", lat: 5.5571, lng: -0.1688, status: "Open" },
  { id: "3", name: "Ridge Hospital", lat: 5.5554, lng: -0.2003, status: "Open" },
  { id: "4", name: "Achimota Hospital", lat: 5.6402, lng: -0.2505, status: "Open" },
  { id: "5", name: "La General Hospital", lat: 5.5795, lng: -0.1702, status: "Open" },
];

const locationCoordinates: Record<string, { lat: number; lng: number }> = {
  Achimota: { lat: 5.6397, lng: -0.2443 },
  "East Legon": { lat: 5.6521, lng: -0.1736 },
  Osu: { lat: 5.5459, lng: -0.1890 },
  Labone: { lat: 5.5616, lng: -0.1834 },
  Cantonments: { lat: 5.5567, lng: -0.1847 },
  "Airport City": { lat: 5.6054, lng: -0.1663 },
  Madina: { lat: 5.6839, lng: 0.0449 },
  Tema: { lat: 5.6580, lng: 0.0159 },
  Spintex: { lat: 5.6102, lng: 0.0713 },
  Dansoman: { lat: 5.5840, lng: -0.2841 },
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface NearbyHospitalsSectionProps {
  location: string;
  radius: number;
}

export function NearbyHospitalsSection({ location, radius }: NearbyHospitalsSectionProps) {
  const center = locationCoordinates[location] || locationCoordinates.Achimota;
  const withDistance = hospitals
    .map((hospital) => {
      const distance = haversineDistance(center.lat, center.lng, hospital.lat, hospital.lng);
      return { ...hospital, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  const filtered = withDistance.filter((hospital) => hospital.distance <= radius);
  const chosen = filtered.length > 0 ? filtered : withDistance.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg lg:text-xl font-semibold">
          Nearby Hospitals ({location}, within {radius} km)
        </h2>
        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" disabled>
          <MapPin className="w-4 h-4 text-primary" />
          {location}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>

      {/* Hospital Cards */}
      <div className="space-y-3 mb-4">
        {chosen.map((hospital) => (
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
                <span>{hospital.distance.toFixed(1)} km</span>
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
