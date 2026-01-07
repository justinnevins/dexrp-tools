import type { EditionConfig, EditionType } from './types';
import { commercialEdition } from './commercial';
import { communityEdition } from './community';

const EDITION = 'community' as EditionType;

const editions: Record<EditionType, EditionConfig> = {
  commercial: commercialEdition,
  community: communityEdition,
};

export const edition: EditionConfig = editions[EDITION];

export const isCommercial = edition.name === 'commercial';
export const isCommunity = edition.name === 'community';

export type { EditionConfig, EditionType, EditionFeatures, RouteConfig } from './types';

export { commercialEdition } from './commercial';
export { communityEdition } from './community';

export {
  triggerEditionSync,
  scheduleEditionSyncPush,
} from './hooks';
