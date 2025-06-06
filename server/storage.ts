import { 
  wallets, 
  transactions, 
  trustlines, 
  escrows,
  type Wallet, 
  type Transaction, 
  type Trustline, 
  type Escrow,
  type InsertWallet, 
  type InsertTransaction, 
  type InsertTrustline, 
  type InsertEscrow 
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
  
  // Escrow operations
  getEscrow(id: number): Promise<Escrow | undefined>;
  getEscrowsByWallet(walletId: number): Promise<Escrow[]>;
  createEscrow(escrow: InsertEscrow): Promise<Escrow>;
  updateEscrow(id: number, updates: Partial<Escrow>): Promise<Escrow | undefined>;
}

export class MemStorage implements IStorage {
  private wallets: Map<number, Wallet>;
  private transactions: Map<number, Transaction>;
  private trustlines: Map<number, Trustline>;
  private escrows: Map<number, Escrow>;
  private currentWalletId: number;
  private currentTransactionId: number;
  private currentTrustlineId: number;
  private currentEscrowId: number;

  constructor() {
    this.wallets = new Map();
    this.transactions = new Map();
    this.trustlines = new Map();
    this.escrows = new Map();
    this.currentWalletId = 1;
    this.currentTransactionId = 1;
    this.currentTrustlineId = 1;
    this.currentEscrowId = 1;

    // Initialize with a test wallet
    this.initializeTestData();
  }

  private initializeTestData() {
    const testWallet: Wallet = {
      id: this.currentWalletId++,
      address: "rN7nUFCftTLdCqzrskBxb4AXHGqTqC4XfLQWXOPVLE",
      balance: "1247.850000",
      reservedBalance: "20.000000",
      isConnected: true,
      hardwareWalletType: "Keystone Pro 3",
      createdAt: new Date(),
    };
    this.wallets.set(testWallet.id, testWallet);

    // Add some test trustlines
    const testTrustlines: Trustline[] = [
      {
        id: this.currentTrustlineId++,
        walletId: testWallet.id,
        currency: "USD",
        issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
        issuerName: "Bitstamp",
        balance: "150.25",
        limit: "10000.00",
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: this.currentTrustlineId++,
        walletId: testWallet.id,
        currency: "BTC",
        issuer: "rchGBxcD1A1C2tdxF6papQYZ8kjRKMYcL",
        issuerName: "Gatehub",
        balance: "0.05",
        limit: "1.00",
        isActive: true,
        createdAt: new Date(),
      },
    ];

    testTrustlines.forEach(tl => this.trustlines.set(tl.id, tl));
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

  // Escrow operations
  async getEscrow(id: number): Promise<Escrow | undefined> {
    return this.escrows.get(id);
  }

  async getEscrowsByWallet(walletId: number): Promise<Escrow[]> {
    return Array.from(this.escrows.values())
      .filter(escrow => escrow.walletId === walletId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createEscrow(insertEscrow: InsertEscrow): Promise<Escrow> {
    const id = this.currentEscrowId++;
    const escrow: Escrow = { 
      ...insertEscrow, 
      id, 
      createdAt: new Date(),
      status: insertEscrow.status || "active",
      txHash: insertEscrow.txHash || null,
    };
    this.escrows.set(id, escrow);
    return escrow;
  }

  async updateEscrow(id: number, updates: Partial<Escrow>): Promise<Escrow | undefined> {
    const escrow = this.escrows.get(id);
    if (!escrow) return undefined;

    const updatedEscrow = { ...escrow, ...updates };
    this.escrows.set(id, updatedEscrow);
    return updatedEscrow;
  }
}

export const storage = new MemStorage();
