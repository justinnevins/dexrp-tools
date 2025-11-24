# XRPL Wallet - Mobile-First Hardware Wallet Integration

## Overview

This is a mobile-first XRP Ledger (XRPL) software wallet application built with React and Express. Its primary purpose is to integrate exclusively with the Keystone 3 Pro air-gapped hardware wallet using QR code-based transaction signing. The application provides a secure, user-friendly interface for managing XRP assets, tokens (trustlines), and transactions, emphasizing security through hardware wallet integration.

Key capabilities include:
- **Wallet Management**: Overview of balances, send/receive functionality, and transaction history.
- **Token Management**: Comprehensive trustline and token management (view, add, remove).
- **Profile Management**: Account settings and preferences.
- **DEX Trading**: Functionality for creating DEX offers with enhanced currency selection.

The project aims to deliver a streamlined, mobile-optimized experience for XRPL users seeking enhanced security through hardware wallet integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & UI**: React with TypeScript, Vite for bundling. UI components are built using shadcn/ui (Radix UI primitives) and styled with Tailwind CSS, following a "new-york" theme.
**State Management**: TanStack Query for server state management and custom hooks for XRPL interactions.
**Routing**: Wouter for client-side routing.
**Mobile-First Design**: Optimized for mobile devices with a dedicated mobile app layout, bottom navigation, and a maximum width constraint.
**Data Storage**: Client-side persistence using browser localStorage for wallets, transactions, and trustlines, eliminating backend database dependencies.
**Native Mobile Apps**: Capacitor integration enables building standalone Android and iOS apps from the same codebase, with platform detection and automatic CORS bypass for native environments.

### Backend Architecture

**Server Framework**: Express.js with TypeScript, serving API endpoints and Vite development middleware.
**API Design**: RESTful API for wallet, transaction, and trustline management.
**Storage Layer**: Includes in-memory storage and Drizzle ORM schema definitions, though the primary data storage is client-side.

### Hardware Wallet Integration

**Keystone 3 Pro (Exclusive)**: Utilizes QR code-based air-gapped communication via `@keystonehq/keystone-sdk` and `@ngraveio/bc-ur`. Unsigned transactions are displayed as QR codes, scanned by the Keystone 3 Pro, signed offline, and the signed transaction QR is scanned back into the app for submission to the XRPL.

**Camera Integration**: `qr-scanner` library and `getUserMedia` API for QR code scanning, supporting multi-part QR codes for large transaction signatures.

**Critical Implementation Detail - Signature Decoding**: 

The Keystone device returns signed transactions as UR (Uniform Resource) strings in the format `ur:bytes/<encoded_data>`. The `<encoded_data>` portion appears to be hexadecimal but is actually valid Bytewords encoding that URDecoder can parse natively. 

**Correct decoding flow** (`/api/keystone/xrp/decode-signature` endpoint):
1. Use `URDecoder` from `@ngraveio/bc-ur` to parse the raw UR string
   - `decoder.receivePart(urString)` handles both hex-like and Bytewords-encoded URs
   - DO NOT manually parse, uppercase, or attempt to detect encoding type
2. Extract the decoded result with `decoder.resultUR()`
   - Returns `type` (as Buffer) and `cbor` (as Uint8Array)
3. Reconstruct a UR object for Keystone SDK:
   - Convert cbor to hex: `Buffer.from(decodedUR.cbor).toString('hex')`
   - Convert type to string: `decodedUR.type.toString()`
   - Create UR: `new UR(Buffer.from(cborHex, 'hex'), typeString)`
4. Parse signature: `keystoneSDK.xrp.parseSignature(ur)`

**Why this works**: URDecoder internally handles the UR format parsing and encoding detection. The Keystone SDK's `parseSignature()` method expects a UR object constructed from hex-encoded CBOR and a type string. The intermediate step of using URDecoder ensures proper decoding of the Keystone device's output format, regardless of how the data appears visually.

**Previous failed approaches**:
- Treating `ur:bytes/58d2...` as hex and manually decoding: Failed because URDecoder expects the full UR string
- Uppercasing the UR string: Broke hex-like encodings that are actually Bytewords
- Manual CBOR parsing without URDecoder: Missed the UR format structure
- Attempting to construct UR objects with raw type strings: Type validation failed

### XRPL Integration

**Client Library**: `xrpl` JavaScript library for all blockchain interactions.
**Network Support**: Per-wallet configuration for both Mainnet and Testnet.
**Connection Management**: Custom `XRPLClient` with a protocol-aware connector abstraction supports both WebSocket (ws/wss) and JSON-RPC (http/https) endpoints, automatically detecting the protocol from the URL and managing connection states. JSON-RPC requests are routed through a backend proxy (`/api/xrpl-proxy`) to bypass browser CORS restrictions, enabling seamless connection to custom nodes.
**Data Fetching**: Real-time account information, transaction history, and trustline data are fetched directly from XRPL nodes to ensure authenticity.
**Transaction Encoding**: `ripple-binary-codec` for encoding transactions into XRPL's binary format for hardware wallet signing.

### System Design Choices

- **Per-Wallet Network Configuration**: Each wallet stores its own network setting (Mainnet/Testnet), allowing for concurrent multi-network support without global state.
- **Streamlined UI**: Consolidated token management and removed redundant features (e.g., Quick Actions, Escrow functionality) to simplify the user experience.
- **Percentage-Based Amount Selection**: Implemented quick amount selection (25%, 50%, 75%, Max) for payments and DEX offers, with smart calculations accounting for XRPL reserves and fees.
- **Custom XRPL Node Support**: Users can configure custom WebSocket or JSON-RPC endpoints for XRPL interactions.
- **Full History Server Configuration**: Separate endpoint configuration for transaction history queries. By default, `getAccountTransactions` uses dedicated full-history servers (https://s1.ripple.com:51234 for Mainnet, https://s.altnet.rippletest.net:51234 for Testnet) to ensure complete transaction history. Users can optionally configure custom full-history servers. Falls back gracefully to the primary endpoint if the full history server fails.
- **Transaction Submission Through Custom Validators**: All transactions (Payment, TrustSet, OfferCreate, OfferCancel) are submitted through the user-configured custom endpoint when set. The `KeystoneTransactionSigner` component requires the network prop to ensure the correct network's custom endpoint is used for every transaction submission.
- **DEX Offer Tracking**: Comprehensive maker-side offer tracking with fill history persistence in browser storage. When users create offers (OfferCreate), the system stores original amounts, timestamps, and tracks partial fills by parsing transaction metadata from AffectedNodes. The UI displays enriched offer information including original vs remaining amounts, fill percentage, and detailed fill history. Taker-side instant trades (OfferCreate transactions that immediately consume order book offers) appear in transaction history as completed OfferCreate transactions.

## External Dependencies

**XRPL Network Endpoints**:
- Mainnet: `wss://xrplcluster.com` (WebSocket), `https://s1.ripple.com:51234` (JSON-RPC)
- Testnet: `wss://s.altnet.rippletest.net:51233` (WebSocket), `https://s.altnet.rippletest.net:51234` (JSON-RPC)
- Custom Endpoints: User-configurable for both WebSocket and JSON-RPC protocols.

**Hardware Wallet SDKs**:
- `@keystonehq/keystone-sdk`
- `@keystonehq/bc-ur-registry`
- `@ngraveio/bc-ur`
- `cbor-web`

**Pricing Data**: CoinGecko API for XRP/USD price (with fallback).

**Database** (Optional): PostgreSQL via Neon serverless (`@neondatabase/serverless`) with Drizzle ORM (primarily for schema definition, current implementation uses browser storage).

**UI Components**: Radix UI (via shadcn/ui) for accessible components.

**QR Code Libraries**:
- `qrcode` (generation)
- `qr-scanner` (scanning)

**Development Tools**: TypeScript, Vite, ESBuild, Drizzle Kit.

**Mobile App Packaging**: Capacitor for building native Android and iOS applications from the same codebase.