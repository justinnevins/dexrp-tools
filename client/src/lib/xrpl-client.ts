import { Client, Wallet as XRPLWallet } from 'xrpl';
import { browserStorage } from './browser-storage';

export type XRPLNetwork = 'mainnet' | 'testnet';

interface XRPLConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  request(params: any): Promise<any>;
  isConnected(): boolean;
}

class WebSocketConnector implements XRPLConnector {
  private client: Client;
  private connected: boolean = false;

  constructor(endpoint: string) {
    this.client = new Client(endpoint);
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async request(params: any): Promise<any> {
    return this.client.request(params);
  }

  isConnected(): boolean {
    return this.connected && this.client.isConnected();
  }
}

class JsonRpcConnector implements XRPLConnector {
  private endpoint: string;
  private connected: boolean = false;
  private requestId: number = 1;

  constructor(endpoint: string) {
    this.endpoint = endpoint.endsWith('/') ? endpoint : endpoint + '/';
  }

  async connect(): Promise<void> {
    try {
      const response = await this.request({ command: 'server_info' });
      this.connected = !!response;
    } catch (error) {
      console.error('JSON-RPC connection test failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async request(params: any): Promise<any> {
    const payload = {
      method: params.command,
      params: [params],
      id: this.requestId++,
      jsonrpc: '2.0'
    };

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw data.error;
    }

    return { result: data.result };
  }

  isConnected(): boolean {
    return this.connected;
  }
}

interface ClientState {
  connector: XRPLConnector;
  isConnected: boolean;
  connectionPromise: Promise<void> | null;
  endpoint: string;
}

class XRPLClient {
  private clients: Map<XRPLNetwork, ClientState> = new Map();

  private defaultEndpoints = {
    mainnet: 'wss://xrplcluster.com',
    testnet: 'wss://s.altnet.rippletest.net:51233'
  };

  private customEndpoints: {
    mainnet?: string;
    testnet?: string;
  } = {};

  constructor() {
    // Load custom endpoints from storage
    this.loadCustomEndpoints();
    
    // Initialize client states for both networks
    this.initializeClientState('mainnet');
    this.initializeClientState('testnet');
  }

  private loadCustomEndpoints(): void {
    const settings = browserStorage.getSettings();
    if (settings.customMainnetNode) {
      this.customEndpoints.mainnet = settings.customMainnetNode;
    }
    if (settings.customTestnetNode) {
      this.customEndpoints.testnet = settings.customTestnetNode;
    }
  }

  private getNetworkEndpoint(network: XRPLNetwork): string {
    return this.customEndpoints[network] || this.defaultEndpoints[network];
  }

  private createConnector(endpoint: string): XRPLConnector {
    const protocol = endpoint.split('://')[0].toLowerCase();
    
    if (protocol === 'http' || protocol === 'https') {
      return new JsonRpcConnector(endpoint);
    } else if (protocol === 'ws' || protocol === 'wss') {
      return new WebSocketConnector(endpoint);
    } else {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  private initializeClientState(network: XRPLNetwork): void {
    const existingState = this.clients.get(network);
    if (existingState) {
      try {
        existingState.connector.disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    const endpoint = this.getNetworkEndpoint(network);
    this.clients.set(network, {
      connector: this.createConnector(endpoint),
      isConnected: false,
      connectionPromise: null,
      endpoint
    });
  }

  getClient(network: XRPLNetwork): Client {
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    if (state.connector instanceof WebSocketConnector) {
      return (state.connector as any).client;
    }
    throw new Error('Client only available for WebSocket connections');
  }

  getEndpoint(network: XRPLNetwork): string {
    return this.getNetworkEndpoint(network);
  }

  setCustomEndpoint(network: XRPLNetwork, endpoint: string | null): void {
    // Update in-memory custom endpoints
    if (endpoint && endpoint.trim()) {
      this.customEndpoints[network] = endpoint.trim();
    } else {
      delete this.customEndpoints[network];
    }

    // Save to storage
    const settings = browserStorage.getSettings();
    if (network === 'mainnet') {
      if (endpoint && endpoint.trim()) {
        settings.customMainnetNode = endpoint.trim();
      } else {
        delete settings.customMainnetNode;
      }
    } else {
      if (endpoint && endpoint.trim()) {
        settings.customTestnetNode = endpoint.trim();
      } else {
        delete settings.customTestnetNode;
      }
    }
    browserStorage.saveSettings(settings);

    // Reinitialize the client with the new endpoint
    this.initializeClientState(network);
  }

  async connect(network: XRPLNetwork): Promise<void> {
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }

    if (state.connectionPromise) {
      return state.connectionPromise;
    }

    if (state.isConnected) {
      return Promise.resolve();
    }

    state.connectionPromise = this.performConnection(network);
    return state.connectionPromise;
  }

  private async performConnection(network: XRPLNetwork): Promise<void> {
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }

    try {
      await state.connector.connect();
      state.isConnected = true;
    } catch (error) {
      console.error(`Failed to connect to XRPL ${network}:`, error);
      state.isConnected = false;
      throw error;
    } finally {
      state.connectionPromise = null;
    }
  }

  async disconnect(network: XRPLNetwork): Promise<void> {
    const state = this.clients.get(network);
    if (!state) {
      return;
    }

    try {
      if (state.isConnected) {
        await state.connector.disconnect();
      }
    } catch (error) {
      console.error(`Error during disconnect from ${network}:`, error);
    } finally {
      state.isConnected = false;
      state.connectionPromise = null;
    }
  }

  getNetworkInfo(network: XRPLNetwork) {
    const state = this.clients.get(network);
    return {
      network,
      endpoint: this.getNetworkEndpoint(network),
      isConnected: state?.isConnected || false
    };
  }

  async getAccountInfo(address: string, network: XRPLNetwork) {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
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

  async getAccountTransactions(address: string, network: XRPLNetwork, limit: number = 20) {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({
        command: 'account_tx',
        account: address,
        limit,
        ledger_index_min: -1,
        ledger_index_max: -1
      });
      return response.result;
    } catch (error: any) {
      // Handle account not found error (account not activated)
      if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
        return { transactions: [], account: address, marker: undefined };
      }
      
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getAccountLines(address: string, network: XRPLNetwork) {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      // Handle account not found error (account not activated)
      if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
        return { lines: [], account: address, marker: undefined };
      }
      
      console.error('Error fetching account lines:', error);
      
      // Retry once on disconnection errors
      if (error.name === 'DisconnectedError' || error.message?.includes('disconnected')) {
        console.log('Retrying account lines fetch after disconnection...');
        await this.connect(network);
        const response = await state.connector.request({
          command: 'account_lines',
          account: address,
          ledger_index: 'validated'
        });
        return response.result;
      }
      
      throw error;
    }
  }

  async getAccountOffers(address: string, network: XRPLNetwork) {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({
        command: 'account_offers',
        account: address,
        ledger_index: 'validated'
      });
      return response.result;
    } catch (error: any) {
      // Handle account not found error
      if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
        return { offers: [], account: address };
      }
      console.error('Error fetching account offers:', error);
      throw error;
    }
  }

  async getOrderBook(takerPays: any, takerGets: any, network: XRPLNetwork, limit = 10) {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({
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
