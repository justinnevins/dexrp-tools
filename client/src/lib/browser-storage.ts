import type { 
  Wallet, 
  Transaction, 
  Trustline, 
  Escrow,
  InsertWallet, 
  InsertTransaction, 
  InsertTrustline, 
  InsertEscrow 
} from "@shared/schema";

class BrowserStorage {
  private readonly STORAGE_KEYS = {
    WALLETS: 'xrpl_wallets',
    TRANSACTIONS: 'xrpl_transactions',
    TRUSTLINES: 'xrpl_trustlines',
    ESCROWS: 'xrpl_escrows',
    COUNTERS: 'xrpl_counters'
  };

  private getCounters() {
    const stored = localStorage.getItem(this.STORAGE_KEYS.COUNTERS);
    return stored ? JSON.parse(stored) : {
      walletId: 1,
      transactionId: 1,
      trustlineId: 1,
      escrowId: 1
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
    
    const wallet: Wallet = {
      id: counters.walletId++,
      address: insertWallet.address,
      publicKey: insertWallet.publicKey || null,
      balance: insertWallet.balance || '0',
      reservedBalance: insertWallet.reservedBalance || '20',
      hardwareWalletType: insertWallet.hardwareWalletType || null,
      isConnected: insertWallet.isConnected || false,
      createdAt: new Date()
    };

    wallets.push(wallet);
    this.saveData(this.STORAGE_KEYS.WALLETS, wallets);
    this.saveCounters(counters);
    
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
    return trustlines.filter(t => t.walletId === walletId);
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

  // Escrow operations
  getAllEscrows(): Escrow[] {
    return this.getStoredData<Escrow>(this.STORAGE_KEYS.ESCROWS);
  }

  getEscrow(id: number): Escrow | undefined {
    const escrows = this.getAllEscrows();
    return escrows.find(e => e.id === id);
  }

  getEscrowsByWallet(walletId: number): Escrow[] {
    const escrows = this.getAllEscrows();
    return escrows.filter(e => e.walletId === walletId);
  }

  createEscrow(insertEscrow: InsertEscrow): Escrow {
    const counters = this.getCounters();
    const escrows = this.getAllEscrows();
    
    const escrow: Escrow = {
      id: counters.escrowId++,
      walletId: insertEscrow.walletId,
      amount: insertEscrow.amount,
      recipient: insertEscrow.recipient,
      releaseDate: insertEscrow.releaseDate,
      status: insertEscrow.status || 'active',
      txHash: insertEscrow.txHash || null,
      createdAt: new Date()
    };

    escrows.push(escrow);
    this.saveData(this.STORAGE_KEYS.ESCROWS, escrows);
    this.saveCounters(counters);
    
    return escrow;
  }

  updateEscrow(id: number, updates: Partial<Escrow>): Escrow | undefined {
    const escrows = this.getAllEscrows();
    const index = escrows.findIndex(e => e.id === id);
    
    if (index === -1) return undefined;
    
    escrows[index] = { ...escrows[index], ...updates };
    this.saveData(this.STORAGE_KEYS.ESCROWS, escrows);
    
    return escrows[index];
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
    escrows?: Escrow[];
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
    if (data.escrows) {
      this.saveData(this.STORAGE_KEYS.ESCROWS, data.escrows);
    }
  }
}

export const browserStorage = new BrowserStorage();