import type { 
  Wallet, 
  Transaction, 
  Trustline, 
  InsertWallet, 
  InsertTransaction, 
  InsertTrustline
} from "@shared/schema";
import type { StoredOffer, OfferFill } from './dex-types';

export interface XRPLSettings {
  customMainnetNode?: string;
  customTestnetNode?: string;
  fullHistoryMainnetNode?: string;
  fullHistoryTestnetNode?: string;
}

class BrowserStorage {
  private readonly STORAGE_KEYS = {
    WALLETS: 'xrpl_wallets',
    TRANSACTIONS: 'xrpl_transactions',
    TRUSTLINES: 'xrpl_trustlines',
    COUNTERS: 'xrpl_counters',
    SETTINGS: 'xrpl_settings',
    OFFERS: 'xrpl_dex_offers'
  };

  private getCounters() {
    const stored = localStorage.getItem(this.STORAGE_KEYS.COUNTERS);
    return stored ? JSON.parse(stored) : {
      walletId: 1,
      transactionId: 1,
      trustlineId: 1
    };
  }

  private saveCounters(counters: any) {
    localStorage.setItem(this.STORAGE_KEYS.COUNTERS, JSON.stringify(counters));
  }

  private getStoredData<T>(key: string): T[] {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  private saveData<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Wallet operations
  getAllWallets(): Wallet[] {
    const wallets = this.getStoredData<Wallet>(this.STORAGE_KEYS.WALLETS);
    
    // Migration: Add network field to legacy wallets that don't have one
    // Check if migration has already been done
    const migrationCompleted = localStorage.getItem('xrpl_wallet_network_migration_v1');
    
    if (!migrationCompleted) {
      const legacyWallets = wallets.filter(w => !w.network);
      
      if (legacyWallets.length > 0) {
        // Try to infer network from old global setting as a hint
        const legacyNetwork = localStorage.getItem('xrpl-network') as 'mainnet' | 'testnet' | null;
        const inferredNetwork = legacyNetwork || 'mainnet';
        
        console.warn(`Found ${legacyWallets.length} legacy wallet(s) without network field. Inferring network as '${inferredNetwork}' from old global setting.`);
        console.warn('If this is incorrect, please edit each wallet to set the correct network from the Profile page.');
        
        const migratedWallets = wallets.map(wallet => {
          if (!wallet.network) {
            console.log(`Migrating wallet ${wallet.id} (${wallet.address}) to ${inferredNetwork}`);
            return {
              ...wallet,
              network: inferredNetwork
            };
          }
          return wallet;
        });
        
        this.saveData(this.STORAGE_KEYS.WALLETS, migratedWallets);
        localStorage.setItem('xrpl_wallet_network_migration_v1', 'completed');
        console.log('Legacy wallet migration completed');
        
        return migratedWallets;
      } else {
        // No legacy wallets, mark migration as complete
        localStorage.setItem('xrpl_wallet_network_migration_v1', 'completed');
      }
    }
    
    return wallets;
  }

  getWallet(id: number): Wallet | undefined {
    const wallets = this.getAllWallets();
    return wallets.find(w => w.id === id);
  }

  getWalletByAddress(address: string): Wallet | undefined {
    const wallets = this.getAllWallets();
    return wallets.find(w => w.address === address);
  }

  createWallet(insertWallet: InsertWallet): Wallet {
    const counters = this.getCounters();
    const wallets = this.getAllWallets();
    
    // Check if wallet with this address AND network combination already exists
    const network = insertWallet.network || 'mainnet';
    const existingWallet = wallets.find(w => 
      w.address === insertWallet.address && w.network === network
    );
    if (existingWallet) {
      console.log('Wallet with this address and network already exists:', existingWallet);
      throw new Error(`Account with address ${insertWallet.address} already exists on ${network}`);
    }
    
    // Generate a default name if not provided
    const networkLabel = network === 'mainnet' ? 'Mainnet' : 'Testnet';
    const defaultName = `Account ${wallets.length + 1} (${networkLabel})`;
    
    const wallet: Wallet = {
      id: counters.walletId++,
      name: insertWallet.name || defaultName,
      address: insertWallet.address,
      publicKey: insertWallet.publicKey || null,
      balance: insertWallet.balance || '0',
      reservedBalance: insertWallet.reservedBalance || '1',
      hardwareWalletType: insertWallet.hardwareWalletType || null,
      network: network as 'mainnet' | 'testnet',
      isConnected: insertWallet.isConnected || false,
      createdAt: new Date()
    };

    wallets.push(wallet);
    this.saveData(this.STORAGE_KEYS.WALLETS, wallets);
    this.saveCounters(counters);
    
    console.log('Wallet created successfully:', wallet);
    return wallet;
  }

  updateWallet(id: number, updates: Partial<Wallet>): Wallet | null {
    const wallets = this.getAllWallets();
    const index = wallets.findIndex(w => w.id === id);
    
    if (index === -1) return null;
    
    const currentWallet = wallets[index];
    
    // If network is being changed, check for duplicate address/network combination
    if (updates.network && updates.network !== currentWallet.network) {
      const duplicateExists = wallets.some(w => 
        w.id !== id && 
        w.address === currentWallet.address && 
        w.network === updates.network
      );
      
      if (duplicateExists) {
        throw new Error(`An account with address ${currentWallet.address} already exists on ${updates.network}`);
      }
    }
    
    // Merge updates with existing wallet
    wallets[index] = {
      ...wallets[index],
      ...updates,
      id: wallets[index].id, // Ensure id cannot be changed
      address: wallets[index].address, // Ensure address cannot be changed
    };
    
    this.saveData(this.STORAGE_KEYS.WALLETS, wallets);
    console.log('Wallet updated successfully:', wallets[index]);
    return wallets[index];
  }

  deleteWallet(id: number): boolean {
    const wallets = this.getAllWallets();
    const index = wallets.findIndex(w => w.id === id);
    
    if (index === -1) return false;
    
    wallets.splice(index, 1);
    this.saveData(this.STORAGE_KEYS.WALLETS, wallets);
    
    // Also clean up associated data
    const transactions = this.getAllTransactions().filter(t => t.walletId !== id);
    this.saveData(this.STORAGE_KEYS.TRANSACTIONS, transactions);
    
    const trustlines = this.getAllTrustlines().filter(t => t.walletId !== id);
    this.saveData(this.STORAGE_KEYS.TRUSTLINES, trustlines);
    
    return true;
  }

  // Transaction operations
  getAllTransactions(): Transaction[] {
    return this.getStoredData<Transaction>(this.STORAGE_KEYS.TRANSACTIONS);
  }

  getTransaction(id: number): Transaction | undefined {
    const transactions = this.getAllTransactions();
    return transactions.find(t => t.id === id);
  }

  getTransactionsByWallet(walletId: number): Transaction[] {
    const transactions = this.getAllTransactions();
    return transactions.filter(t => t.walletId === walletId);
  }

  createTransaction(insertTransaction: InsertTransaction): Transaction {
    const counters = this.getCounters();
    const transactions = this.getAllTransactions();
    
    const transaction: Transaction = {
      id: counters.transactionId++,
      walletId: insertTransaction.walletId,
      type: insertTransaction.type,
      amount: insertTransaction.amount,
      currency: insertTransaction.currency || 'XRP',
      fromAddress: insertTransaction.fromAddress || null,
      toAddress: insertTransaction.toAddress || null,
      destinationTag: insertTransaction.destinationTag || null,
      status: insertTransaction.status || 'pending',
      txHash: insertTransaction.txHash || null,
      createdAt: new Date()
    };

    transactions.push(transaction);
    this.saveData(this.STORAGE_KEYS.TRANSACTIONS, transactions);
    this.saveCounters(counters);
    
    return transaction;
  }

  updateTransaction(id: number, updates: Partial<Transaction>): Transaction | undefined {
    const transactions = this.getAllTransactions();
    const index = transactions.findIndex(t => t.id === id);
    
    if (index === -1) return undefined;
    
    transactions[index] = { ...transactions[index], ...updates };
    this.saveData(this.STORAGE_KEYS.TRANSACTIONS, transactions);
    
    return transactions[index];
  }

  // Trustline operations
  getAllTrustlines(): Trustline[] {
    return this.getStoredData<Trustline>(this.STORAGE_KEYS.TRUSTLINES);
  }

  getTrustline(id: number): Trustline | undefined {
    const trustlines = this.getAllTrustlines();
    return trustlines.find(t => t.id === id);
  }

  getTrustlinesByWallet(walletId: number): Trustline[] {
    const trustlines = this.getAllTrustlines();
    return trustlines.filter(t => t.walletId === walletId && t.isActive);
  }

  createTrustline(insertTrustline: InsertTrustline): Trustline {
    const counters = this.getCounters();
    const trustlines = this.getAllTrustlines();
    
    const trustline: Trustline = {
      id: counters.trustlineId++,
      walletId: insertTrustline.walletId,
      currency: insertTrustline.currency,
      issuer: insertTrustline.issuer,
      issuerName: insertTrustline.issuerName,
      limit: insertTrustline.limit,
      balance: insertTrustline.balance || '0',
      isActive: insertTrustline.isActive !== false,
      createdAt: new Date()
    };

    trustlines.push(trustline);
    this.saveData(this.STORAGE_KEYS.TRUSTLINES, trustlines);
    this.saveCounters(counters);
    
    return trustline;
  }

  updateTrustline(id: number, updates: Partial<Trustline>): Trustline | undefined {
    const trustlines = this.getAllTrustlines();
    const index = trustlines.findIndex(t => t.id === id);
    
    if (index === -1) return undefined;
    
    trustlines[index] = { ...trustlines[index], ...updates };
    this.saveData(this.STORAGE_KEYS.TRUSTLINES, trustlines);
    
    return trustlines[index];
  }

  // Clear all data
  clearAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Sync data from server (for initial load or updates)
  syncFromServer(data: {
    wallets?: Wallet[];
    transactions?: Transaction[];
    trustlines?: Trustline[];
  }) {
    if (data.wallets) {
      this.saveData(this.STORAGE_KEYS.WALLETS, data.wallets);
    }
    if (data.transactions) {
      this.saveData(this.STORAGE_KEYS.TRANSACTIONS, data.transactions);
    }
    if (data.trustlines) {
      this.saveData(this.STORAGE_KEYS.TRUSTLINES, data.trustlines);
    }
  }

  // Settings operations
  getSettings(): XRPLSettings {
    const stored = localStorage.getItem(this.STORAGE_KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : {};
  }

  saveSettings(settings: XRPLSettings): void {
    localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // DEX Offer operations
  getAllOffers(): StoredOffer[] {
    return this.getStoredData<StoredOffer>(this.STORAGE_KEYS.OFFERS);
  }

  getOffersByWallet(walletAddress: string, network: 'mainnet' | 'testnet'): StoredOffer[] {
    const offers = this.getAllOffers();
    return offers.filter(o => o.walletAddress === walletAddress && o.network === network);
  }

  getOffer(walletAddress: string, network: 'mainnet' | 'testnet', sequence: number): StoredOffer | undefined {
    const offers = this.getAllOffers();
    return offers.find(o => 
      o.walletAddress === walletAddress && 
      o.network === network && 
      o.sequence === sequence
    );
  }

  saveOffer(offer: StoredOffer): void {
    const offers = this.getAllOffers();
    const existingIndex = offers.findIndex(o => 
      o.walletAddress === offer.walletAddress && 
      o.network === offer.network && 
      o.sequence === offer.sequence
    );
    
    if (existingIndex >= 0) {
      offers[existingIndex] = offer;
    } else {
      offers.push(offer);
    }
    
    this.saveData(this.STORAGE_KEYS.OFFERS, offers);
  }

  addOfferFill(walletAddress: string, network: 'mainnet' | 'testnet', sequence: number, fill: OfferFill): void {
    let offer = this.getOffer(walletAddress, network, sequence);
    
    // If offer doesn't exist, create a placeholder (historical fill before we tracked the offer)
    if (!offer) {
      console.log(`Creating placeholder offer for historical fill: ${walletAddress} ${network} ${sequence}`);
      offer = {
        sequence,
        walletAddress,
        network,
        // These will be unknown for historical fills, so use the fill amounts as best guess
        originalTakerGets: fill.takerGotAmount,
        originalTakerPays: fill.takerPaidAmount,
        createdAt: fill.timestamp,
        createdTxHash: '',
        createdLedgerIndex: fill.ledgerIndex,
        fills: []
      };
    }
    
    // Check if this fill already exists (by txHash)
    const existingFill = offer.fills.find(f => f.txHash === fill.txHash);
    if (existingFill) {
      console.log(`Fill already recorded for offer ${sequence}: ${fill.txHash}`);
      return;
    }
    
    offer.fills.push(fill);
    this.saveOffer(offer);
  }

  deleteOffer(walletAddress: string, network: 'mainnet' | 'testnet', sequence: number): void {
    const offers = this.getAllOffers();
    const filtered = offers.filter(o => 
      !(o.walletAddress === walletAddress && o.network === network && o.sequence === sequence)
    );
    this.saveData(this.STORAGE_KEYS.OFFERS, filtered);
  }
}

export const browserStorage = new BrowserStorage();