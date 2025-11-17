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

### Backend Architecture

**Server Framework**: Express.js with TypeScript, serving API endpoints and Vite development middleware.
**API Design**: RESTful API for wallet, transaction, and trustline management.
**Storage Layer**: Includes in-memory storage and Drizzle ORM schema definitions, though the primary data storage is client-side.

### Hardware Wallet Integration

**Keystone 3 Pro (Exclusive)**: Utilizes QR code-based air-gapped communication via `@keystonehq/keystone-sdk` and `@ngraveio/bc-ur`. Unsigned transactions are displayed as QR codes, scanned by the Keystone 3 Pro, signed offline, and the signed transaction QR is scanned back into the app for submission to the XRPL.
**Camera Integration**: `qr-scanner` library and `getUserMedia` API for QR code scanning, supporting multi-part QR codes for large transaction signatures.

### XRPL Integration

**Client Library**: `xrpl` JavaScript library for all blockchain interactions.
**Network Support**: Per-wallet configuration for both Mainnet and Testnet.
**Connection Management**: Custom `XRPLClient` with a protocol-aware connector abstraction supports both WebSocket (ws/wss) and JSON-RPC (http/https) endpoints, automatically detecting the protocol from the URL and managing connection states.
**Data Fetching**: Real-time account information, transaction history, and trustline data are fetched directly from XRPL nodes to ensure authenticity.
**Transaction Encoding**: `ripple-binary-codec` for encoding transactions into XRPL's binary format for hardware wallet signing.

### System Design Choices

- **Per-Wallet Network Configuration**: Each wallet stores its own network setting (Mainnet/Testnet), allowing for concurrent multi-network support without global state.
- **Streamlined UI**: Consolidated token management and removed redundant features (e.g., Quick Actions, Escrow functionality) to simplify the user experience.
- **Percentage-Based Amount Selection**: Implemented quick amount selection (25%, 50%, 75%, Max) for payments and DEX offers, with smart calculations accounting for XRPL reserves and fees.
- **Custom XRPL Node Support**: Users can configure custom WebSocket or JSON-RPC endpoints for XRPL interactions.

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