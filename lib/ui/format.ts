// Lightweight UI formatting helpers for safe axis rendering
// Prevents accidental object-to-string bleed like "[object Object]"

export type AxisLike =
  | { value?: number | null; display?: string | number | null }
  | number
  | string
  | null
  | undefined;

export const fmtAxis = (a?: AxisLike, decimals = 1): string => {
  if (a === null || a === undefined) return 'n/a';
  if (typeof a === 'number' && Number.isFinite(a)) return a.toFixed(decimals);
  if (typeof a === 'string') return a;
  if (typeof a === 'object') {
    const anyA: any = a;
    if (anyA?.display != null) {
      if (typeof anyA.display === 'number' && Number.isFinite(anyA.display)) {
        return anyA.display.toFixed(decimals);
      }
      return String(anyA.display);
    }
    if (anyA?.value != null && Number.isFinite(anyA.value)) {
      return Number(anyA.value).toFixed(decimals);
    }
  }
  return 'n/a';
};

export const fmtAxisLabel = (
  label?: string | null,
  a?: AxisLike,
  decimals = 1
): string => label ?? fmtAxis(a, decimals);
