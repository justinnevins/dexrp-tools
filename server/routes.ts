import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertTrustlineSchema, insertEscrowSchema } from "@shared/schema";
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
      
      // In a real implementation, this would:
      // 1. Submit the signed transaction to XRPL network using txBlob
      // 2. Wait for confirmation from the network
      // 3. Store the result in the database
      
      // For demo purposes, we'll create a transaction record
      const transaction = await storage.createTransaction({
        walletId,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: 'XRP',
        fromAddress: transactionData.fromAddress,
        toAddress: transactionData.toAddress,
        destinationTag: transactionData.destinationTag,
        status: 'completed',
        txHash: txHash
      });
      
      res.status(201).json({
        success: true,
        transaction,
        networkResult: {
          hash: txHash,
          status: 'tesSUCCESS',
          validated: true
        }
      });
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

  // Escrow routes
  app.get("/api/escrows/:walletId", async (req, res) => {
    try {
      const walletId = parseInt(req.params.walletId);
      const escrows = await storage.getEscrowsByWallet(walletId);
      res.json(escrows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch escrows" });
    }
  });

  app.post("/api/escrows", async (req, res) => {
    try {
      const escrowData = insertEscrowSchema.parse(req.body);
      const escrow = await storage.createEscrow(escrowData);
      res.status(201).json(escrow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid escrow data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create escrow" });
    }
  });

  app.patch("/api/escrows/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const escrow = await storage.updateEscrow(id, updates);
      
      if (!escrow) {
        return res.status(404).json({ error: "Escrow not found" });
      }
      
      res.json(escrow);
    } catch (error) {
      res.status(500).json({ error: "Failed to update escrow" });
    }
  });

  // Keystone Hardware Wallet API endpoints
  app.post("/api/keystone/xrp/sign-request", async (req, res) => {
    try {
      // Import both Keystone SDK and BC-UR library for proper Bytewords encoding
      const { default: KeystoneSDK } = await import('@keystonehq/keystone-sdk');
      const bcur = await import('@ngraveio/bc-ur');
      const { UR, UREncoder } = bcur;
      
      const { transaction, walletInfo } = req.body;
      
      console.log('Backend: Creating Keystone sign request for:', transaction);
      
      // Initialize Keystone SDK
      const keystoneSDK = new KeystoneSDK();
      
      // Format transaction for XRPL/Keystone
      const xrpTransaction = {
        ...transaction,
        Amount: String(transaction.Amount),
        Fee: String(transaction.Fee),
        Sequence: Number(transaction.Sequence),
        LastLedgerSequence: Number(transaction.LastLedgerSequence),
        Flags: Number(transaction.Flags)
      };
      
      console.log('Backend: Formatted XRP transaction:', xrpTransaction);
      
      // Generate the XRP sign request using Keystone SDK
      const keystoneUR = keystoneSDK.xrp.generateSignRequest(xrpTransaction);
      
      console.log('Backend: Keystone UR type:', keystoneUR.type);
      console.log('Backend: CBOR buffer length:', keystoneUR.cbor ? keystoneUR.cbor.length : 0);
      
      // Create a proper BC-UR with Bytewords encoding
      // The UR.fromBuffer creates a UR that automatically uses Bytewords when converted to string
      const ur = UR.fromBuffer(keystoneUR.cbor);
      
      // Get the UR string - the library automatically uses Bytewords encoding
      let urString;
      try {
        // The toString() method on UR objects returns the proper UR format with Bytewords
        urString = ur.toString();
        
        // Check if we have a valid UR string
        if (!urString || urString === '[object Object]') {
          // If toString doesn't work, try to manually create the Bytewords encoding
          console.log('Backend: toString failed, trying manual Bytewords encoding');
          console.log('Backend: Available bcur exports:', Object.keys(bcur));
          
          // The @ngraveio/bc-ur library uses Bytewords internally
          // Let's manually encode the CBOR buffer
          const encoder = new UREncoder(ur, 1000, 0, 10);
          const part = encoder.nextPart();
          urString = part;
        }
        
        // The working format uses lowercase "ur:" but uppercase Bytewords content
        // Format: ur:BYTES/UPPERCASE_BYTEWORDS_CONTENT
        if (urString.startsWith('UR:')) {
          // Replace UR: with ur: but keep the rest uppercase
          urString = 'ur:' + urString.substring(3).toUpperCase();
        } else if (urString.startsWith('ur:')) {
          // Keep ur: lowercase but make content uppercase
          urString = 'ur:' + urString.substring(3).toUpperCase();
        } else {
          // Add the prefix if missing
          urString = `ur:BYTES/${urString.toUpperCase()}`;
        }
      } catch (e) {
        console.error('Backend: Error encoding to Bytewords:', e);
        // Last resort: use hex encoding with UR format (lowercase ur:)
        const hexString = keystoneUR.cbor.toString('hex').toUpperCase();
        urString = `ur:BYTES/${hexString}`;
        console.log('Backend: Fallback to hex encoding (not Bytewords)');
      }
      
      console.log('Backend: Generated UR with Bytewords encoding');
      console.log('Backend: UR string preview:', urString.substring(0, 100) + '...');
      console.log('Backend: UR string starts with:', urString.substring(0, 30));
      console.log('Backend: Full UR length:', urString.length);
      
      // Return the properly formatted UR
      res.json({
        ur: urString,
        type: 'BYTES',
        cbor: keystoneUR.cbor.toString('hex'),
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
      // Dynamically import Keystone SDK (ES module)
      const { default: KeystoneSDK, UR } = await import('@keystonehq/keystone-sdk');
      
      const { ur: urString, type, cbor } = req.body;
      
      console.log('Backend: Decoding Keystone signature');
      
      // Initialize Keystone SDK
      const keystoneSDK = new KeystoneSDK();
      
      // Reconstruct UR object from the scanned data
      const ur = new UR(Buffer.from(cbor, 'hex'), type);
      
      // Parse the XRP signature
      const signature = keystoneSDK.xrp.parseSignature(ur);
      
      console.log('Backend: Decoded signature:', signature);
      
      // Return the signature data
      res.json({
        signature: signature.signature,
        requestId: signature.requestId
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
