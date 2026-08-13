import { z } from "zod";
import { Category } from "@/generated/prisma/enums";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const entryPhotoSchema = z.object({
  storageKey: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const entryInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: optionalText(5000),
  locationDescription: optionalText(2000),
  locationName: optionalText(200),
  address: optionalText(300),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  website: z
    .string()
    .url()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  visitedAt: z.coerce.date(),
  category: z.enum(Category).default("OTHER"),
  rating: z.number().min(0.5).max(5).multipleOf(0.5).optional(),
  photos: z.array(entryPhotoSchema).default([]),
});

export const entryUpdateSchema = entryInputSchema.partial();
