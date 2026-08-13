import { Category } from "@/generated/prisma/enums";

const MAX_RESULTS = 8;

export type GooglePlaceCandidate = {
  id: string;
  title: string;
  locationName: string;
  address: string;
  latitude: number;
  longitude: number;
  website: string | null;
  locationDescription: string | null;
  category: Category;
  // Opaque Places API photo resource name (e.g. "places/XXX/photos/YYY"),
  // not a real URL — the client fetches it through our own photo proxy so
  // the API key never reaches the browser. Null when the place has no photo.
  photoName: string | null;
};

// Maps a subset of Google's place types (see
// https://developers.google.com/maps/documentation/places/web-service/place-types)
// to our own Category enum. Not exhaustive — anything unmapped falls back to
// OTHER, which is what every place defaulted to before this existed.
const FOOD_TYPES = [
  "restaurant", "cafe", "bakery", "bar", "meal_takeaway", "meal_delivery",
  "fast_food_restaurant", "pizza_restaurant", "sandwich_shop", "coffee_shop",
  "ice_cream_shop", "dessert_shop", "breakfast_restaurant", "brunch_restaurant",
  "diner", "food_court", "wine_bar", "pub", "steak_house", "sushi_restaurant",
  "ramen_restaurant", "seafood_restaurant", "vegan_restaurant",
  "vegetarian_restaurant", "american_restaurant", "chinese_restaurant",
  "french_restaurant", "greek_restaurant", "indian_restaurant",
  "italian_restaurant", "japanese_restaurant", "korean_restaurant",
  "mexican_restaurant", "thai_restaurant", "vietnamese_restaurant",
  "mediterranean_restaurant", "middle_eastern_restaurant",
  "spanish_restaurant", "barbecue_restaurant", "brewery", "winery",
  "juice_shop", "bagel_shop", "donut_shop", "candy_store", "food",
];

const ENTERTAINMENT_TYPES = [
  "movie_theater", "night_club", "amusement_park", "amusement_center",
  "bowling_alley", "casino", "concert_hall", "event_venue", "karaoke",
  "stadium", "tourist_attraction", "zoo", "aquarium", "museum",
  "art_gallery", "performing_arts_theater", "water_park", "amphitheatre",
  "comedy_club", "video_arcade", "planetarium", "opera_house",
  "cultural_center", "dance_hall", "adventure_sports_center", "escape_room",
];

const NATURE_TYPES = [
  "park", "national_park", "state_park", "hiking_area", "campground",
  "camping_cabin", "rv_park", "wildlife_park", "wildlife_refuge",
  "botanical_garden", "garden", "marina", "beach",
];

const SHOP_TYPES = [
  "store", "shopping_mall", "clothing_store", "grocery_store", "supermarket",
  "convenience_store", "department_store", "book_store", "electronics_store",
  "furniture_store", "hardware_store", "home_goods_store", "jewelry_store",
  "liquor_store", "pet_store", "shoe_store", "sporting_goods_store", "market",
  "florist", "gift_shop", "discount_store", "warehouse_store", "wholesaler",
  "outlet_store", "farmers_market", "flea_market", "bicycle_store",
  "toy_store", "hobby_shop",
];

const CATEGORY_BY_GOOGLE_TYPE: Record<string, Category> = Object.fromEntries([
  ...FOOD_TYPES.map((t) => [t, Category.FOOD] as const),
  ...ENTERTAINMENT_TYPES.map((t) => [t, Category.ENTERTAINMENT] as const),
  ...NATURE_TYPES.map((t) => [t, Category.NATURE] as const),
  ...SHOP_TYPES.map((t) => [t, Category.SHOP] as const),
]);

function categoryFromGoogleTypes(
  primaryType: string | undefined,
  types: string[] | undefined,
): Category {
  if (primaryType && CATEGORY_BY_GOOGLE_TYPE[primaryType]) {
    return CATEGORY_BY_GOOGLE_TYPE[primaryType];
  }
  for (const t of types ?? []) {
    if (CATEGORY_BY_GOOGLE_TYPE[t]) return CATEGORY_BY_GOOGLE_TYPE[t];
  }
  return Category.OTHER;
}

// If the user pasted an already-resolved Google Maps place URL (e.g. by
// opening a share link themselves and copying the address bar), pull the
// name/coordinates out of it directly — no network request involved, just
// parsing text the browser already resolved for them.
// Shape: google.com/maps/place/Some+Place+Name/@37.78,-122.41,17z/...
function parseMapsPlaceUrl(input: string) {
  const placeMatch = input.match(/\/maps\/place\/([^/@]+)/);
  if (!placeMatch) return null;

  const name = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  const coordMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  return {
    name,
    latitude: coordMatch ? parseFloat(coordMatch[1]) : null,
    longitude: coordMatch ? parseFloat(coordMatch[2]) : null,
  };
}

export async function searchGooglePlaces(
  input: string,
): Promise<GooglePlaceCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places import isn't configured on this server");
  }

  const parsedUrl = parseMapsPlaceUrl(input);
  const query = parsedUrl?.name ?? input.trim();
  if (!query) {
    throw new Error("Enter a place name or paste a Google Maps link");
  }

  const body: Record<string, unknown> = {
    textQuery: query,
    pageSize: MAX_RESULTS,
  };
  if (parsedUrl?.latitude != null && parsedUrl?.longitude != null) {
    body.locationBias = {
      circle: {
        center: { latitude: parsedUrl.latitude, longitude: parsedUrl.longitude },
        radius: 300,
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.editorialSummary,places.photos,places.primaryType,places.types",
      },
      body: JSON.stringify(body),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Google Places API request failed (${res.status})`);
  }

  const data = await res.json();
  const places: unknown[] = data.places ?? [];

  return places
    .map((p): GooglePlaceCandidate | null => {
      const place = p as {
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        websiteUri?: string;
        editorialSummary?: { text?: string };
        photos?: { name?: string }[];
        primaryType?: string;
        types?: string[];
      };

      const latitude = place.location?.latitude;
      const longitude = place.location?.longitude;
      if (!place.id || latitude == null || longitude == null) return null;

      return {
        id: place.id,
        title: place.displayName?.text ?? query,
        locationName: place.displayName?.text ?? query,
        address: place.formattedAddress ?? "",
        latitude,
        longitude,
        website: place.websiteUri ?? null,
        locationDescription: place.editorialSummary?.text ?? null,
        category: categoryFromGoogleTypes(place.primaryType, place.types),
        photoName: place.photos?.[0]?.name ?? null,
      };
    })
    .filter((c): c is GooglePlaceCandidate => c !== null);
}

const PHOTO_NAME_PATTERN = /^places\/[\w-]+\/photos\/[\w-]+$/;

export async function fetchGooglePlacePhoto(
  photoName: string,
  maxWidthPx: number,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  if (!PHOTO_NAME_PATTERN.test(photoName)) {
    throw new Error("Invalid photo reference");
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places import isn't configured on this server");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}`,
      { headers: { "X-Goog-Api-Key": apiKey }, signal: controller.signal },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Google Photos request failed (${res.status})`);
  }

  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "image/jpeg",
  };
}
