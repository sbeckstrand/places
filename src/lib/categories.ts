import { Category } from "@/generated/prisma/enums";

export const CATEGORY_LABELS: Record<Category, string> = {
  FOOD: "Food",
  ENTERTAINMENT: "Entertainment",
  NATURE: "Nature",
  SHOP: "Shopping",
  OTHER: "Other",
};

export const CATEGORY_OPTIONS = Object.values(Category);
