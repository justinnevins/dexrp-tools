import type { ReactNode, ComponentType } from 'react';
import type { EditionConfig, EditionFeatures, RouteConfig } from './types';

const features: EditionFeatures = {
  hasAuth: true,
  hasSubscriptions: true,
  hasCloudSync: true,
  hasWalletLimits: true,
  hasAdmin: true,
};

function getAdditionalRoutes(): RouteConfig[] {
  return [];
}

function getAppProviders(): ComponentType<{ children: ReactNode }>[] {
  return [];
}

function triggerSync(): void {
  import('@/lib/sync-manager').then(({ syncManager }) => {
    if (syncManager.isUnlocked() && syncManager.getSyncOptIn()) {
      syncManager.schedulePush();
    }
  }).catch(() => {});
}

function scheduleSyncPush(delay?: number): void {
  import('@/lib/sync-manager').then(({ syncManager }) => {
    syncManager.schedulePush(delay);
  }).catch(() => {});
}

export const commercialEdition: EditionConfig = {
  name: 'commercial',
  displayName: 'DEXrp Tools',
  features,
  getAdditionalRoutes,
  getAppProviders,
  triggerSync,
  scheduleSyncPush,
};
