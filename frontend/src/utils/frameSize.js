// Height-to-wrist ratio ("r-value") method for body frame size — the standard, sex-specific
// version of this estimate (r = height / wrist, same units, so cm/cm works unchanged).
const FRAME_THRESHOLDS = {
  MALE: { small: 10.4, large: 9.6 }, // r > 10.4 small, 9.6-10.4 medium, < 9.6 large
  FEMALE: { small: 11.0, large: 10.1 }, // r > 11.0 small, 10.1-11.0 medium, < 10.1 large
};

export const FRAME_SIZE_LABELS = {
  small: 'Piccola',
  medium: 'Media',
  large: 'Grande',
};

export function estimateFrameSize(heightCm, wristCm, sex) {
  if (!heightCm || !wristCm || heightCm <= 0 || wristCm <= 0) return null;
  const thresholds = FRAME_THRESHOLDS[sex];
  if (!thresholds) return null;
  const r = heightCm / wristCm;
  if (r > thresholds.small) return 'small';
  if (r >= thresholds.large) return 'medium';
  return 'large';
}

// Classic Hamwi ideal-body-weight formula, adjusted ±10% for frame size (the standard way
// frame size is actually used: it turns a single height-based number into a range that accounts
// for skeletal build, which BMI alone ignores).
const HAMWI_BASE_KG = { MALE: 48.1, FEMALE: 45.4 };
const HAMWI_PER_CM_OVER_152 = { MALE: 1.07, FEMALE: 0.91 }; // ≈2.7/2.54 and ≈2.3/2.54 kg per inch over 5ft

export function estimateIdealWeightKg(heightCm, sex, frameSize) {
  if (!heightCm || heightCm <= 0 || !HAMWI_BASE_KG[sex]) return null;
  const cmOver152 = Math.max(0, heightCm - 152.4);
  const base = HAMWI_BASE_KG[sex] + cmOver152 * HAMWI_PER_CM_OVER_152[sex];
  const adjustment = frameSize === 'small' ? 0.9 : frameSize === 'large' ? 1.1 : 1;
  return base * adjustment;
}
