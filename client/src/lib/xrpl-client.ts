import { Client, Wallet as XRPLWallet } from 'xrpl';

export type XRPLNetwork = 'mainnet' | 'testnet';

class XRPLClient {
  private client: Client | null = null;
  private isConnected: boolean = false;
  private currentNetwork: XRPLNetwork = 'mainnet';
  private connectionPromise: Promise<void> | null = null;

  private networkEndpoints = {
    mainnet: 'wss://xrplcluster.com',
    testnet: 'wss://s.altnet.rippletest.net:51233'
  };

  constructor() {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Error fetching account lines:', error);
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

  generateTestWallet(): { address: string; seed: string } {
    const wallet = XRPLWallet.generate();
    return {
      address: wallet.address,
      seed: wallet.seed!
    };
  }
}

export const xrplClient = new XRPLClient();
