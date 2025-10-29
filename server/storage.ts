import { 
  wallets, 
  transactions, 
  trustlines, 
  type Wallet, 
  type Transaction, 
  type Trustline, 
  type InsertWallet, 
  type InsertTransaction, 
  type InsertTrustline
} from "@shared/schema";

export interface IStorage {
  // Wallet operations
  getWallet(id: number): Promise<Wallet | undefined>;
  getWalletByAddress(address: string): Promise<Wallet | undefined>;
  getAllWallets(): Promise<Wallet[]>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWallet(id: number, updates: Partial<Wallet>): Promise<Wallet | undefined>;
  
  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByWallet(walletId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // Trustline operations
  getTrustline(id: number): Promise<Trustline | undefined>;
  getTrustlinesByWallet(walletId: number): Promise<Trustline[]>;
  createTrustline(trustline: InsertTrustline): Promise<Trustline>;
  updateTrustline(id: number, updates: Partial<Trustline>): Promise<Trustline | undefined>;
  
  // Clear all data
  clearAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private wallets: Map<number, Wallet>;
  private transactions: Map<number, Transaction>;
  private trustlines: Map<number, Trustline>;
  private currentWalletId: number;
  private currentTransactionId: number;
  private currentTrustlineId: number;

  constructor() {
    this.wallets = new Map();
    this.transactions = new Map();
    this.trustlines = new Map();
    this.currentWalletId = 1;
    this.currentTransactionId = 1;
    this.currentTrustlineId = 1;

    // Initialize with a test wallet
    this.initializeTestData();
  }

  private initializeTestData() {
    // No demo data - only real hardware wallet connections will create wallets
    // This ensures authentic data integrity
  }

  // Wallet operations
  async getWallet(id: number): Promise<Wallet | undefined> {
    return this.wallets.get(id);
  }

  async getWalletByAddress(address: string): Promise<Wallet | undefined> {
    return Array.from(this.wallets.values()).find(wallet => wallet.address === address);
  }

  async getAllWallets(): Promise<Wallet[]> {
    return Array.from(this.wallets.values());
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const id = this.currentWalletId++;
    const wallet: Wallet = { 
      ...insertWallet, 
      id, 
      createdAt: new Date(),
      balance: insertWallet.balance || "0",
      reservedBalance: insertWallet.reservedBalance || "20",
      isConnected: insertWallet.isConnected || false,
      hardwareWalletType: insertWallet.hardwareWalletType || null,
    };
    this.wallets.set(id, wallet);
    return wallet;
  }

  async updateWallet(id: number, updates: Partial<Wallet>): Promise<Wallet | undefined> {
    const wallet = this.wallets.get(id);
    if (!wallet) return undefined;

    const updatedWallet = { ...wallet, ...updates };
    this.wallets.set(id, updatedWallet);
    return updatedWallet;
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByWallet(walletId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.walletId === walletId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = { 
      ...insertTransaction, 
      id, 
      createdAt: new Date(),
      status: insertTransaction.status || "pending",
      currency: insertTransaction.currency || "XRP",
      fromAddress: insertTransaction.fromAddress || null,
      toAddress: insertTransaction.toAddress || null,
      destinationTag: insertTransaction.destinationTag || null,
      txHash: insertTransaction.txHash || null,
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...updates };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  // Trustline operations
  async getTrustline(id: number): Promise<Trustline | undefined> {
    return this.trustlines.get(id);
  }

  async getTrustlinesByWallet(walletId: number): Promise<Trustline[]> {
    return Array.from(this.trustlines.values())
      .filter(tl => tl.walletId === walletId && tl.isActive);
  }

  async createTrustline(insertTrustline: InsertTrustline): Promise<Trustline> {
    const id = this.currentTrustlineId++;
    const trustline: Trustline = { 
      ...insertTrustline, 
      id, 
      createdAt: new Date(),
      balance: insertTrustline.balance || "0",
      isActive: insertTrustline.isActive !== undefined ? insertTrustline.isActive : true,
    };
    this.trustlines.set(id, trustline);
    return trustline;
  }

  async updateTrustline(id: number, updates: Partial<Trustline>): Promise<Trustline | undefined> {
    const trustline = this.trustlines.get(id);
    if (!trustline) return undefined;

    const updatedTrustline = { ...trustline, ...updates };
    this.trustlines.set(id, updatedTrustline);
    return updatedTrustline;
  }

  async clearAllData(): Promise<void> {
    this.wallets.clear();
    this.transactions.clear();
    this.trustlines.clear();
    this.currentWalletId = 1;
    this.currentTransactionId = 1;
    this.currentTrustlineId = 1;
  }
}

export const storage = new MemStorage();
