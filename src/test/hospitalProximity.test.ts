import { describe, expect, it } from "vitest";
import {
  extractLocationSearchTerm,
  formatDistanceKm,
  getLocationCoordinates,
  haversineDistanceKm,
  rankHospitalsByDistance,
  resolvePresetOrHospitalSearch,
  shouldRequestCurrentLocationVerification,
} from "@/shared/lib/hospitalProximity";

describe("hospital proximity", () => {
  it("uses exact GPS coordinates for current location", () => {
    const gpsCoords = { lat: 5.6355, lng: -0.2154 };

    expect(getLocationCoordinates("Current Location", gpsCoords)).toEqual(gpsCoords);
  });

  it("requires GPS verification before using current-location hospital results", () => {
    expect(shouldRequestCurrentLocationVerification("Current Location", null)).toBe(true);
    expect(shouldRequestCurrentLocationVerification("Current Location", { lat: 5.6355, lng: -0.2154 })).toBe(false);
    expect(shouldRequestCurrentLocationVerification("Lapaz", null)).toBe(false);
  });

  it("ranks Lapaz Community Hospital before Achimota Hospital near Lapaz", () => {
    const lapazUserLocation = { lat: 5.6355, lng: -0.2154 };
    const ranked = rankHospitalsByDistance(lapazUserLocation);

    expect(ranked[0].name).toBe("Lapaz Community Hospital");
    expect(ranked.findIndex((hospital) => hospital.name === "Lapaz Community Hospital")).toBeLessThan(
      ranked.findIndex((hospital) => hospital.name === "Achimota Hospital")
    );
  });

  it("calculates realistic short distances and display labels", () => {
    const distance = haversineDistanceKm(
      { lat: 5.6355, lng: -0.2154 },
      { lat: 5.63542, lng: -0.21536 }
    );

    expect(distance).toBeLessThan(0.05);
    expect(formatDistanceKm(distance)).toMatch(/m$/);
  });

  it("resolves hospital name search to hospital coordinates", () => {
    const match = resolvePresetOrHospitalSearch("korle bu");

    expect(match).not.toBeNull();
    expect(match?.source).toBe("hospital");
    expect(match?.label).toBe("Korle Bu Teaching Hospital");
  });

  it("resolves preset location search to location coordinates", () => {
    const match = resolvePresetOrHospitalSearch("adabraka");

    expect(match).not.toBeNull();
    expect(match?.source).toBe("preset-location");
    expect(match?.label).toBe("Adabraka");
  });

  it("extracts location terms from natural-language hospital queries", () => {
    expect(extractLocationSearchTerm("closest hospital in oyarifa")).toBe("oyarifa");
    expect(extractLocationSearchTerm("nearest hospitals to adabraka")).toBe("adabraka");
    expect(extractLocationSearchTerm("hospital near tema?")).toBe("tema");
  });
});
