import { Client, Wallet as XRPLWallet } from 'xrpl';

export type XRPLNetwork = 'mainnet' | 'testnet';

class XRPLClient {
  private client: Client;
  private isConnected: boolean = false;
  private currentNetwork: XRPLNetwork = 'mainnet';

  private networkEndpoints = {
    mainnet: 'wss://xrplcluster.com',
    testnet: 'wss://s.altnet.rippletest.net:51233'
  };

  constructor() {
    this.client = new Client(this.networkEndpoints.mainnet);
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
      this.isConnected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async switchNetwork(network: XRPLNetwork): Promise<void> {
    if (network === this.currentNetwork) return;
    
    // Disconnect from current network
    await this.disconnect();
    
    // Create new client with different endpoint
    this.client = new Client(this.networkEndpoints[network]);
    this.currentNetwork = network;
    
    // Reconnect to new network
    await this.connect();
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
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  async getAccountTransactions(address: string, limit: number = 20) {
    await this.connect();
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
