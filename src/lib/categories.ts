import { Category } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<Category, string> = {
  FOOD: "Food",
  ENTERTAINMENT: "Entertainment",
  NATURE: "Nature",
  SHOP: "Shopping",
  OTHER: "Other",
};

export const CATEGORY_OPTIONS = Object.values(Category);

// Individual map-pin colors per category (see MapView's "unclustered-point"
// layer). Clusters keep their own separate blue gradient, since a cluster
// can mix categories.
export const CATEGORY_MAP_COLORS: Record<Category, string> = {
  FOOD: "#ef4444",
  ENTERTAINMENT: "#f97316",
  NATURE: "#22c55e",
  SHOP: "#3b82f6",
  OTHER: "#a3a3a3",
};
