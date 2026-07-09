import type { Profile } from "@prisma/client";
import { toNumberOrNull } from "../../common/serialization.js";

export interface ProfileResponse {
  id: number;
  displayName: string;
  isPrimary: boolean;
  isActive: boolean;
  heightCm: number | null;
  wristCm: number | null;
  sex: string | null;
  unitSystem: string;
}

export function mapProfile(profile: Profile, activeProfileId: bigint): ProfileResponse {
  return {
    id: Number(profile.id),
    displayName: profile.displayName,
    isPrimary: profile.isPrimary,
    isActive: profile.id === activeProfileId,
    heightCm: toNumberOrNull(profile.heightCm),
    wristCm: toNumberOrNull(profile.wristCm),
    sex: profile.sex,
    unitSystem: profile.unitSystem,
  };
}
