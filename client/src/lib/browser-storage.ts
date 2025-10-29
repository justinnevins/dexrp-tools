import type { 
  Wallet, 
  Transaction, 
  Trustline, 
  InsertWallet, 
  InsertTransaction, 
  InsertTrustline
} from "@shared/schema";

class BrowserStorage {
  private readonly STORAGE_KEYS = {
    WALLETS: 'xrpl_wallets',
    TRANSACTIONS: 'xrpl_transactions',
    TRUSTLINES: 'xrpl_trustlines',
    COUNTERS: 'xrpl_counters'
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
    return this.getStoredData<Wallet>(this.STORAGE_KEYS.WALLETS);
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
    
    // Check if wallet with this address already exists
    const existingWallet = wallets.find(w => w.address === insertWallet.address);
    if (existingWallet) {
      console.log('Wallet with this address already exists:', existingWallet);
      throw new Error(`Wallet with address ${insertWallet.address} already exists`);
    }
    
    // Generate a default name if not provided
    const defaultName = `Account ${wallets.length + 1}`;
    
    const wallet: Wallet = {
      id: counters.walletId++,
      name: insertWallet.name || defaultName,
      address: insertWallet.address,
      publicKey: insertWallet.publicKey || null,
      balance: insertWallet.balance || '0',
      reservedBalance: insertWallet.reservedBalance || '1',
      hardwareWalletType: insertWallet.hardwareWalletType || null,
      isConnected: insertWallet.isConnected || false,
      createdAt: new Date()
    };

    wallets.push(wallet);
    this.saveData(this.STORAGE_KEYS.WALLETS, wallets);
    this.saveCounters(counters);
    
    console.log('Wallet created successfully:', wallet);
    return wallet;
  }

  updateWallet(id: number, updates: Partial<Wallet>): Wallet | undefined {
    const wallets = this.getAllWallets();
    const index = wallets.findIndex(w => w.id === id);
    
    if (index === -1) return undefined;
    
    wallets[index] = { ...wallets[index], ...updates };
    this.saveData(this.STORAGE_KEYS.WALLETS, wallets);
    
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
}

export const browserStorage = new BrowserStorage();