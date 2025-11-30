import { Client } from 'xrpl';
import { isNativeApp } from './platform';

export interface XRPLConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  request(params: any): Promise<any>;
  isConnected(): boolean;
}

export class WebSocketConnector implements XRPLConnector {
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

  getClient(): Client {
    return this.client;
  }
}

export class JsonRpcConnector implements XRPLConnector {
  private endpoint: string;
  private connected: boolean = false;
  private requestId: number = 1;

  constructor(endpoint: string) {
    this.endpoint = endpoint.endsWith('/') ? endpoint : endpoint + '/';
  }

  async connect(): Promise<void> {
    try {
      const response = await this.request({ command: 'server_info' });
      
      if (!response || !response.result || !response.result.info) {
        throw new Error('Invalid server_info response from JSON-RPC endpoint');
      }
      
      this.connected = true;
    } catch (error) {
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

      const isNative = isNativeApp();
      
      if (isNative) {
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

export interface ClientState {
  connector: XRPLConnector;
  isConnected: boolean;
  connectionPromise: Promise<void> | null;
  endpoint: string;
}

export function createConnector(endpoint: string): XRPLConnector {
  const protocol = endpoint.split('://')[0].toLowerCase();
  
  if (protocol === 'http' || protocol === 'https') {
    return new JsonRpcConnector(endpoint);
  } else if (protocol === 'ws' || protocol === 'wss') {
    return new WebSocketConnector(endpoint);
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
}
