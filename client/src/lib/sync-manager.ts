export interface SyncState {
  status: 'idle' | 'syncing' | 'pushing' | 'pulling' | 'error';
  lastPush: Date | null;
  lastPull: Date | null;
  error: string | null;
}

export interface SyncStatusResponse {
  hasData: boolean;
  salt: string | null;
  lastUpdated: string | null;
}

class SyncManagerStub {
  private state: SyncState = {
    status: 'idle',
    lastPush: null,
    lastPull: null,
    error: null,
  };

  getState(): SyncState {
    return this.state;
  }

  isUnlocked(): boolean {
    return false;
  }

  hasStoredSalt(): boolean {
    return false;
  }

  getSyncOptIn(): boolean {
    return false;
  }

  setSyncOptIn(_optIn: boolean): void {}

  subscribe(_callback: (state: SyncState) => void): () => void {
    return () => {};
  }

  subscribeToOptIn(_callback: (optIn: boolean) => void): () => void {
    return () => {};
  }

  async restoreSession(): Promise<boolean> {
    return false;
  }

  async fetchSyncStatus(): Promise<SyncStatusResponse | null> {
    return null;
  }

  setSaltFromServer(_salt: string): void {}

  async setupPassphrase(_passphrase: string): Promise<void> {}

  async unlockWithPassphrase(_passphrase: string): Promise<boolean> {
    return false;
  }

  async push(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Sync not available in Community Edition' };
  }

  async pull(): Promise<{ success: boolean; hasData: boolean; error?: string }> {
    return { success: false, hasData: false, error: 'Sync not available in Community Edition' };
  }

  schedulePush(_delay?: number): void {}

  clearSyncData(): void {}

  lock(): void {}

  clearWalletsClearedMarker(): void {}

  markWalletsCleared(): void {}

  markPendingPushAfterImport(): void {}

  clearPendingPushAfterImport(): void {}

  async deleteAll(): Promise<void> {}
}

export const syncManager = new SyncManagerStub();
