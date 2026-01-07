export function useSync() {
  return {
    syncState: { status: 'idle' as const, lastPush: null, lastPull: null, error: null },
    isUnlocked: false,
    hasStoredSalt: false,
    hasServerData: false,
    hasServerSalt: false,
    isLoadingStatus: false,
    canSync: false,
    syncOptIn: false,
    setSyncOptIn: (_optIn: boolean) => {},
    setupPassphrase: async (_passphrase: string) => {},
    unlockWithPassphrase: async (_passphrase: string): Promise<boolean> => false,
    push: async () => ({ success: false, error: 'Sync not available in Community Edition' }),
    pull: async () => ({ success: false, hasData: false, error: 'Sync not available in Community Edition' }),
    debouncedPush: () => {},
    clearSyncData: () => {},
    lock: () => {},
    needsSetup: false,
    needsUnlock: false,
    shouldPromptForSync: false,
  };
}
