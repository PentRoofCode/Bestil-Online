import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

const optionSchema = z.object({
  name: z.string().min(1).max(100),
  priceModifier: z.number().min(0).default(0),
  displayOrder: z.number().int().min(0).default(0),
});

export const createOptionGroupSchema = z.object({
  name: z.string().min(1).max(100),
  isRequired: z.boolean().default(false),
  isMultiSelect: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  options: z.array(optionSchema).min(1),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  preparationTimeMin: z.number().int().min(0).default(15),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
  displayOrder: z.number().int().min(0).default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CreateMenuItemBody = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemBody = z.infer<typeof updateMenuItemSchema>;
export type CreateOptionGroupBody = z.infer<typeof createOptionGroupSchema>;
