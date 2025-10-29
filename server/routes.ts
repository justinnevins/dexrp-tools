import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertTrustlineSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
    try {
      const { walletId, txBlob, txHash, transactionData } = req.body;
      
      console.log('Submitting transaction to XRPL network...');
      console.log('Transaction blob:', txBlob);
      
      // Connect to XRPL and submit the transaction
      const xrpl = await import('xrpl');
      const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233'); // Testnet
      
      await client.connect();
      console.log('Connected to XRPL testnet');
      
      try {
        // Submit the signed transaction blob
        const submitResult = await client.submitAndWait(txBlob);
        console.log('Transaction submitted:', submitResult);
        
        // Store the transaction in the database
        const transaction = await storage.createTransaction({
          walletId,
          type: transactionData.type,
          amount: transactionData.amount,
          currency: 'XRP',
          fromAddress: transactionData.fromAddress,
          toAddress: transactionData.toAddress,
          destinationTag: transactionData.destinationTag,
          status: submitResult.result.meta.TransactionResult === 'tesSUCCESS' ? 'completed' : 'failed',
          txHash: submitResult.result.hash
        });
        
        await client.disconnect();
        
        res.status(201).json({
          success: true,
          transaction,
          networkResult: {
            hash: submitResult.result.hash,
            status: submitResult.result.meta.TransactionResult,
            validated: submitResult.result.validated,
            ledgerIndex: submitResult.result.ledger_index
          }
        });
      } finally {
        await client.disconnect();
      }
    } catch (error) {
      console.error('Transaction submission failed:', error);
      console.error('Request body:', req.body);
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
      const xrpTransaction = {
        ...transaction,
        Amount: String(transaction.Amount),
        Fee: String(transaction.Fee),
        Sequence: Number(transaction.Sequence),
        LastLedgerSequence: Number(transaction.LastLedgerSequence),
        Flags: Number(transaction.Flags)
      };
      
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

  app.post("/api/keystone/xrp/decode-signature", async (req, res) => {
    try {
      const { default: KeystoneSDK } = await import('@keystonehq/keystone-sdk');
      const bcur = await import('@ngraveio/bc-ur');
      const { URDecoder } = bcur;
      
      const { ur: urString } = req.body;
      
      console.log('Backend: Decoding Keystone signature from UR:', urString.substring(0, 50) + '...');
      
      // Initialize Keystone SDK
      const keystoneSDK = new KeystoneSDK();
      
      // Decode the UR string using BC-UR library
      const decoder = new URDecoder();
      
      // The UR string is already complete (single part), so we can decode it directly
      // Remove 'ur:' prefix if present and decode
      const urPart = urString.toLowerCase();
      decoder.receivePart(urPart);
      
      if (!decoder.isComplete()) {
        throw new Error('UR decoding incomplete');
      }
      
      const decodedUR = decoder.resultUR();
      console.log('Backend: Decoded UR type:', decodedUR.type);
      console.log('Backend: Decoded CBOR length:', decodedUR.cbor.length);
      
      // Parse the XRP signature using the decoded UR
      const signature = keystoneSDK.xrp.parseSignature(decodedUR);
      
      console.log('Backend: Parsed signature object:', JSON.stringify(signature, null, 2));
      console.log('Backend: Signature keys:', Object.keys(signature));
      
      // Return the signature data
      res.json({
        signature: signature.signature || signature,
        requestId: signature.requestId || crypto.randomUUID()
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
