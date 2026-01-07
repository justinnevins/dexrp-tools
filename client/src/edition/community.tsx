import type { ReactNode, ComponentType } from 'react';
import type { EditionConfig, EditionFeatures, RouteConfig } from './types';

const features: EditionFeatures = {
  hasAuth: false,
  hasSubscriptions: false,
  hasCloudSync: false,
  hasWalletLimits: false,
  hasAdmin: false,
};

function getAdditionalRoutes(): RouteConfig[] {
  return [];
}

function getAppProviders(): ComponentType<{ children: ReactNode }>[] {
  return [];
}

function triggerSync(): void {
}

function scheduleSyncPush(_delay?: number): void {
}

export const communityEdition: EditionConfig = {
  name: 'community',
  displayName: 'DEXrp Tools Community Edition',
  features,
  getAdditionalRoutes,
  getAppProviders,
  triggerSync,
  scheduleSyncPush,
};
