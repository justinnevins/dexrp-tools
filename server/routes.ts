import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertTrustlineSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // XRPL JSON-RPC Proxy
  app.post("/api/xrpl-proxy", async (req, res) => {
    try {
      const { endpoint, payload } = req.body;
      
      if (!endpoint || !payload) {
        return res.status(400).json({ error: "Missing endpoint or payload" });
      }
      
      // Validate endpoint format
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        return res.status(400).json({ error: "Invalid endpoint protocol" });
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ 
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: errorText
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('XRPL Proxy error:', error);
      res.status(500).json({ 
        error: 'Failed to proxy request',
        message: error.message 
      });
    }
  });

  // Wallet routes
  app.get("/api/wallets", async (req, res) => {
    try {
      const wallets = await storage.getAllWallets();
      res.json(wallets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wallets" });
    }
  });

  app.get("/api/wallets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const wallet = await storage.getWallet(id);
      
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });

  app.post("/api/wallets", async (req, res) => {
    try {
      const walletData = insertWalletSchema.parse(req.body);
      const wallet = await storage.createWallet(walletData);
      res.status(201).json(wallet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid wallet data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create wallet" });
    }
  });

  app.patch("/api/wallets/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const wallet = await storage.updateWallet(id, updates);
      
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      res.json(wallet);
    } catch (error) {
      res.status(500).json({ error: "Failed to update wallet" });
    }
  });

  app.delete("/api/wallets", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ message: "All wallet data cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear wallet data" });
    }
  });

  // Transaction routes
  app.get("/api/transactions/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const transactions = await storage.getTransactionsByWallet(walletId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid transaction data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const transaction = await storage.updateTransaction(id, updates);
      
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Submit signed transaction to XRPL network
  app.post("/api/transactions/submit", async (req, res) => {
    let client: any = null;
    try {
      const { walletId, txBlob, txHash, transactionData, network = 'testnet', endpoint } = req.body;
      
      console.log('Submitting transaction to XRPL network:', network);
      console.log('Transaction blob:', txBlob);
      
      // Use custom endpoint if provided, otherwise use defaults
      const xrplEndpoint = endpoint || (network === 'mainnet' 
        ? 'wss://xrplcluster.com'
        : 'wss://s.altnet.rippletest.net:51233');
      
      console.log('Using XRPL endpoint:', xrplEndpoint);
      
      let submitResult: any;
      
      // Check if endpoint is WebSocket or HTTP/HTTPS
      if (xrplEndpoint.startsWith('ws://') || xrplEndpoint.startsWith('wss://')) {
        // WebSocket endpoint - use xrpl.Client
        const xrpl = await import('xrpl');
        client = new xrpl.Client(xrplEndpoint);
        
        console.log('Connecting to XRPL via WebSocket...');
        await client.connect();
        console.log(`Connected to XRPL ${network} at ${xrplEndpoint}`);
        
        // Submit the signed transaction blob
        console.log('Calling submit...');
        submitResult = await client.submit(txBlob);
      } else if (xrplEndpoint.startsWith('http://') || xrplEndpoint.startsWith('https://')) {
        // JSON-RPC endpoint - use direct HTTP request
        console.log('Submitting via JSON-RPC...');
        
        const response = await fetch(xrplEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: 'submit',
            params: [{
              tx_blob: txBlob
            }]
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`JSON-RPC request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }
        
        submitResult = await response.json();
      } else {
        throw new Error(`Unsupported endpoint protocol: ${xrplEndpoint}`);
      }
      console.log('Transaction submitted:', JSON.stringify(submitResult, null, 2));
      
      // Check submission result
      if (submitResult.result.engine_result !== 'tesSUCCESS' && 
          !submitResult.result.engine_result.startsWith('ter') &&
          !submitResult.result.engine_result.startsWith('tec')) {
        // If result code doesn't start with ter (retry) or tec (claim fee only), it failed
        console.error('Transaction submission failed with result:', submitResult.result.engine_result);
        console.error('Result message:', submitResult.result.engine_result_message);
        throw new Error(`Transaction failed: ${submitResult.result.engine_result_message || submitResult.result.engine_result}`);
      }
      
      console.log('Transaction submitted successfully with result:', submitResult.result.engine_result);
      
      // Store the transaction in the database
      // Note: submit() doesn't wait for validation, so we mark as pending
      const transaction = await storage.createTransaction({
        walletId,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: 'XRP',
        fromAddress: transactionData.fromAddress,
        toAddress: transactionData.toAddress,
        destinationTag: transactionData.destinationTag,
        status: submitResult.result.engine_result === 'tesSUCCESS' ? 'completed' : 'pending',
        txHash: submitResult.result.tx_json?.hash || txHash
      });
      
      console.log('Transaction stored in database:', transaction);
      
      // Disconnect WebSocket client if it was used
      if (client) {
        await client.disconnect();
        console.log('Disconnected from XRPL');
      }
      
      res.status(201).json({
        success: true,
        transaction,
        networkResult: {
          hash: submitResult.result.tx_json?.hash || txHash,
          status: submitResult.result.engine_result,
          message: submitResult.result.engine_result_message,
          validated: false // submit() doesn't wait for validation
        }
      });
    } catch (error) {
      console.error('Transaction submission failed:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Request body:', req.body);
      
      // Make sure to disconnect client if there was an error
      if (client) {
        try {
          await client.disconnect();
          console.log('Disconnected from XRPL after error');
        } catch (disconnectError) {
          console.error('Error disconnecting:', disconnectError);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to submit transaction to network",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Trustline routes
  app.get("/api/trustlines/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const trustlines = await storage.getTrustlinesByWallet(walletId);
      res.json(trustlines);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trustlines" });
    }
  });

  app.post("/api/trustlines", async (req, res) => {
    try {
      const trustlineData = insertTrustlineSchema.parse(req.body);
      const trustline = await storage.createTrustline(trustlineData);
      res.status(201).json(trustline);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trustline data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create trustline" });
    }
  });

  app.patch("/api/trustlines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const trustline = await storage.updateTrustline(id, updates);
      
      if (!trustline) {
        return res.status(404).json({ error: "Trustline not found" });
      }
      
      res.json(trustline);
    } catch (error) {
      res.status(500).json({ error: "Failed to update trustline" });
    }
  });

  // Keystone Hardware Wallet API endpoints
  app.post("/api/keystone/xrp/sign-request", async (req, res) => {
    try {
      const { default: KeystoneSDK } = await import('@keystonehq/keystone-sdk');
      const { transaction } = req.body;
      
      console.log('Backend: Creating Keystone sign request for:', transaction);
      
      // Initialize Keystone SDK  
      const keystoneSDK = new KeystoneSDK();
      
      // Format transaction for Keystone
      const xrpTransaction: any = {
        ...transaction,
        Fee: String(transaction.Fee),
        Sequence: Number(transaction.Sequence),
        LastLedgerSequence: Number(transaction.LastLedgerSequence)
      };

      // Only add Flags if it's defined
      if (transaction.Flags !== undefined && transaction.Flags !== null) {
        xrpTransaction.Flags = Number(transaction.Flags);
      }

      // Only add Amount for Payment transactions
      if (transaction.TransactionType === 'Payment' && transaction.Amount) {
        // For tokens, Amount is an object {currency, value, issuer}
        // For XRP, Amount is a string of drops
        if (typeof transaction.Amount === 'object') {
          xrpTransaction.Amount = transaction.Amount;
        } else {
          xrpTransaction.Amount = String(transaction.Amount);
        }
      }
      
      console.log('Backend: Formatted transaction:', xrpTransaction);
      
      // Let the SDK handle everything - UR format, Bytewords encoding, etc.
      const ur = keystoneSDK.xrp.generateSignRequest(xrpTransaction);
      
      console.log('Backend: SDK generated UR type:', ur.type);
      console.log('Backend: CBOR buffer length:', ur.cbor.length);
      
      // Return exactly what AnimatedQRCode component needs
      res.json({
        type: ur.type,
        cbor: ur.cbor.toString('hex'),
        requestId: crypto.randomUUID()
      });
    } catch (error: any) {
      console.error('Backend: Keystone sign request error:', error);
      res.status(500).json({ 
        error: 'Failed to generate Keystone sign request',
        details: error.message 
      });
    }
  });

  /**
   * Decode XRP transaction signature from Keystone hardware wallet QR code
   * 
   * CRITICAL: This endpoint handles the decoding of signed transactions from Keystone.
   * The Keystone device returns UR strings like "ur:bytes/58d2..." which appear to be
   * hex-encoded but are actually valid Bytewords encoding.
   * 
   * CORRECT APPROACH (current implementation):
   * 1. Use URDecoder to parse the full UR string (handles both hex-like and Bytewords)
   * 2. Extract type (Buffer) and cbor (Uint8Array) from decoded result
   * 3. Convert to format Keystone SDK expects: new UR(Buffer.from(cborHex, 'hex'), typeString)
   * 4. Pass to keystoneSDK.xrp.parseSignature()
   * 
   * FAILED APPROACHES (do not use):
   * - Manual regex parsing of UR string and treating payload as hex
   * - Uppercasing the UR string before decoding
   * - Direct CBOR parsing without URDecoder
   * - Creating UR objects with raw type strings
   * 
   * Reference: https://dev.keyst.one/docs/integration-tutorial-advanced/xrp
   */
  app.post("/api/keystone/xrp/decode-signature", async (req, res) => {
    try {
      const { default: KeystoneSDK } = await import('@keystonehq/keystone-sdk');
      const { URDecoder, UR } = await import('@ngraveio/bc-ur');
      
      const { ur: urString } = req.body;
      
      console.log('Backend: Decoding Keystone signature from UR:', urString.substring(0, 50) + '...');
      
      // Initialize Keystone SDK
      const keystoneSDK = new KeystoneSDK();
      
      // Step 1: Check if this is a single-part or multi-part UR
      // Single-part: ur:bytes/<payload>
      // Multi-part: ur:bytes/<seqNum>-<seqLen>/<payload>
      const isSinglePart = !urString.match(/ur:[^/]+\/\d+-\d+\//);
      
      let decodedUR;
      
      if (isSinglePart) {
        // For single-part URs, manually parse if it's hex-encoded
        // TrustSet transactions come as: ur:bytes/58ca1200... (lowercase hex)
        // Payment/OfferCreate come as: ur:bytes/HDRFBGAE... (Bytewords)
        console.log('Backend: Decoding single-part UR');
        
        // Extract type and payload from ur:type/payload format
        const match = urString.match(/^ur:([^/]+)\/(.+)$/);
        if (!match) {
          throw new Error('Invalid UR format');
        }
        
        const [, type, payload] = match;
        
        // Check if payload is hex (only contains 0-9, a-f)
        const isHex = /^[0-9a-f]+$/i.test(payload);
        
        if (isHex) {
          // Hex-encoded UR - manually decode
          console.log('Backend: Detected hex-encoded UR (minimal encoding)');
          decodedUR = {
            type: Buffer.from(type),
            cbor: Buffer.from(payload, 'hex')
          };
        } else {
          // Bytewords-encoded UR - use URDecoder
          console.log('Backend: Detected Bytewords-encoded UR');
          const decoder = new URDecoder();
          decoder.receivePart(urString);
          
          if (!decoder.isComplete()) {
            throw new Error('UR decoding incomplete');
          }
          
          decodedUR = decoder.resultUR();
        }
      } else {
        // For multi-part URs, use URDecoder (existing flow for large transactions)
        console.log('Backend: Decoding multi-part UR');
        const decoder = new URDecoder();
        decoder.receivePart(urString);
        
        if (!decoder.isComplete()) {
          throw new Error('UR decoding incomplete - multi-part UR requires all fragments');
        }
        
        decodedUR = decoder.resultUR();
      }
      
      // Step 2: Extract decoded UR components
      
      console.log('Backend: Decoded UR type (buffer):', decodedUR.type);
      console.log('Backend: Decoded CBOR length:', decodedUR.cbor.length);
      
      // Step 3: Convert to Keystone SDK format
      // decodedUR.type is a Buffer, decodedUR.cbor is a Uint8Array
      // Keystone SDK expects: new UR(Buffer.from(cbor, "hex"), type)
      const cborHex = Buffer.from(decodedUR.cbor).toString('hex');
      const typeString = decodedUR.type.toString();
      
      console.log('Backend: Type string:', typeString);
      console.log('Backend: CBOR hex (first 50 chars):', cborHex.substring(0, 50));
      
      // Step 4: Create UR object per Keystone documentation
      const ur = new UR(Buffer.from(cborHex, 'hex'), typeString);
      
      console.log('Backend: Created UR object for parseSignature');
      
      // Step 5: Parse the XRP signature using Keystone SDK
      const signature = keystoneSDK.xrp.parseSignature(ur);
      
      console.log('Backend: Parsed signature:', signature);
      
      // Return the signature data
      const parsedSignature: any = signature;
      res.json({
        signature: typeof parsedSignature === 'string' ? parsedSignature : parsedSignature.signature,
        requestId: typeof parsedSignature === 'object' && parsedSignature.requestId ? parsedSignature.requestId : crypto.randomUUID()
      });
    } catch (error: any) {
      console.error('Backend: Keystone decode signature error:', error);
      res.status(500).json({ 
        error: 'Failed to decode Keystone signature',
        details: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
