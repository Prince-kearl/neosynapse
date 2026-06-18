export type Coordinates = {
  lat: number;
  lng: number;
};

export type HospitalFacility = Coordinates & {
  id: string;
  name: string;
  status: "Open" | "Unknown";
  address: string;
  phone?: string;
};

export type RankedHospital = HospitalFacility & {
  distance: number;
};

export const ACCRA_LOCATION_COORDINATES: Record<string, Coordinates> = {
  Achimota: { lat: 5.62983, lng: -0.2172 },
  "Lapaz": { lat: 5.6082, lng: -0.2567 },
  "New Achimota": { lat: 5.6323, lng: -0.2429 },
  "East Legon": { lat: 5.6521, lng: -0.1736 },
  Osu: { lat: 5.5459, lng: -0.189 },
  Labone: { lat: 5.5616, lng: -0.1834 },
  Cantonments: { lat: 5.5567, lng: -0.1847 },
  "Airport City": { lat: 5.6054, lng: -0.1663 },
  Madina: { lat: 5.6839, lng: -0.1685 },
  Tema: { lat: 5.658, lng: 0.0159 },
  Spintex: { lat: 5.6102, lng: -0.1186 },
  Dansoman: { lat: 5.584, lng: -0.2841 },
  Kaneshie: { lat: 5.5713, lng: -0.2341 },
  Adabraka: { lat: 5.5587, lng: -0.2058 },
};

export const ACCRA_HOSPITALS: HospitalFacility[] = [
  {
    id: "lapaz-community-hospital",
    name: "Lapaz Community Hospital",
    lat: 5.63542,
    lng: -0.21536,
    status: "Open",
    address: "Anorhuma Street, Lapaz, Accra",
    phone: "054 019 2894",
  },
  {
    id: "achimota-hospital",
    name: "Achimota Hospital",
    lat: 5.62983,
    lng: -0.2172,
    status: "Open",
    address: "Aggrey Street, Achimota, Accra",
    phone: "030 240 0212",
  },
  {
    id: "ga-north-municipal-hospital",
    name: "Ga North Municipal Hospital",
    lat: 5.6622,
    lng: -0.2806,
    status: "Open",
    address: "Ofankor, Accra",
  },
  {
    id: "nyaho-medical-centre",
    name: "Nyaho Medical Centre",
    lat: 5.6045,
    lng: -0.1794,
    status: "Open",
    address: "Airport Residential Area, Accra",
  },
  {
    id: "ridge-hospital",
    name: "Greater Accra Regional Hospital",
    lat: 5.5554,
    lng: -0.2003,
    status: "Open",
    address: "Castle Road, Ridge, Accra",
  },
  {
    id: "37-military-hospital",
    name: "37 Military Hospital",
    lat: 5.5885,
    lng: -0.1832,
    status: "Open",
    address: "Liberation Road, Accra",
  },
  {
    id: "korle-bu-teaching-hospital",
    name: "Korle Bu Teaching Hospital",
    lat: 5.5385,
    lng: -0.2279,
    status: "Open",
    address: "Korle Bu, Accra",
  },
  {
    id: "la-general-hospital",
    name: "La General Hospital",
    lat: 5.5606,
    lng: -0.1649,
    status: "Open",
    address: "La, Accra",
  },
  {
    id: "tema-general-hospital",
    name: "Tema General Hospital",
    lat: 5.6698,
    lng: 0.0166,
    status: "Open",
    address: "Tema, Greater Accra",
  },
];

const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export const isValidCoordinates = (coords: Coordinates | null | undefined): coords is Coordinates =>
  typeof coords?.lat === "number" &&
  typeof coords?.lng === "number" &&
  Number.isFinite(coords.lat) &&
  Number.isFinite(coords.lng) &&
  Math.abs(coords.lat) <= 90 &&
  Math.abs(coords.lng) <= 180;

export const haversineDistanceKm = (from: Coordinates, to: Coordinates) => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const getLocationCoordinates = (location: string, gpsCoords?: Coordinates | null): Coordinates => {
  if (location === "Current Location" && isValidCoordinates(gpsCoords)) {
    return gpsCoords;
  }

  return ACCRA_LOCATION_COORDINATES[location] || ACCRA_LOCATION_COORDINATES.Achimota;
};

export const shouldRequestCurrentLocationVerification = (
  location: string,
  gpsCoords?: Coordinates | null
) => location === "Current Location" && !isValidCoordinates(gpsCoords);

export const rankHospitalsByDistance = (
  center: Coordinates,
  hospitals: HospitalFacility[] = ACCRA_HOSPITALS
): RankedHospital[] =>
  hospitals
    .map((hospital) => ({
      ...hospital,
      distance: haversineDistanceKm(center, hospital),
    }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));

export const formatDistanceKm = (distance: number) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }

  return `${distance.toFixed(1)} km`;
};
