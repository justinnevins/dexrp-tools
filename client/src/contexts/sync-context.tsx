import { createContext, useContext, ReactNode } from 'react';

interface SyncContextType {
  showPassphraseModal: (forEnableSync?: boolean) => void;
  showChangePassphraseModal: () => void;
  hidePassphraseModal: () => void;
  isModalOpen: boolean;
  pullAndRestore: () => Promise<void>;
  schedulePush: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSyncContext(): SyncContextType {
  return {
    showPassphraseModal: () => {},
    showChangePassphraseModal: () => {},
    hidePassphraseModal: () => {},
    isModalOpen: false,
    pullAndRestore: async () => {},
    schedulePush: () => {},
  };
}
