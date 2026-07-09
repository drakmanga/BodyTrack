import { z } from "zod";

export const createProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  heightCm: z.number().min(50).max(300).nullish(),
  wristCm: z.number().min(5).max(30).nullish(),
  sex: z.enum(["MALE", "FEMALE"]).nullish(),
  unitSystem: z.enum(["METRIC", "IMPERIAL"]).nullish(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
