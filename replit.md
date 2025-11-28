# DEXrp - XRPL DEX Trading Platform

## Overview

DEXrp is a mobile-first XRP Ledger (XRPL) DEX trading platform built with React and Express. Its primary purpose is to provide secure XRPL DEX trading with exclusive Keystone 3 Pro air-gapped hardware wallet integration using QR code-based transaction signing. The application provides a secure, user-friendly interface for managing XRP assets, tokens (trustlines), and DEX trading, emphasizing security through hardware wallet integration.

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

**Fully Client-Side Architecture**: All Keystone SDK operations (sign request generation and signature parsing) are performed entirely in the browser/app, with no backend dependencies. This enables:
- Offline transaction preparation capability
- Better security (transaction data stays on device)
- Native mobile apps operate independently without server connection
- Consistent behavior across web and mobile platforms

**Camera Integration**: `qr-scanner` library and `getUserMedia` API for QR code scanning, supporting multi-part QR codes for large transaction signatures.

**Client-Side Implementation** (`client/src/lib/keystone-client.ts`):

`prepareXrpSignRequest(transaction)`: Generates the unsigned transaction QR code data using Keystone SDK. Formats the XRPL transaction for Keystone and returns the UR type and CBOR hex data for AnimatedQRCode display.

`parseKeystoneSignature(urString)`: Decodes signed transaction QR codes from Keystone device. The Keystone returns UR strings in the format `ur:bytes/<encoded_data>`. The function handles both hex-encoded (minimal encoding) and Bytewords-encoded URs:
1. Detects encoding type by checking if payload contains only hex characters
2. For hex-encoded URs: directly parses the type and CBOR payload
3. For Bytewords-encoded URs: uses URDecoder from `@ngraveio/bc-ur`
4. Reconstructs the UR object for Keystone SDK parsing
5. Returns the signature hex string for transaction assembly

**Transaction Submission**: After signing, transactions are submitted directly to XRPL nodes using `xrplClient.submitTransaction()`, bypassing the backend entirely

### XRPL Integration

**Client Library**: `xrpl` JavaScript library for all blockchain interactions.
**Network Support**: Per-wallet configuration for both Mainnet and Testnet.
**Connection Management**: Custom `XRPLClient` with a protocol-aware connector abstraction supports both WebSocket (ws/wss) and JSON-RPC (http/https) endpoints, automatically detecting the protocol from the URL and managing connection states. **Hybrid Architecture**: Native apps connect directly to XRPL nodes (bypassing CORS), while web apps use the backend proxy (`/api/xrpl-proxy`) for CORS compliance.
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

**Pricing Data**: XRP/RLUSD price sourced directly from XRPL DEX order book for authentic, real-time market data.

**Database** (Optional): PostgreSQL via Neon serverless (`@neondatabase/serverless`) with Drizzle ORM (primarily for schema definition, current implementation uses browser storage).

**UI Components**: Radix UI (via shadcn/ui) for accessible components.

**QR Code Libraries**:
- `qrcode` (generation)
- `qr-scanner` (scanning)

**Development Tools**: TypeScript, Vite, ESBuild, Drizzle Kit.

**Mobile App Packaging**: Capacitor for building native Android and iOS applications from the same codebase.
- **Hybrid Architecture**: Native apps connect directly to XRPL nodes (bypassing CORS), while web apps use the backend proxy (`/api/xrpl-proxy`) for CORS compliance
- **Platform-Aware API**: `apiFetch` helper automatically uses absolute URLs (`VITE_API_BASE_URL`) for native apps while using relative paths for web

## Security Architecture

**Server Security**:
- **Helmet Middleware**: HTTP security headers including X-XSS-Protection, X-Content-Type-Options, X-Frame-Options for clickjacking protection
- **SSRF Protection**: XRPL proxy (`/api/xrpl-proxy`) includes comprehensive Server-Side Request Forgery protection blocking:
  - IPv4 private networks (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x)
  - IPv6-mapped IPv4 addresses (::ffff:192.168.x.x in dotted and hex formats)
  - IPv6 loopback and private ranges (::1, fe80::, fc/fd ULA)
  - Cloud metadata endpoints (169.254.169.254, metadata.google.internal)
  - Reserved ranges (carrier-grade NAT, benchmarking, documentation)
  - Private domain suffixes (.local, .internal, .localhost, .home.arpa)

**Client-Side Security**:
- **Conditional Debug Logging**: All client-side files use `import.meta.env.DEV` flag to only output debug logs in development mode. Pattern: `const isDev = import.meta.env.DEV; const log = (...args: any[]) => isDev && console.log('[Component]', ...args);`
- **No Sensitive Data in Logs**: Production builds suppress verbose transaction data logging. Wallet addresses, transaction payloads, and signed blobs are never logged.
- **Sanitized Error Logging**: All console.error statements use consistent bracket prefixes (e.g., `[XRPL]`, `[Keystone]`)

## Code Architecture

**QR Scanner Components** (Consolidated from 5 to 2 core scanners):
- `GeneralQRScanner`: Core unified scanner for XRPL addresses and generic QR data. Supports three modes: 'address' (validates XRPL addresses with checksum verification), 'generic' (passes raw data), 'ur-code' (validates UR format). Includes manual entry fallback, optional Keystone-specific instructions, and handles JSON-wrapped addresses and ripple: URI scheme.
- `KeystoneQRScanner`: Core specialized scanner for multi-part UR codes from Keystone hardware wallet signatures. Handles UR fragment collection and reassembly with progress indication.
- `KeystoneAccountScanner`: Wrapper component using GeneralQRScanner internally for extracting XRPL account address and public key from Keystone crypto-multi-accounts UR format.

**Removed Dead Code** (cleanup performed):
- `qr-code-modal.tsx`: Removed - was never imported or used anywhere in the codebase.
- `send-modal.tsx`: Removed - was bypassed by direct navigation to `/send` page from WalletBalance component.
- `security-confirmation-modal.tsx`: Removed - was only used by the removed SendModal flow.

**Key Library Files**:
- `keystone-client.ts`: Client-side Keystone SDK operations with comprehensive JSDoc documentation. Key functions: `prepareXrpSignRequest()` (generates UR-encoded sign request), `parseKeystoneSignature()` (decodes signed transaction URs with support for both hex and Bytewords encoding).
- `xrpl-client.ts`: XRPL network client with protocol-aware connectors and JSDoc documentation. Key functions: `getAccountInfo()`, `getAccountTransactions()`, `submitTransaction()`, `isValidAddress()` (checksum validation).
- `dex-utils.ts`: DEX offer tracking and fill detection utilities with comprehensive JSDoc documentation. Key functions: `extractOfferFills()` (parses AffectedNodes for partial fills), `enrichOfferWithStatus()` (combines stored and live offer data), `calculateBalanceChanges()` (computes XRP/token balance changes from metadata).

**Component Structure**:
- `components/modals/`: Modal dialogs for receive, trustline management, hardware wallet connection, and Keystone address input.
- `components/wallet/`: Wallet-related UI components (balance display, transaction list, empty state).
- `components/layout/`: Mobile app layout with bottom navigation.
- `pages/`: Page components including home, send, transactions, tokens, DEX, and profile.