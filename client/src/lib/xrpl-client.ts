import { Client, Wallet as XRPLWallet } from 'xrpl';
import { browserStorage } from './browser-storage';
import { isNativeApp } from './platform';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log('[XRPL]', ...args);
const warn = (...args: any[]) => isDev && console.warn('[XRPL]', ...args);

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
    log(`Created JSON-RPC connector for endpoint: ${this.endpoint}`);
  }

  async connect(): Promise<void> {
    log(`Testing JSON-RPC connection to: ${this.endpoint}`);
    try {
      const response = await this.request({ command: 'server_info' });
      
      if (!response || !response.result || !response.result.info) {
        throw new Error('Invalid server_info response from JSON-RPC endpoint');
      }
      
      this.connected = true;
      log(`JSON-RPC connection successful to: ${this.endpoint}`);
    } catch (error) {
      console.error(`[XRPL] JSON-RPC connection test failed for ${this.endpoint}:`, error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  async request(params: any): Promise<any> {
    try {
      const payload = {
        method: params.command,
        params: [params],
        id: this.requestId++,
        jsonrpc: '2.0'
      };

      // Native apps can make direct requests without CORS issues
      // Web apps need to use the backend proxy
      const isNative = isNativeApp();
      
      if (isNative) {
        // Native app: direct XRPL node connection (no backend dependency)
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.error) {
          const errorObj: any = new Error(data.error.message || 'JSON-RPC error');
          errorObj.data = data.error;
          throw errorObj;
        }

        return { result: data.result };
      } else {
        // Web app: use backend proxy for CORS
        const { apiFetch } = await import('./queryClient');
        const response = await apiFetch('/api/xrpl-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: this.endpoint, payload: payload })
        });

        const data = await response.json();
        
        if (data.error) {
          const errorObj: any = new Error(data.error.message || 'JSON-RPC error');
          errorObj.data = data.error;
          throw errorObj;
        }

        return { result: data.result };
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`JSON-RPC request failed: ${String(error)}`);
    }
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

  private defaultFullHistoryEndpoints = {
    mainnet: 'https://s1.ripple.com:51234',
    testnet: 'https://s.altnet.rippletest.net:51234'
  };

  private customEndpoints: {
    mainnet?: string;
    testnet?: string;
  } = {};

  private fullHistoryEndpoints: {
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
    
    // Reset custom endpoints
    if (settings.customMainnetNode) {
      this.customEndpoints.mainnet = settings.customMainnetNode;
    } else {
      delete this.customEndpoints.mainnet;
    }
    if (settings.customTestnetNode) {
      this.customEndpoints.testnet = settings.customTestnetNode;
    } else {
      delete this.customEndpoints.testnet;
    }
    
    // Reset full history endpoints
    if (settings.fullHistoryMainnetNode) {
      this.fullHistoryEndpoints.mainnet = settings.fullHistoryMainnetNode;
    } else {
      delete this.fullHistoryEndpoints.mainnet;
    }
    if (settings.fullHistoryTestnetNode) {
      this.fullHistoryEndpoints.testnet = settings.fullHistoryTestnetNode;
    } else {
      delete this.fullHistoryEndpoints.testnet;
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
      // Ensure proper cleanup by handling disconnect promise
      existingState.connector.disconnect().catch(() => {});
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

  reloadFullHistoryEndpoints(): void {
    // Reload full history endpoints from storage
    this.loadCustomEndpoints();
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
      console.error(`[XRPL] Failed to connect to ${network}:`, error);
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
      console.error(`[XRPL] Error during disconnect from ${network}:`, error);
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

  /**
   * Fetches account information from the XRPL network.
   * Returns balance, sequence number, and other account details.
   * 
   * @param address - The XRPL account address to query
   * @param network - The network to query (mainnet or testnet)
   * @returns Account info including balance and sequence, or error if account not found
   */
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
      console.error('[XRPL] Error fetching account info:', error);
      throw error;
    }
  }

  async getServerInfo(network: XRPLNetwork): Promise<{ reserve_base_xrp: number; reserve_inc_xrp: number }> {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({
        command: 'server_info'
      });
      
      const validatedLedger = response.result?.info?.validated_ledger;
      if (!validatedLedger) {
        warn('No validated_ledger in server_info, using fallback reserves');
        return { reserve_base_xrp: 1, reserve_inc_xrp: 0.2 };
      }
      
      return {
        reserve_base_xrp: validatedLedger.reserve_base_xrp || 1,
        reserve_inc_xrp: validatedLedger.reserve_inc_xrp || 0.2
      };
    } catch (error) {
      console.error('[XRPL] Error fetching server info:', error);
      return { reserve_base_xrp: 1, reserve_inc_xrp: 0.2 };
    }
  }

  /**
   * Checks if a node has complete ledger history by examining server_info.
   * A node is considered to have full history if its complete_ledgers starts from
   * a very early ledger (below 1000000, which covers early XRPL history).
   */
  private async hasCompleteHistory(connector: XRPLConnector): Promise<boolean> {
    try {
      const response = await connector.request({ command: 'server_info' });
      const completeLedgers = response.result?.info?.complete_ledgers;
      
      if (!completeLedgers || completeLedgers === 'empty') {
        return false;
      }
      
      // Parse the first range start (e.g., "32570-100525000" -> 32570)
      const firstRangeStart = parseInt(completeLedgers.split('-')[0].split(',')[0], 10);
      
      // Consider it full history if ledgers start from below 1,000,000
      // Most full history servers start from ledger 32570 (the earliest available)
      const hasFullHistory = !isNaN(firstRangeStart) && firstRangeStart < 1000000;
      
      log(`Node complete_ledgers: ${completeLedgers}, hasFullHistory: ${hasFullHistory}`);
      return hasFullHistory;
    } catch (error) {
      warn(`Failed to check server_info for complete history`);
      return false;
    }
  }

  /**
   * Fetches transaction history for an account.
   * 
   * Priority order:
   * 1. If custom full history server is configured → use it
   * 2. If custom node URL is configured → check if it has full history, use it if yes, otherwise fall back
   * 3. Otherwise → use default full history server
   * 
   * @param address - The XRPL account address
   * @param network - The network to query (mainnet or testnet)
   * @param limit - Maximum number of transactions to return (default: 20)
   * @returns Array of account transactions with metadata
   */
  async getAccountTransactions(address: string, network: XRPLNetwork, limit: number = 20) {
    const customFullHistory = this.fullHistoryEndpoints[network];
    const customNode = this.customEndpoints[network];
    const defaultFullHistory = this.defaultFullHistoryEndpoints[network];
    
    // Helper to make account_tx request
    const makeRequest = async (connector: XRPLConnector) => {
      const response = await connector.request({
        command: 'account_tx',
        account: address,
        limit,
        ledger_index_min: -1,
        ledger_index_max: -1
      });
      return response.result;
    };
    
    // Case 1: Custom full history server is configured - use it directly
    if (customFullHistory) {
      log(`Using custom full history server: ${customFullHistory}`);
      let connector: XRPLConnector | null = null;
      try {
        connector = this.createConnector(customFullHistory);
        await connector.connect();
        return await makeRequest(connector);
      } catch (error: any) {
        if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
          return { transactions: [], account: address, marker: undefined };
        }
        console.error('[XRPL] Error fetching transactions from custom full history server:', error);
        throw error;
      } finally {
        if (connector) {
          try { await connector.disconnect(); } catch {}
        }
      }
    }
    
    // Case 2: Custom node URL is configured - check if it has full history first
    if (customNode) {
      log(`Checking if custom node has full history: ${customNode}`);
      try {
        await this.connect(network);
        const state = this.clients.get(network);
        if (state) {
          const hasFullHistory = await this.hasCompleteHistory(state.connector);
          
          if (hasFullHistory) {
            log(`Custom node has full history, using it for transactions`);
            try {
              const result = await makeRequest(state.connector);
              return result;
            } catch (error: any) {
              if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
                return { transactions: [], account: address, marker: undefined };
              }
              throw error;
            }
          } else {
            log(`Custom node lacks full history, falling back to default full history server`);
          }
        }
      } catch (error: any) {
        if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
          return { transactions: [], account: address, marker: undefined };
        }
        warn(`Custom node check failed, falling back to default full history server`);
      }
      
      // Fall back to default full history server
      let fallbackConnector: XRPLConnector | null = null;
      try {
        log(`Using default full history server: ${defaultFullHistory}`);
        fallbackConnector = this.createConnector(defaultFullHistory);
        await fallbackConnector.connect();
        return await makeRequest(fallbackConnector);
      } catch (fallbackError: any) {
        if (fallbackError.data?.error === 'actNotFound' || fallbackError.error === 'actNotFound') {
          return { transactions: [], account: address, marker: undefined };
        }
        console.error('[XRPL] Error fetching transactions from default full history server:', fallbackError);
        throw fallbackError;
      } finally {
        if (fallbackConnector) {
          try { await fallbackConnector.disconnect(); log('Disconnected default full history server connector'); } catch {}
        }
      }
    }
    
    // Case 3: No custom endpoints - use default full history server
    log(`Using default full history server: ${defaultFullHistory}`);
    let connector: XRPLConnector | null = null;
    try {
      connector = this.createConnector(defaultFullHistory);
      await connector.connect();
      return await makeRequest(connector);
    } catch (error: any) {
      if (error.data?.error === 'actNotFound' || error.error === 'actNotFound') {
        return { transactions: [], account: address, marker: undefined };
      }
      console.error('[XRPL] Error fetching transactions:', error);
      throw error;
    } finally {
      if (connector) {
        try { await connector.disconnect(); log('Disconnected full history server connector'); } catch {}
      }
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
      
      console.error('[XRPL] Error fetching account lines:', error);
      
      if (error.name === 'DisconnectedError' || error.message?.includes('disconnected')) {
        log('Retrying account lines fetch after disconnection...');
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
      console.error('[XRPL] Error fetching account offers:', error);
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
      console.error('[XRPL] Error fetching order book:', error);
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
      } catch {
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

  async getOrderBookPrice(
    network: XRPLNetwork,
    takerGets: { currency: string; issuer?: string },
    takerPays: { currency: string; issuer?: string }
  ): Promise<{ bidPrice: number | null; askPrice: number | null; spread: number | null }> {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }

    try {
      // Fetch both sides of the order book
      const [bidsResponse, asksResponse] = await Promise.all([
        // Bids: People buying takerGets (selling takerPays)
        state.connector.request({
          command: 'book_offers',
          taker_gets: takerGets.currency === 'XRP' 
            ? { currency: 'XRP' }
            : { currency: takerGets.currency, issuer: takerGets.issuer },
          taker_pays: takerPays.currency === 'XRP'
            ? { currency: 'XRP' }
            : { currency: takerPays.currency, issuer: takerPays.issuer },
          limit: 1
        }),
        // Asks: People selling takerGets (buying takerPays)
        state.connector.request({
          command: 'book_offers',
          taker_gets: takerPays.currency === 'XRP'
            ? { currency: 'XRP' }
            : { currency: takerPays.currency, issuer: takerPays.issuer },
          taker_pays: takerGets.currency === 'XRP'
            ? { currency: 'XRP' }
            : { currency: takerGets.currency, issuer: takerGets.issuer },
          limit: 1
        })
      ]);

      const bids = bidsResponse?.result?.offers || [];
      const asks = asksResponse?.result?.offers || [];

      let bidPrice: number | null = null;
      let askPrice: number | null = null;

      // Calculate bid price (highest buy order)
      if (bids.length > 0) {
        const topBid = bids[0];
        const getsAmount = typeof topBid.TakerGets === 'string' 
          ? parseFloat(this.formatXRPAmount(topBid.TakerGets))
          : parseFloat(topBid.TakerGets.value);
        const paysAmount = typeof topBid.TakerPays === 'string'
          ? parseFloat(this.formatXRPAmount(topBid.TakerPays))
          : parseFloat(topBid.TakerPays.value);
        
        if (getsAmount > 0) {
          bidPrice = paysAmount / getsAmount;
        }
      }

      // Calculate ask price (lowest sell order)
      if (asks.length > 0) {
        const topAsk = asks[0];
        const getsAmount = typeof topAsk.TakerPays === 'string'
          ? parseFloat(this.formatXRPAmount(topAsk.TakerPays))
          : parseFloat(topAsk.TakerPays.value);
        const paysAmount = typeof topAsk.TakerGets === 'string'
          ? parseFloat(this.formatXRPAmount(topAsk.TakerGets))
          : parseFloat(topAsk.TakerGets.value);
        
        if (getsAmount > 0) {
          askPrice = paysAmount / getsAmount;
        }
      }

      // Calculate mid-market price (average of bid and ask)
      const spread = bidPrice && askPrice ? askPrice - bidPrice : null;

      return { bidPrice, askPrice, spread };
    } catch (error) {
      console.error('[XRPL] Error fetching order book:', error);
      return { bidPrice: null, askPrice: null, spread: null };
    }
  }

  async getReserveRequirements(network: XRPLNetwork): Promise<{ baseReserve: number; incrementReserve: number }> {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    try {
      const response = await state.connector.request({ command: 'server_state' });
      
      if (response?.result?.state?.validated_ledger) {
        const ledger = response.result.state.validated_ledger;
        const baseReserveDrops = ledger.reserve_base || ledger.reserve_base_xrp * 1000000;
        const incrementReserveDrops = ledger.reserve_inc || ledger.reserve_inc_xrp * 1000000;
        
        return {
          baseReserve: baseReserveDrops / 1000000,
          incrementReserve: incrementReserveDrops / 1000000
        };
      }
      
      warn('Unable to fetch reserve requirements from XRPL, using fallback values');
      return {
        baseReserve: 20,
        incrementReserve: 2
      };
    } catch (error) {
      console.error('[XRPL] Error fetching reserve requirements:', error);
      return {
        baseReserve: 20,
        incrementReserve: 2
      };
    }
  }

  /**
   * Submits a signed transaction blob to the XRPL network.
   * Used after Keystone hardware wallet signing to broadcast the transaction.
   * 
   * @param txBlob - The hex-encoded signed transaction blob from Keystone
   * @param network - The network to submit to (mainnet or testnet)
   * @returns Transaction result including hash and engine result code
   * @throws Error if transaction fails with non-success engine result
   */
  async submitTransaction(txBlob: string, network: XRPLNetwork): Promise<{
    success: boolean;
    hash?: string;
    engineResult: string;
    engineResultMessage?: string;
  }> {
    await this.connect(network);
    const state = this.clients.get(network);
    if (!state) {
      throw new Error(`Client not initialized for network: ${network}`);
    }
    
    log(`Submitting transaction to XRPL ${network}...`);
    
    try {
      const response = await state.connector.request({
        command: 'submit',
        tx_blob: txBlob
      });
      
      const result = response.result;
      log('Transaction submitted');
      
      const engineResult = result.engine_result || 'unknown';
      const engineResultMessage = result.engine_result_message || '';
      
      const isSuccess = engineResult === 'tesSUCCESS' || 
                        engineResult.startsWith('ter') || 
                        engineResult.startsWith('tec');
      
      if (!isSuccess) {
        console.error('[XRPL] Transaction submission failed with result:', engineResult);
        throw new Error(`Transaction failed: ${engineResultMessage || engineResult}`);
      }
      
      log('Transaction submitted successfully with result:', engineResult);
      
      return {
        success: isSuccess,
        hash: result.tx_json?.hash || result.hash,
        engineResult,
        engineResultMessage
      };
    } catch (error: any) {
      console.error('[XRPL] Error submitting transaction:', error);
      throw error;
    }
  }
}

export const xrplClient = new XRPLClient();
