export type OrbsProfile = {
  majors: number;
  minors: number;
  luminaries?: number;
};

export const DEFAULT_RELATIONAL_ORBS: OrbsProfile = {
  majors: 3,
  minors: 1,
  luminaries: 6,
};

export function assertRelationalOrbs(profile: OrbsProfile): void {
  if (profile.majors > 3 || profile.minors > 1) {
    throw new Error(
      `Relational orbs too loose (majors<=3, minors<=1). Got majors=${profile.majors}, minors=${profile.minors}`
    );
  }
}
