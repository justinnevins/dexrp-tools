import { Client, Wallet as XRPLWallet } from 'xrpl';

export type XRPLNetwork = 'mainnet' | 'testnet';

class XRPLClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private currentNetwork: XRPLNetwork;
  private connectionPromise: Promise<void> | null = null;

  private networkEndpoints = {
    mainnet: 'wss://xrplcluster.com',
    testnet: 'wss://s.altnet.rippletest.net:51233'
  };

  constructor() {
    // Read stored network preference or default to mainnet
    this.currentNetwork = (localStorage.getItem('xrpl_target_network') as XRPLNetwork) || 'mainnet';
    this.initializeClient();
  }

  private initializeClient(): void {
    if (this.client) {
      try {
        this.client.disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.client = new Client(this.networkEndpoints[this.currentNetwork]);
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnected && this.client) {
      return Promise.resolve();
    }

    this.connectionPromise = this.performConnection();
    return this.connectionPromise;
  }

  private async performConnection(): Promise<void> {
    try {
      if (!this.client) {
        this.initializeClient();
      }
      
      await this.client!.connect();
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to XRPL:', error);
      this.isConnected = false;
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.disconnect();
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  async switchNetwork(network: XRPLNetwork): Promise<void> {
    if (network === this.currentNetwork) return;
    
    try {
      console.log(`Switching from ${this.currentNetwork} to ${network}`);
      
      // Completely disconnect and clean up current client
      await this.disconnect();
      
      // Update network before creating new client
      this.currentNetwork = network;
      
      // Wait for clean disconnect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Initialize new client for the new network
      this.initializeClient();
      
      // Connect to new network
      await this.connect();
      
      console.log(`Successfully switched to ${network}`);
    } catch (error) {
      console.error('Error switching networks:', error);
      this.isConnected = false;
      throw error;
    }
  }

  getCurrentNetwork(): XRPLNetwork {
    return this.currentNetwork;
  }

  getNetworkInfo() {
    return {
      network: this.currentNetwork,
      endpoint: this.networkEndpoints[this.currentNetwork],
      isConnected: this.isConnected
    };
  }

  getClient(): Client | null {
    return this.client;
  }

  async getAccountInfo(address: string) {
    await this.connect();
    if (!this.client) {
      throw new Error('XRPL client not initialized');
    }
    
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      if (error.data?.error === 'actNotFound') {
        return {
          account_not_found: true,
          address,
          error: 'Account not found on the ledger'
        };
      }
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  async getAccountTransactions(address: string, limit: number = 20) {
    await this.connect();
    if (!this.client) {
      throw new Error('XRPL client not initialized');
    }
    
    try {
      const response = await this.client.request({
        command: 'account_tx',
        account: address,
        limit,
        ledger_index_min: -1,
        ledger_index_max: -1
      });
      return response.result;
    } catch (error: any) {
      // Handle account not found error (account not activated)
      if (error.data?.error === 'actNotFound') {
        return { transactions: [], account: address, marker: undefined };
      }
      
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getAccountLines(address: string) {
    await this.connect();
    if (!this.client) {
      throw new Error('XRPL client not initialized');
    }
    
    try {
      const response = await this.client.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      // Handle account not found error (account not activated)
      if (error.data?.error === 'actNotFound') {
        return { lines: [], account: address, marker: undefined };
      }
      
      console.error('Error fetching account lines:', error);
      
      // Retry once on disconnection errors
      if (error.name === 'DisconnectedError' || error.message?.includes('disconnected')) {
        console.log('Retrying account lines fetch after disconnection...');
        await this.connect();
        const response = await this.client.request({
          command: 'account_lines',
          account: address,
          ledger_index: 'validated'
        });
        return response.result;
      }
      
      throw error;
    }
  }

  async getAccountOffers(address: string) {
    await this.connect();
    if (!this.client) {
      throw new Error('XRPL client not initialized');
    }
    
    try {
      const response = await this.client.request({
        command: 'account_offers',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      // Handle account not found error
      if (error.data?.error === 'actNotFound') {
        return { offers: [], account: address };
      }
      console.error('Error fetching account offers:', error);
      throw error;
    }
  }

  async getOrderBook(takerPays: any, takerGets: any, limit = 10) {
    await this.connect();
    if (!this.client) {
      throw new Error('XRPL client not initialized');
    }
    
    try {
      const response = await this.client.request({
        command: 'book_offers',
        taker_pays: takerPays,
        taker_gets: takerGets,
        limit,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  isValidAddress(address: string): boolean {
    try {
      return /^r[a-zA-Z0-9]{24,34}$/.test(address);
    } catch {
      return false;
    }
  }

  formatXRPAmount(drops: string): string {
    return (parseInt(drops) / 1000000).toFixed(6);
  }

  convertXRPToDrops(xrp: string): string {
    return (parseFloat(xrp) * 1000000).toString();
  }

  encodeCurrency(currencyCode: string): string {
    // If it's already a 40-character hex string, return as-is
    if (currencyCode.length === 40 && /^[0-9A-F]+$/i.test(currencyCode)) {
      return currencyCode.toUpperCase();
    }
    
    // XRP doesn't need encoding (native currency)
    if (currencyCode === 'XRP') {
      return currencyCode;
    }
    
    // For standard 3-letter currency codes, encode to XRPL hex format
    // Format: 12 zeros + ASCII hex + 5 zeros = 40 characters total
    if (currencyCode.length <= 3 && /^[A-Z]{1,3}$/i.test(currencyCode)) {
      const paddedCode = currencyCode.toUpperCase().padEnd(3, '\0');
      let hex = '';
      for (let i = 0; i < paddedCode.length; i++) {
        hex += paddedCode.charCodeAt(i).toString(16).padStart(2, '0');
      }
      // Pad to 40 characters: 12 zeros + 6 hex chars (3 bytes) + 22 zeros = 40
      return '00000000000000000000000' + hex.toUpperCase() + '0000000000000000000000';
    }
    
    // For longer codes (up to 20 chars), convert to hex without standard currency padding
    if (currencyCode.length <= 20) {
      let hex = '';
      for (let i = 0; i < currencyCode.length; i++) {
        hex += currencyCode.charCodeAt(i).toString(16).padStart(2, '0');
      }
      return hex.toUpperCase().padEnd(40, '0');
    }
    
    // Fallback: return as-is
    return currencyCode;
  }

  decodeCurrency(currencyCode: string): string {
    if (!currencyCode) return '';
    
    // If it's already a standard 3-character code, return as-is
    if (currencyCode.length === 3 && /^[A-Z]{3}$/.test(currencyCode)) {
      return currencyCode;
    }
    
    // If it's XRP, return as-is
    if (currencyCode === 'XRP') {
      return currencyCode;
    }
    
    // If it's a 40-character hex string (160 bits), decode it
    if (currencyCode.length === 40 && /^[0-9A-F]+$/i.test(currencyCode)) {
      try {
        // Check if it's a standard currency code (starts with 00s and ends with 00s)
        const hex = currencyCode.toUpperCase();
        
        // Standard format: 000000000000000000000000 + ASCII (up to 20 chars) = 40 hex chars total
        // But typically it's just the 3 ASCII chars padded with zeros
        // Example: 524C55534440... = RLUSD
        
        // Try to extract ASCII characters from the hex
        let decoded = '';
        for (let i = 0; i < hex.length; i += 2) {
          const byte = parseInt(hex.substr(i, 2), 16);
          if (byte === 0) continue; // Skip null bytes (padding)
          if (byte >= 32 && byte <= 126) { // Printable ASCII
            decoded += String.fromCharCode(byte);
          }
        }
        
        // Clean up the decoded string (remove any trailing nulls or special chars)
        decoded = decoded.trim().replace(/\0/g, '');
        
        // If we got a reasonable currency code (1-20 alphanumeric chars), return it
        if (decoded.length > 0 && decoded.length <= 20 && /^[A-Za-z0-9]+$/.test(decoded)) {
          return decoded;
        }
        
        // If decoding failed, return truncated hex as fallback
        return currencyCode.slice(0, 8) + '...';
      } catch (error) {
        console.error('Error decoding currency:', error);
        return currencyCode.slice(0, 8) + '...';
      }
    }
    
    // For any other format, return truncated
    if (currencyCode.length > 10) {
      return currencyCode.slice(0, 8) + '...';
    }
    
    return currencyCode;
  }

  generateTestWallet(): { address: string; seed: string } {
    const wallet = XRPLWallet.generate();
    return {
      address: wallet.address,
      seed: wallet.seed!
    };
  }
}

export const xrplClient = new XRPLClient();
