// Feature flags for incremental rollout
export const featureFlags = {
  spotify: import.meta.env.VITE_ENABLE_SPOTIFY === 'true',
  socialChat: import.meta.env.VITE_ENABLE_SOCIAL_CHAT === 'true',
  dynamicIsland: import.meta.env.VITE_ENABLE_DYNAMIC_ISLAND === 'true',
  enhancedProfile: import.meta.env.VITE_ENABLE_ENHANCED_PROFILE === 'true',
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return featureFlags[flag] || false;
};