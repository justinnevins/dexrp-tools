# DEXrp - XRPL DEX Trading App

A secure, mobile-optimized XRP Ledger (XRPL) DEX trading app with Keystone 3 Pro hardware wallet integration using QR code-based air-gapped transaction signing. More air-gapped wallet support coming soon!

**Web Domain**: [dexrp.me](https://dexrp.me)

## Features

### Core Functionality
- **Hardware Wallet Security**: Integration with Keystone 3 Pro for air-gapped transaction signing
- **Multi-Network Support**: Per-wallet configuration for both Mainnet and Testnet
- **Custom Node Configuration**: Support for both WebSocket (ws/wss) and JSON-RPC (http/https) XRPL endpoints
- **Full Transaction History**: Dedicated full-history server support with automatic fallback
- **Real-Time Price Tracking**: Live XRP/USD price display with CoinGecko integration

### Wallet Management
- **Send & Receive XRP**: Secure payment functionality with QR code-based signing
- **Transaction History**: Complete transaction tracking with detailed status information
- **Balance Overview**: Real-time account balance with USD conversion
- **Reserve Calculation**: Automatic XRPL reserve and fee accounting

### Token Management
- **Trustlines**: Add, view, and remove token trustlines
- **Token Balances**: Track all token holdings in one place
- **Custom Tokens**: Support for any XRPL-based token

### DEX Trading
- **Create Offers**: Place buy/sell orders on the XRPL DEX
- **Quick Amount Selection**: 25%, 50%, 75%, and Max buttons with smart reserve calculations
- **Enhanced Currency Selection**: Easy-to-use currency picker for trading pairs

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Data Storage**: Browser localStorage (no backend database required)

### Backend
- **Server**: Express.js with TypeScript
- **API**: RESTful endpoints for wallet operations
- **XRPL Integration**: xrpl JavaScript library with custom connection management

### Hardware Wallet Integration
- **SDK**: @keystonehq/keystone-sdk
- **QR Codes**: @ngraveio/bc-ur for multi-part animated QR codes
- **Camera**: qr-scanner for QR code reading
- **Encoding**: ripple-binary-codec for transaction serialization

## Architecture Highlights

### Protocol Auto-Detection
Automatically detects and handles both WebSocket and JSON-RPC XRPL endpoints:
- WebSocket connections for real-time updates
- JSON-RPC support with CORS proxy for custom nodes
- Seamless switching between protocols based on URL

### Full-History Server Strategy
Ensures complete transaction history with intelligent fallback:
1. Try custom full-history endpoint (if configured)
2. Fall back to default full-history server
3. Final fallback to primary endpoint if needed

### Per-Wallet Network Configuration
Each wallet maintains its own network setting (Mainnet/Testnet), enabling:
- Multiple wallets on different networks simultaneously
- Independent custom node configuration per wallet
- Network-specific transaction history and balance tracking

## Getting Started

### Prerequisites
- Node.js 18+ installed
- A Keystone 3 Pro hardware wallet (required for transaction signing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/justinnevins/keystone3-xrpl.git
cd keystone3-xrpl
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the provided local URL

### Configuration

#### Custom XRPL Nodes
Configure custom XRPL endpoints in Settings:
- **Mainnet Node**: Your preferred mainnet WebSocket or JSON-RPC endpoint
- **Testnet Node**: Your preferred testnet WebSocket or JSON-RPC endpoint
- **Full-History Servers**: Optional dedicated servers for complete transaction history

#### Default Endpoints
- **Mainnet**: wss://xrplcluster.com
- **Testnet**: wss://s.altnet.rippletest.net:51233
- **Mainnet Full-History**: https://s1.ripple.com:51234
- **Testnet Full-History**: https://s.altnet.rippletest.net:51234

## Usage

### Creating a Wallet
1. Navigate to Profile
2. Enter your XRPL address
3. Select network (Mainnet or Testnet)
4. Configure custom node endpoints (optional)

### Sending Transactions
1. Go to Wallet tab
2. Click "Send"
3. Enter destination address and amount
4. Use percentage buttons for quick amount selection
5. Scan the transaction QR code with your Keystone 3 Pro
6. Sign the transaction on your hardware wallet
7. Scan the signed QR code back into the app
8. Transaction is submitted to your configured XRPL node

### Managing Tokens
1. Navigate to Tokens tab
2. View existing trustlines and balances
3. Add new trustlines by currency code and issuer
4. Remove unwanted trustlines (requires QR signing)

### DEX Trading
1. Go to DEX tab
2. Select your trading pair currencies
3. Enter offer amount and price
4. Sign with Keystone 3 Pro via QR code
5. Monitor offer status in transaction history

## Security Features

- **Air-Gapped Signing**: All transactions signed offline on hardware wallet
- **No Private Key Exposure**: Keys never leave the Keystone device
- **Client-Side Storage**: Wallet data stored locally, not on servers
- **Custom Node Support**: Connect to your own trusted XRPL validators
- **Protocol Verification**: Transaction details displayed for verification before signing

## Development

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # XRPL client and utilities
│   │   ├── pages/         # Application pages
│   │   └── App.tsx        # Main application component
├── server/                # Backend Express server
│   ├── routes.ts          # API endpoints
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
└── replit.md             # Project documentation
```

### Key Files
- `client/src/lib/xrpl-client.ts` - XRPL connection management with protocol auto-detection
- `client/src/lib/browser-storage.ts` - Client-side data persistence
- `client/src/components/keystone-transaction-signer.tsx` - Hardware wallet integration
- `server/routes.ts` - Backend API with transaction submission

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing patterns and conventions
- TypeScript types are properly defined
- Mobile-first design is maintained
- Hardware wallet integration remains functional

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
- Open an issue on GitHub
- Review the XRPL documentation at https://xrpl.org
- Check Keystone 3 Pro documentation at https://keyst.one

## Acknowledgments

- XRPL Foundation for the XRPL JavaScript library
- Keystone Team for the hardware wallet SDK
- shadcn for the amazing UI component library
- Replit for the development platform
