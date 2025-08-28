// Feature flags for incremental rollout
export const featureFlags = {
  spotify: true, // Habilitado por padrão
  socialChat: true, // Habilitado por padrão
  dynamicIsland: true, // Habilitado por padrão
  enhancedProfile: true, // Habilitado por padrão
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return featureFlags[flag] || false;
};