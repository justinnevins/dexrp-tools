import { edition } from './index';

export function triggerEditionSync(): void {
  if (!edition.features.hasCloudSync) {
    return;
  }
  edition.triggerSync();
}

export function scheduleEditionSyncPush(delay?: number): void {
  if (!edition.features.hasCloudSync) {
    return;
  }
  edition.scheduleSyncPush(delay);
}

export { edition };
