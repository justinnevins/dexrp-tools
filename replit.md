# XRPL Wallet - Mobile-First Hardware Wallet Integration

## Overview

This is a mobile-first XRP Ledger (XRPL) software wallet application built with React and Express. The application focuses exclusively on integrating with the Keystone 3 Pro air-gapped hardware wallet using QR code-based transaction signing. The wallet provides a secure, user-friendly interface for managing XRP assets, tokens (trustlines), and transactions while maintaining the security benefits of hardware wallet integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & UI**: React with TypeScript, using Vite as the build tool. The UI is built with shadcn/ui components (Radix UI primitives) and styled with Tailwind CSS using a "new-york" theme preset.

**State Management**: TanStack Query (React Query) for server state management, with custom hooks for wallet operations and XRPL interactions. Local browser storage is used as the primary data persistence layer instead of relying on a backend database.

**Routing**: Wouter is used for client-side routing, providing a lightweight alternative to React Router.

**Mobile-First Design**: The application uses a mobile app layout with bottom navigation, optimized for mobile devices with a maximum width constraint (max-w-md). The design includes simulated status bars and mobile-specific UI patterns.

**Data Storage Strategy**: Browser localStorage is the primary storage mechanism through the `BrowserStorage` class, which manages wallets, transactions, trustlines, and escrows entirely client-side. This approach was chosen to eliminate backend database dependencies while maintaining data persistence across sessions.

### Backend Architecture

**Server Framework**: Express.js with TypeScript, serving both API endpoints and the Vite development middleware.

**API Design**: RESTful API endpoints for wallet management (`/api/wallets`), transactions, trustlines, and escrows. The backend provides CRUD operations but defers to client-side storage for actual data persistence.

**Storage Layer**: The backend includes both an in-memory storage implementation (`MemStorage`) and database schema definitions using Drizzle ORM, but the application primarily uses browser-based storage for simplicity and offline capability.

**Development Setup**: Vite middleware integration for hot module replacement during development, with custom error overlay handling via Replit's runtime error modal plugin.

### Hardware Wallet Integration

**Keystone 3 Pro (Exclusive Support)**: QR code-based air-gapped communication using the `@keystonehq/keystone-sdk` and `@ngraveio/bc-ur` for encoding/decoding UR (Uniform Resources) formatted data. The wallet displays unsigned transactions as QR codes, which users scan with their Keystone 3 Pro device, sign offline, and scan the resulting signed transaction QR code back into the application.

**Camera Integration**: Multiple QR scanner implementations using the `qr-scanner` library and native `getUserMedia` API for camera access. Different scanner components handle various use cases (account setup, transaction signing, address scanning).

**Transaction Flow**: 
1. User creates transaction in UI
2. Transaction is encoded and displayed as QR code
3. User scans QR with Keystone 3 Pro hardware wallet
4. Keystone 3 Pro signs transaction offline (air-gapped)
5. User scans signed transaction QR back into app
6. App submits signed transaction to XRPL

### XRPL Integration

**Client Library**: Using `xrpl` JavaScript library for blockchain interactions through WebSocket connections.

**Network Support**: Dual network support (Mainnet and Testnet) with user-selectable switching. Network preference is persisted in localStorage.

**Connection Management**: Custom `XRPLClient` class manages WebSocket connections, handles reconnection logic, and provides network switching capabilities. The client maintains connection state and handles network endpoint configuration.

**Data Fetching**: Real-time account information, transaction history, and trustline data is fetched directly from XRPL nodes rather than relying on backend storage. This ensures data authenticity and reduces backend complexity.

**Transaction Encoding**: Uses `ripple-binary-codec` for encoding transactions into the binary format required by XRPL, particularly for hardware wallet signing workflows.

### External Dependencies

**XRPL Network Endpoints**:
- Mainnet: `wss://xrplcluster.com`
- Testnet: `wss://s.altnet.rippletest.net:51233`

**Hardware Wallet SDKs**:
- `@keystonehq/keystone-sdk` - Keystone 3 Pro integration
- `@keystonehq/bc-ur-registry` - UR format encoding/decoding
- `@ngraveio/bc-ur` - Alternative BC-UR implementation
- `cbor-web` - CBOR encoding for QR data payloads

**Pricing Data**: CoinGecko API for XRP/USD price conversions (with fallback to $0.50 if API fails).

**Database** (Optional): PostgreSQL via Neon serverless (`@neondatabase/serverless`) with Drizzle ORM for schema management, though the current implementation primarily uses browser storage.

**UI Components**: Comprehensive Radix UI component library for accessible, unstyled primitives (dialogs, dropdowns, tooltips, etc.) styled with Tailwind CSS.

**QR Code Libraries**:
- `qrcode` - QR code generation for displaying data
- `qr-scanner` - Camera-based QR code scanning

**Development Tools**:
- TypeScript for type safety
- Vite for fast development and optimized builds
- ESBuild for server bundling
- Drizzle Kit for database migrations (when using PostgreSQL)