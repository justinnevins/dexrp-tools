import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export type XRPLNetwork = 'mainnet' | 'testnet';

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  name: text("name"),
  address: text("address").notNull(),
  publicKey: text("publicKey"),
  balance: text("balance").notNull().default("0"),
  reservedBalance: text("reservedBalance").notNull().default("1"),
  isConnected: boolean("isConnected").notNull().default(false),
  hardwareWalletType: text("hardwareWalletType"),
  network: text("network").$type<XRPLNetwork>().notNull().default("mainnet"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("walletId").notNull(),
  type: text("type").notNull(), // 'sent', 'received'
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("XRP"),
  fromAddress: text("fromAddress"),
  toAddress: text("toAddress"),
  destinationTag: text("destinationTag"),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'failed'
  txHash: text("txHash"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const trustlines = pgTable("trustlines", {
  id: serial("id").primaryKey(),
  walletId: integer("walletId").notNull(),
  currency: text("currency").notNull(),
  issuer: text("issuer").notNull(),
  issuerName: text("issuerName").notNull(),
  balance: text("balance").notNull().default("0"),
  limit: text("limit").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertTrustlineSchema = createInsertSchema(trustlines).omit({
  id: true,
  createdAt: true,
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Trustline = typeof trustlines.$inferSelect;
export type InsertTrustline = z.infer<typeof insertTrustlineSchema>;
