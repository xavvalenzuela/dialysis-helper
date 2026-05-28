// --- Fluid limits ---
export const DEFAULT_FLUID_LIMIT_ML = 950;
export const DEFAULT_TAP_AMOUNT_ML = 300;

// --- Fluid progress color thresholds ---
export const FLUID_WARN_THRESHOLD = 0.75;

export const FLUID_COLORS = {
  normal:  '#0284c7',
  warning: '#f97316',
  over:    '#ef4444',
} as const;

export function fluidColor(progress: number): string {
  if (progress >= 1) return FLUID_COLORS.over;
  if (progress >= FLUID_WARN_THRESHOLD) return FLUID_COLORS.warning;
  return FLUID_COLORS.normal;
}
