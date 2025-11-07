import { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, Calendar, Wallet, Copy, Check, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useWallet } from '@/hooks/use-wallet';
import { useAccountOffers, useAccountInfo, useAccountLines } from '@/hooks/use-xrpl';
import { useToast } from '@/hooks/use-toast';
import { xrplClient } from '@/lib/xrpl-client';
import { KeystoneTransactionSigner } from '@/components/keystone-transaction-signer';
import { queryClient } from '@/lib/queryClient';

// Common XRPL tokens with mainnet/testnet issuers
interface CommonToken {
  name: string;
  currency: string;
  mainnetIssuer?: string;
  testnetIssuer?: string;
}

const COMMON_TOKENS: CommonToken[] = [
  {
    name: 'Ripple USD (RLUSD)',
    currency: '524C555344000000000000000000000000000000',
    mainnetIssuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
    testnetIssuer: 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'
  },
  {
    name: 'USD Coin (USDC)',
    currency: '5553444300000000000000000000000000000000',
    mainnetIssuer: 'rGm7WCVp9gb4jZHWTEtGUr4dd74z2XuWhE',
    testnetIssuer: 'rHuGNhqTG32mfmAvWA8hUyWRLV3tCSwKQt'
  },
  {
    name: 'Bitstamp USD',
    currency: 'USD',
    mainnetIssuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
  },
  {
    name: 'Bitstamp BTC',
    currency: 'BTC',
    mainnetIssuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
  },
  {
    name: 'Bitstamp ETH',
    currency: 'ETH',
    mainnetIssuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
  },
  {
    name: 'GateHub EUR',
    currency: 'EUR',
    mainnetIssuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
  },
  {
    name: 'GateHub USD',
    currency: 'USD',
    mainnetIssuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
  },
  {
    name: 'GateHub GBP',
    currency: 'GBP',
    mainnetIssuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
  },
  {
    name: 'Sologenic (SOLO)',
    currency: '534F4C4F00000000000000000000000000000000',
    mainnetIssuer: 'rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz'
  },
  {
    name: 'CasinoCoin (CSC)',
    currency: 'CSC',
    mainnetIssuer: 'rCSCManTZ8ME9EoLrSHHYKW8PPwWMgkwr'
  }
];

interface OfferData {
  takerGets: { currency: string; issuer?: string; value: string };
  takerPays: { currency: string; issuer?: string; value: string };
  flags?: number;
  expiration?: number;
}

export default function DEX() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [offerToCancel, setOfferToCancel] = useState<any>(null);
  
  // Offer creation form state
  const [takerGetsAmount, setTakerGetsAmount] = useState('');
  const [takerGetsCurrency, setTakerGetsCurrency] = useState('XRP');
  const [takerGetsIssuer, setTakerGetsIssuer] = useState('');
  const [takerPaysAmount, setTakerPaysAmount] = useState('');
  const [takerPaysCurrency, setTakerPaysCurrency] = useState('');
  const [takerPaysIssuer, setTakerPaysIssuer] = useState('');
  const [expirationDays, setExpirationDays] = useState('');
  
  // Flags
  const [tfPassive, setTfPassive] = useState(false);
  const [tfImmediateOrCancel, setTfImmediateOrCancel] = useState(false);
  const [tfFillOrKill, setTfFillOrKill] = useState(false);
  const [tfSell, setTfSell] = useState(false);
  
  // Transaction signer state
  const [showSigner, setShowSigner] = useState(false);
  const [transactionUR, setTransactionUR] = useState<{ type: string; cbor: string } | null>(null);
  const [unsignedTransaction, setUnsignedTransaction] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<'OfferCreate' | 'OfferCancel'>('OfferCreate');
  const [addressCopied, setAddressCopied] = useState(false);

  // Market data state
  const [marketPair, setMarketPair] = useState('XRP/USD');
  const [orderBook, setOrderBook] = useState<any>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { currentWallet } = useWallet();
  const { data: accountOffers, isLoading: offersLoading } = useAccountOffers(currentWallet?.address || null);
  const { data: accountInfo } = useAccountInfo(currentWallet?.address || null);
  const { data: accountLines } = useAccountLines(currentWallet?.address || null);
  const { toast } = useToast();

  const currentNetwork = xrplClient.getCurrentNetwork();

  const calculateFlags = () => {
    let flags = 0;
    if (tfPassive) flags |= 0x00010000; // 65536
    if (tfImmediateOrCancel) flags |= 0x00020000; // 131072
    if (tfFillOrKill) flags |= 0x00040000; // 262144
    if (tfSell) flags |= 0x00080000; // 524288
    return flags > 0 ? flags : undefined;
  };

  const encodeOfferTransaction = async (transaction: any): Promise<{ type: string; cbor: string }> => {
    const response = await fetch('/api/keystone/xrp/sign-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to encode transaction');
    }
    
    return await response.json();
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentWallet) {
      toast({
        title: "No Account Selected",
        description: "Please select an account first",
        variant: "destructive",
      });
      return;
    }

    // Validation
    if (!takerGetsAmount || !takerPaysAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter both amounts",
        variant: "destructive",
      });
      return;
    }

    if (takerGetsCurrency !== 'XRP' && !takerGetsIssuer) {
      toast({
        title: "Missing Issuer",
        description: "Non-XRP currencies require an issuer address",
        variant: "destructive",
      });
      return;
    }

    if (takerPaysCurrency !== 'XRP' && !takerPaysIssuer) {
      toast({
        title: "Missing Issuer",
        description: "Non-XRP currencies require an issuer address",
        variant: "destructive",
      });
      return;
    }

    try {
      let transactionSequence = 1;
      let transactionLedger = 1000;
      
      if (accountInfo && 'account_data' in accountInfo && accountInfo.account_data) {
        transactionSequence = accountInfo.account_data.Sequence || 1;
        transactionLedger = accountInfo.ledger_current_index || 95943000;
      }

      // Build TakerGets
      const takerGets = takerGetsCurrency === 'XRP'
        ? xrplClient.convertXRPToDrops(takerGetsAmount)
        : {
            currency: takerGetsCurrency,
            issuer: takerGetsIssuer,
            value: takerGetsAmount
          };

      // Build TakerPays
      const takerPays = takerPaysCurrency === 'XRP'
        ? xrplClient.convertXRPToDrops(takerPaysAmount)
        : {
            currency: takerPaysCurrency,
            issuer: takerPaysIssuer,
            value: takerPaysAmount
          };

      const transaction: any = {
        TransactionType: 'OfferCreate',
        Account: currentWallet.address,
        TakerGets: takerGets,
        TakerPays: takerPays,
        Sequence: transactionSequence,
        LastLedgerSequence: transactionLedger + 1000,
        Fee: '12',
        SigningPubKey: currentWallet.publicKey || ''
      };

      const flags = calculateFlags();
      if (flags !== undefined) {
        transaction.Flags = flags;
      }

      // Add expiration if specified
      if (expirationDays) {
        const rippleEpoch = 946684800; // January 1, 2000 00:00 UTC
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expirationTime = nowInSeconds + (parseInt(expirationDays) * 24 * 60 * 60);
        transaction.Expiration = expirationTime - rippleEpoch;
      }

      console.log('Creating OfferCreate transaction:', transaction);

      const keystoneUR = await encodeOfferTransaction(transaction);
      
      setTransactionUR(keystoneUR);
      setUnsignedTransaction(transaction);
      setTransactionType('OfferCreate');
      setShowSigner(true);

    } catch (error) {
      console.error('Failed to create offer transaction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create offer",
        variant: "destructive",
      });
    }
  };

  const handleCancelOffer = async (offerSequence: number) => {
    if (!currentWallet) return;

    try {
      let transactionSequence = 1;
      let transactionLedger = 1000;
      
      if (accountInfo && 'account_data' in accountInfo && accountInfo.account_data) {
        transactionSequence = accountInfo.account_data.Sequence || 1;
        transactionLedger = accountInfo.ledger_current_index || 95943000;
      }

      const transaction = {
        TransactionType: 'OfferCancel',
        Account: currentWallet.address,
        OfferSequence: offerSequence,
        Sequence: transactionSequence,
        LastLedgerSequence: transactionLedger + 1000,
        Fee: '12',
        SigningPubKey: currentWallet.publicKey || ''
      };

      console.log('Creating OfferCancel transaction:', transaction);

      const keystoneUR = await encodeOfferTransaction(transaction);
      
      setTransactionUR(keystoneUR);
      setUnsignedTransaction(transaction);
      setTransactionType('OfferCancel');
      setOfferToCancel({ sequence: offerSequence });
      setShowSigner(true);

    } catch (error) {
      console.error('Failed to create cancel transaction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel offer",
        variant: "destructive",
      });
    }
  };

  const handleSigningSuccess = async (txHash: string) => {
    console.log('Offer transaction successful:', txHash);
    
    // Invalidate offers cache
    if (currentWallet) {
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'accountOffers' && 
          query.queryKey[1] === currentWallet.address 
      });
    }
    
    // Reset form
    setTakerGetsAmount('');
    setTakerGetsCurrency('XRP');
    setTakerGetsIssuer('');
    setTakerPaysAmount('');
    setTakerPaysCurrency('');
    setTakerPaysIssuer('');
    setExpirationDays('');
    setTfPassive(false);
    setTfImmediateOrCancel(false);
    setTfFillOrKill(false);
    setTfSell(false);
    setShowCreateForm(false);
    setShowSigner(false);
    setTransactionUR(null);
    setUnsignedTransaction(null);
    setOfferToCancel(null);
    
    toast({
      title: transactionType === 'OfferCreate' ? "Offer Created" : "Offer Cancelled",
      description: transactionType === 'OfferCreate' 
        ? "Your order has been placed on the DEX"
        : "Your order has been cancelled",
    });
  };

  const handleSignerClose = () => {
    setShowSigner(false);
    setTransactionUR(null);
    setUnsignedTransaction(null);
    setOfferToCancel(null);
  };

  const formatAmount = (amount: any) => {
    if (typeof amount === 'string') {
      return parseFloat(xrplClient.formatXRPAmount(amount)).toFixed(6) + ' XRP';
    }
    return `${parseFloat(amount.value).toFixed(6)} ${amount.currency}`;
  };

  const copyAddress = () => {
    if (currentWallet?.address) {
      navigator.clipboard.writeText(currentWallet.address);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  const getXRPBalance = () => {
    if (accountInfo && 'account_data' in accountInfo && accountInfo.account_data?.Balance) {
      return xrplClient.formatXRPAmount(accountInfo.account_data.Balance);
    }
    return '0.000000';
  };

  // Market pairs configuration - network aware
  const marketPairs: Record<string, { base: any; quote: any; issuer?: string }> | null = (() => {
    if (currentNetwork === 'mainnet') {
      return {
        'XRP/USD': {
          base: 'XRP',
          quote: {
            currency: 'USD',
            issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' // GateHub USD on mainnet
          }
        },
        'XRP/RLUSD': {
          base: 'XRP',
          quote: {
            currency: '524C555344000000000000000000000000000000', // RLUSD hex
            issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De' // RLUSD on mainnet
          }
        }
      };
    } else {
      // Testnet - only RLUSD is available
      return {
        'XRP/RLUSD': {
          base: 'XRP',
          quote: {
            currency: '524C555344000000000000000000000000000000', // RLUSD hex
            issuer: 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV' // RLUSD on testnet
          }
        }
      };
    }
  })();

  const fetchMarketPrice = async () => {
    if (!marketPairs) return;
    const pair = marketPairs[marketPair];
    if (!pair) return;

    setIsLoadingPrice(true);
    try {
      // Fetch order book - what we pay to get XRP (asks)
      // XRP must be formatted as {currency: 'XRP'} for book_offers API
      const takerGets = pair.base === 'XRP' ? { currency: 'XRP' } : { currency: pair.base };
      const takerPays = pair.quote;

      console.log('Fetching order book for:', { takerPays, takerGets, network: currentNetwork });
      const bookData = await xrplClient.getOrderBook(takerPays, takerGets, 5);
      console.log('Order book response:', bookData);
      setOrderBook(bookData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch market price:', error);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Fetch market price on mount and every 15 seconds
  useEffect(() => {
    // Reset to default pair if current pair not available on network
    if (marketPairs && !marketPairs[marketPair]) {
      const firstPair = Object.keys(marketPairs)[0];
      if (firstPair) {
        setMarketPair(firstPair);
      }
      return;
    }
    
    fetchMarketPrice();
    const interval = setInterval(fetchMarketPrice, 15000);
    return () => clearInterval(interval);
  }, [marketPair, currentNetwork]);

  const getBestPrice = () => {
    if (!orderBook?.offers || orderBook.offers.length === 0) {
      return null;
    }

    const bestOffer = orderBook.offers[0];
    const takerGets = typeof bestOffer.TakerGets === 'string' 
      ? parseFloat(xrplClient.formatXRPAmount(bestOffer.TakerGets))
      : parseFloat(bestOffer.TakerGets.value);
    
    const takerPays = typeof bestOffer.TakerPays === 'string'
      ? parseFloat(xrplClient.formatXRPAmount(bestOffer.TakerPays))
      : parseFloat(bestOffer.TakerPays.value);

    // Price = what we pay / what we get
    return takerPays / takerGets;
  };

  const getSpread = () => {
    if (!orderBook?.offers || orderBook.offers.length < 2) {
      return null;
    }

    const bestBid = orderBook.offers[0];
    const secondBid = orderBook.offers[1];

    const price1 = calculateOfferPrice(bestBid);
    const price2 = calculateOfferPrice(secondBid);

    return Math.abs(price2 - price1);
  };

  const calculateOfferPrice = (offer: any) => {
    const takerGets = typeof offer.TakerGets === 'string'
      ? parseFloat(xrplClient.formatXRPAmount(offer.TakerGets))
      : parseFloat(offer.TakerGets.value);
    
    const takerPays = typeof offer.TakerPays === 'string'
      ? parseFloat(xrplClient.formatXRPAmount(offer.TakerPays))
      : parseFloat(offer.TakerPays.value);

    return takerPays / takerGets;
  };

  // Get available currencies (XRP + active trustlines + common tokens)
  const getAvailableCurrencies = () => {
    const currencies: Array<{ label: string; value: string; issuer?: string }> = [
      { label: 'XRP', value: 'XRP' }
    ];

    // Add active trustlines (with balance > 0 or limit > 0)
    if (accountLines?.lines) {
      accountLines.lines
        .filter((line: any) => parseFloat(line.limit || '0') > 0)
        .forEach((line: any) => {
          const currencyLabel = line.currency.length === 3 
            ? line.currency 
            : `${line.currency.substring(0, 8)}...`;
          currencies.push({
            label: `${currencyLabel} (${line.account.substring(0, 8)}...)`,
            value: line.currency,
            issuer: line.account
          });
        });
    }

    // Add common tokens available on current network
    COMMON_TOKENS.forEach(token => {
      const issuer = currentNetwork === 'mainnet' ? token.mainnetIssuer : token.testnetIssuer;
      if (issuer) {
        // Don't add if already in active trustlines
        const alreadyExists = currencies.some(
          c => c.value === token.currency && c.issuer === issuer
        );
        if (!alreadyExists) {
          currencies.push({
            label: token.name,
            value: token.currency,
            issuer
          });
        }
      }
    });

    return currencies;
  };

  // Handle currency selection
  const handleTakerGetsCurrencyChange = (value: string) => {
    setTakerGetsCurrency(value);
    if (value === 'XRP') {
      setTakerGetsIssuer('');
    } else {
      const currency = getAvailableCurrencies().find(c => c.value === value);
      if (currency?.issuer) {
        setTakerGetsIssuer(currency.issuer);
      }
    }
  };

  const handleTakerPaysCurrencyChange = (value: string) => {
    setTakerPaysCurrency(value);
    if (value === 'XRP') {
      setTakerPaysIssuer('');
    } else {
      const currency = getAvailableCurrencies().find(c => c.value === value);
      if (currency?.issuer) {
        setTakerPaysIssuer(currency.issuer);
      }
    }
  };

  if (!currentWallet) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">DEX Trading</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Please set up an account to trade on the DEX
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">DEX Trading</h1>
          <p className="text-sm text-muted-foreground">Create and manage orders</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          size="sm"
          data-testid="button-create-offer"
        >
          {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      {/* Trading Account Info */}
      <Card className="mb-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Trading Account</p>
                <p className="text-sm font-semibold text-primary">{getXRPBalance()} XRP</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded truncate flex-1">
                  {currentWallet?.address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                  className="h-7 w-7 p-0 flex-shrink-0"
                  data-testid="button-copy-address"
                >
                  {addressCopied ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Price Info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Market Price</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={marketPair} onValueChange={setMarketPair}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {marketPairs && Object.keys(marketPairs).map(pair => (
                    <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchMarketPrice}
                disabled={isLoadingPrice}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPrice ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {getBestPrice() !== null ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {getBestPrice()?.toFixed(4)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {marketPair.split('/')[1]}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {lastUpdate && (
                  <div>
                    Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isLoadingPrice ? 'Loading market data...' : 'No offers available'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Offer Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Offer</CardTitle>
            <CardDescription>Place a new order on the XRPL DEX</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOffer} className="space-y-4">
              {/* You Give (TakerGets) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">You Give (TakerGets)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Amount"
                    value={takerGetsAmount}
                    onChange={(e) => setTakerGetsAmount(e.target.value)}
                    className="font-mono"
                    data-testid="input-taker-gets-amount"
                  />
                  <Select 
                    value={takerGetsCurrency} 
                    onValueChange={handleTakerGetsCurrencyChange}
                  >
                    <SelectTrigger data-testid="select-taker-gets-currency">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCurrencies().map((currency) => (
                        <SelectItem 
                          key={`${currency.value}-${currency.issuer || 'native'}`} 
                          value={currency.value}
                        >
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {takerGetsCurrency !== 'XRP' && takerGetsIssuer && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                    Issuer: {takerGetsIssuer}
                  </div>
                )}
              </div>

              {/* You Get (TakerPays) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">You Get (TakerPays)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Amount"
                    value={takerPaysAmount}
                    onChange={(e) => setTakerPaysAmount(e.target.value)}
                    className="font-mono"
                    data-testid="input-taker-pays-amount"
                  />
                  <Select 
                    value={takerPaysCurrency} 
                    onValueChange={handleTakerPaysCurrencyChange}
                  >
                    <SelectTrigger data-testid="select-taker-pays-currency">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCurrencies().map((currency) => (
                        <SelectItem 
                          key={`${currency.value}-${currency.issuer || 'native'}`} 
                          value={currency.value}
                        >
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {takerPaysCurrency !== 'XRP' && takerPaysIssuer && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                    Issuer: {takerPaysIssuer}
                  </div>
                )}
              </div>

              {/* Expiration */}
              <div>
                <Label htmlFor="expiration" className="text-sm font-medium">
                  Expiration (days)
                </Label>
                <Input
                  id="expiration"
                  type="number"
                  placeholder="Optional (e.g., 7 for 7 days)"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  data-testid="input-expiration"
                />
              </div>

              {/* Flags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Order Flags</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tfPassive"
                      checked={tfPassive}
                      onCheckedChange={(checked) => setTfPassive(checked as boolean)}
                      data-testid="checkbox-passive"
                    />
                    <label htmlFor="tfPassive" className="text-sm cursor-pointer">
                      Passive (do not consume existing offers)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tfImmediateOrCancel"
                      checked={tfImmediateOrCancel}
                      onCheckedChange={(checked) => setTfImmediateOrCancel(checked as boolean)}
                      data-testid="checkbox-ioc"
                    />
                    <label htmlFor="tfImmediateOrCancel" className="text-sm cursor-pointer">
                      Immediate or Cancel
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tfFillOrKill"
                      checked={tfFillOrKill}
                      onCheckedChange={(checked) => setTfFillOrKill(checked as boolean)}
                      data-testid="checkbox-fok"
                    />
                    <label htmlFor="tfFillOrKill" className="text-sm cursor-pointer">
                      Fill or Kill (must fill completely)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tfSell"
                      checked={tfSell}
                      onCheckedChange={(checked) => setTfSell(checked as boolean)}
                      data-testid="checkbox-sell"
                    />
                    <label htmlFor="tfSell" className="text-sm cursor-pointer">
                      Sell (exchange entire TakerGets amount)
                    </label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" data-testid="button-submit-offer">
                Create Offer
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active Offers */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Active Offers</h2>
        
        {offersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : accountOffers?.offers && accountOffers.offers.length > 0 ? (
          <div className="space-y-3">
            {accountOffers.offers.map((offer: any, index: number) => (
              <Card key={index} data-testid={`offer-${offer.seq}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <span className="font-medium">Order #{offer.seq}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">You give:</span>
                          <span className="font-mono">{formatAmount(offer.taker_gets)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">You get:</span>
                          <span className="font-mono">{formatAmount(offer.taker_pays)}</span>
                        </div>
                        {offer.expiration && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <Calendar className="w-3 h-3" />
                            Expires: {new Date((offer.expiration + 946684800) * 1000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelOffer(offer.seq)}
                      data-testid={`button-cancel-${offer.seq}`}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No active offers. Create one to start trading!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Keystone Transaction Signer */}
      {showSigner && transactionUR && unsignedTransaction && currentWallet && (
        <KeystoneTransactionSigner
          isOpen={showSigner}
          transactionUR={transactionUR}
          unsignedTransaction={unsignedTransaction}
          transactionType={transactionType as any}
          walletId={currentWallet.id}
          onSuccess={handleSigningSuccess}
          onClose={handleSignerClose}
        />
      )}
    </div>
  );
}
