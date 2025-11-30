import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWalletSchema, insertTransactionSchema, insertTrustlineSchema } from "@shared/schema";
import { z } from "zod";

function isPrivateIPv4(a: number, b: number, c: number, d: number): boolean {
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrInternalHost(hostname: string): boolean {
  let host = hostname.toLowerCase().trim();
  
  host = host.replace(/^\[|\]$/g, '');
  
  if (host === 'localhost' || host === '::1') {
    return true;
  }
  
  if (host === '169.254.169.254' || host === 'metadata.google.internal') {
    return true;
  }
  
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) return true;
    return isPrivateIPv4(a, b, c, d);
  }
  
  const mappedIPv4Match = host.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i);
  if (mappedIPv4Match) {
    const [, a, b, c, d] = mappedIPv4Match.map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) return true;
    return isPrivateIPv4(a, b, c, d);
  }
  
  const mappedIPv4HexMatch = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (mappedIPv4HexMatch) {
    const [, high, low] = mappedIPv4HexMatch;
    const highNum = parseInt(high, 16);
    const lowNum = parseInt(low, 16);
    const a = (highNum >> 8) & 0xff;
    const b = highNum & 0xff;
    const c = (lowNum >> 8) & 0xff;
    const d = lowNum & 0xff;
    return isPrivateIPv4(a, b, c, d);
  }
  
  if (host.startsWith('::ffff:')) return true;
  
  if (host.startsWith('fe80:') || host.startsWith('fe80::')) return true;
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  if (host.startsWith('::') && host !== '::ffff') return true;
  if (host === '0:0:0:0:0:0:0:1') return true;
  
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) {
    return true;
  }
  if (host.endsWith('.localdomain') || host.endsWith('.home.arpa') || host.endsWith('.intranet')) {
    return true;
  }
  
  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // XRPL JSON-RPC Proxy with SSRF protection
  app.post("/api/xrpl-proxy", async (req, res) => {
    try {
      const { endpoint, payload } = req.body;
      
      if (!endpoint || !payload) {
        return res.status(400).json({ error: "Missing endpoint or payload" });
      }
      
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        return res.status(400).json({ error: "Invalid endpoint protocol" });
      }
      
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(endpoint);
      } catch {
        return res.status(400).json({ error: "Invalid endpoint URL" });
      }
      
      if (isPrivateOrInternalHost(parsedUrl.hostname)) {
        return res.status(403).json({ error: "Access to internal networks is not allowed" });
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

  const httpServer = createServer(app);
  return httpServer;
}
