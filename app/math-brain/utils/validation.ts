export const onlyDigits = (value: string, maxLength: number): string => {
  return value.replace(/\D+/g, '').slice(0, maxLength);
};

export const clampNumber = (value: string | number, min: number, max: number): number => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return NaN;
  }
  return Math.min(max, Math.max(min, numeric));
};
