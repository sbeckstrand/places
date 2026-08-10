export type GeocodeResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

export async function searchLocation(query: string): Promise<GeocodeResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "foodie-app (self-hosted food blog, dev instance)",
      "Accept-Language": "en",
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;

  return data.map((d) => ({
    displayName: d.display_name,
    latitude: parseFloat(d.lat),
    longitude: parseFloat(d.lon),
  }));
}
