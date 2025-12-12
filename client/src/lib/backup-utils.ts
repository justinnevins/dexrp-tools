import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface BackupResult {
  success: boolean;
  filename: string;
  location?: string;
}

const BACKUP_VERSION = '1.0';

const STORAGE_KEYS_TO_BACKUP = [
  'xrpl_wallets',
  'xrpl_transactions',
  'xrpl_trustlines',
  'xrpl_counters',
  'xrpl_settings',
  'xrpl_dex_offers',
  'xrpl_current_wallet_id',
  'xrpl_target_network',
  'ui-theme',
  'notifications_enabled',
  'biometric_enabled',
  'biometric_credential_id',
  'assets_view_mode',
  'assets_selected_network',
  'assets_hide_values',
];

export interface BackupManifest {
  version: string;
  createdAt: string;
  appName: string;
  walletCount: number;
  keys: string[];
}

export interface BackupData {
  manifest: BackupManifest;
  data: Record<string, any>;
}

export interface ImportPreview {
  manifest: BackupManifest;
  walletCount: number;
  hasTransactions: boolean;
  hasTrustlines: boolean;
  hasOffers: boolean;
  hasSettings: boolean;
}

export async function createBackup(): Promise<Blob> {
  const data: Record<string, string> = {};
  const keysIncluded: string[] = [];
  
  // Store raw localStorage strings to preserve exact values
  for (const key of STORAGE_KEYS_TO_BACKUP) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
      keysIncluded.push(key);
    }
  }
  
  // Parse wallets count for manifest
  let wallets: any[] = [];
  try {
    wallets = JSON.parse(data['xrpl_wallets'] || '[]');
  } catch {
    wallets = [];
  }
  
  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appName: 'DEXrp',
    walletCount: Array.isArray(wallets) ? wallets.length : 0,
    keys: keysIncluded,
  };
  
  const backupData: BackupData = { manifest, data };
  
  const zip = new JSZip();
  zip.file('backup.json', JSON.stringify(backupData, null, 2));
  
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return blob;
}

export async function downloadBackup(blob: Blob): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `dexrp-backup-${timestamp}.zip`;
  
  if (Capacitor.isNativePlatform()) {
    return await downloadBackupNative(blob, filename);
  } else {
    downloadBackupWeb(blob, filename);
    return { success: true, filename, location: 'Downloads folder' };
  }
}

async function downloadBackupNative(blob: Blob, filename: string): Promise<BackupResult> {
  const base64Data = await blobToBase64(blob);
  
  const result = await Filesystem.writeFile({
    path: filename,
    data: base64Data,
    directory: Directory.Cache,
  });
  
  await Share.share({
    files: [result.uri],
    dialogTitle: 'Save Backup File',
  });
  
  return { success: true, filename, location: 'Saved via share' };
}

function downloadBackupWeb(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function readBackupFile(file: File): Promise<BackupData> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  const backupFile = contents.file('backup.json');
  if (!backupFile) {
    throw new Error('Invalid backup file: missing backup.json');
  }
  
  const jsonContent = await backupFile.async('string');
  const backupData: BackupData = JSON.parse(jsonContent);
  
  if (!backupData.manifest || !backupData.data) {
    throw new Error('Invalid backup file: missing manifest or data');
  }
  
  if (!backupData.manifest.version) {
    throw new Error('Invalid backup file: missing version');
  }
  
  return backupData;
}

export function getImportPreview(backupData: BackupData): ImportPreview {
  const { manifest, data } = backupData;
  
  // Parse JSON strings for preview purposes
  const parseJsonSafe = (str: string | undefined): any[] => {
    if (!str) return [];
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  
  const wallets = parseJsonSafe(data['xrpl_wallets']);
  const transactions = parseJsonSafe(data['xrpl_transactions']);
  const trustlines = parseJsonSafe(data['xrpl_trustlines']);
  const offers = parseJsonSafe(data['xrpl_dex_offers']);
  const settings = data['xrpl_settings'];
  
  return {
    manifest,
    walletCount: wallets.length,
    hasTransactions: transactions.length > 0,
    hasTrustlines: trustlines.length > 0,
    hasOffers: offers.length > 0,
    hasSettings: settings !== undefined,
  };
}

export type ImportMode = 'replace' | 'merge';

export function restoreBackup(backupData: BackupData, mode: ImportMode): { restored: number; merged: number } {
  const { data } = backupData;
  let restored = 0;
  let merged = 0;
  
  if (mode === 'replace') {
    for (const key of STORAGE_KEYS_TO_BACKUP) {
      localStorage.removeItem(key);
    }
  }
  
  for (const [key, value] of Object.entries(data)) {
    if (!STORAGE_KEYS_TO_BACKUP.includes(key)) {
      continue;
    }
    
    // Normalize value to string for backward compatibility with older backups
    // that stored parsed JSON values instead of raw strings
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (mode === 'merge' && isArrayKey(key)) {
      // For arrays, parse both existing and incoming, merge, and stringify
      const existing = getStoredArray(key);
      let incoming: any[] = [];
      try {
        incoming = JSON.parse(stringValue);
        if (!Array.isArray(incoming)) incoming = [];
      } catch {
        incoming = [];
      }
      const mergedArray = mergeArrays(key, existing, incoming);
      localStorage.setItem(key, JSON.stringify(mergedArray));
      const newItems = mergedArray.length - existing.length;
      merged += newItems > 0 ? newItems : 0;
    } else {
      // For non-array values, only update if value is different
      const existingValue = localStorage.getItem(key);
      if (existingValue !== stringValue) {
        localStorage.setItem(key, stringValue);
        restored++;
      }
    }
  }
  
  return { restored, merged };
}

function isArrayKey(key: string): boolean {
  return ['xrpl_wallets', 'xrpl_transactions', 'xrpl_trustlines', 'xrpl_dex_offers'].includes(key);
}

function getStoredArray(key: string): any[] {
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeArrays(key: string, existing: any[], incoming: any[]): any[] {
  const idField = getIdField(key);
  
  if (!idField) {
    return [...existing, ...incoming];
  }
  
  const existingIds = new Set(existing.map(item => item[idField]));
  const newItems = incoming.filter(item => !existingIds.has(item[idField]));
  
  return [...existing, ...newItems];
}

function getIdField(key: string): string | null {
  switch (key) {
    case 'xrpl_wallets':
      return 'address';
    case 'xrpl_transactions':
      return 'hash';
    case 'xrpl_trustlines':
      return 'id';
    case 'xrpl_dex_offers':
      return 'offerSequence';
    default:
      return null;
  }
}
