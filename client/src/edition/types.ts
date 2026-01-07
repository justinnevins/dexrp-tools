import type { ReactNode, ComponentType } from 'react';

export type EditionType = 'community' | 'commercial';

export interface RouteConfig {
  path: string;
  component: ComponentType;
}

export interface EditionFeatures {
  hasAuth: boolean;
  hasSubscriptions: boolean;
  hasCloudSync: boolean;
  hasWalletLimits: boolean;
  hasAdmin: boolean;
}

export interface EditionConfig {
  name: EditionType;
  displayName: string;
  features: EditionFeatures;
  
  getAdditionalRoutes: () => RouteConfig[];
  
  getAppProviders: () => ComponentType<{ children: ReactNode }>[];
  
  triggerSync: () => void;
  
  scheduleSyncPush: (delay?: number) => void;
}
