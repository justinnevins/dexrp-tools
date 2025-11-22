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
import { xrplClient, type XRPLNetwork } from '@/lib/xrpl-client';
import { KeystoneTransactionSigner } from '@/components/keystone-transaction-signer';
import { queryClient } from '@/lib/queryClient';
import { AmountPresetButtons } from '@/components/amount-preset-buttons';
import { browserStorage } from '@/lib/browser-storage';
import type { StoredOffer, OfferWithStatus } from '@/lib/dex-types';
import { enrichOfferWithStatus, formatOfferAmount } from '@/lib/dex-utils';
import { 
  calculateTotal, 
  calculateAmount, 
  calculateMaxBuy, 
  calculateMaxSell,
  getTokenBalance as getTokenBalanceFromLines
} from '@/lib/order-calculator';

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
  
  // New order form state - using composite asset identifiers
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market'); // Default to market
  // Composite asset values: "XRP" or "CURRENCY:ISSUER"
  const [baseAsset, setBaseAsset] = useState('XRP');  // Default to XRP (what to buy/sell)
  const [quoteAsset, setQuoteAsset] = useState('');  // Will be initialized to RLUSD based on network
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [total, setTotal] = useState('');
  const [expirationDays, setExpirationDays] = useState('');
  const [limitPriceInitialized, setLimitPriceInitialized] = useState(false); // Track if limit price was set
  // Dynamic reserve state - fetched from XRPL ledger
  const [baseReserve, setBaseReserve] = useState(20); // Default to current XRPL base reserve
  const [incrementReserve, setIncrementReserve] = useState(2); // Default to current XRPL increment
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tfPassive, setTfPassive] = useState(false);
  const [tfFillOrKill, setTfFillOrKill] = useState(false);
  
  // Transaction signer state
  const [showSigner, setShowSigner] = useState(false);
  const [transactionUR, setTransactionUR] = useState<{ type: string; cbor: string } | null>(null);
  const [unsignedTransaction, setUnsignedTransaction] = useState<any>(null);
  const [transactionType, setTransactionType] = useState<'OfferCreate' | 'OfferCancel'>('OfferCreate');
  const [addressCopied, setAddressCopied] = useState(false);

  // Market data state
  const [marketPair, setMarketPair] = useState('XRP/USD');
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const { currentWallet } = useWallet();
  const network = currentWallet?.network ?? 'mainnet';
  const { data: accountOffers, isLoading: offersLoading } = useAccountOffers(currentWallet?.address || null, network);
  const { data: accountInfo } = useAccountInfo(currentWallet?.address || null, network);
  const { data: accountLines } = useAccountLines(currentWallet?.address || null, network);
  const { toast } = useToast();

  const currentNetwork = network;

  // Helper functions to work with composite asset identifiers
  const parseAsset = (asset: string): { currency: string; issuer: string } => {
    if (asset === 'XRP' || !asset) {
      return { currency: 'XRP', issuer: '' };
    }
    const [currency, issuer] = asset.split(':');
    return { currency: currency || 'XRP', issuer: issuer || '' };
  };

  const createAsset = (currency: string, issuer?: string): string => {
    if (currency === 'XRP' || !currency) {
      return 'XRP';
    }
    return issuer ? `${currency}:${issuer}` : currency;
  };

  const getRLUSDAsset = (network: XRPLNetwork): string => {
    const rlusdIssuer = network === 'mainnet'
      ? 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
      : 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV';
    return `524C555344000000000000000000000000000000:${rlusdIssuer}`;
  };

  // Initialize quote asset with network-specific RLUSD on first render
  useEffect(() => {
    if (!quoteAsset) {
      setQuoteAsset(getRLUSDAsset(currentNetwork));
    }
  }, []);

  // Fetch dynamic reserve requirements from XRPL on mount and network changes
  useEffect(() => {
    const fetchReserves = async () => {
      try {
        const reserves = await xrplClient.getReserveRequirements(currentNetwork);
        setBaseReserve(reserves.baseReserve);
        setIncrementReserve(reserves.incrementReserve);
      } catch (error) {
        console.error('Failed to fetch reserve requirements:', error);
        // Keep using the default fallback values (20/2)
      }
    };
    fetchReserves();
  }, [currentNetwork]);

  // Update assets when network changes to ensure valid selections
  useEffect(() => {
    // Update base asset if it's a common token
    const baseInfo = parseAsset(baseAsset);
    if (baseInfo.currency !== 'XRP') {
      const commonToken = COMMON_TOKENS.find(t => t.currency === baseInfo.currency);
      if (commonToken) {
        const validIssuer = currentNetwork === 'mainnet' 
          ? commonToken.mainnetIssuer 
          : commonToken.testnetIssuer;
        
        if (validIssuer) {
          // Update to network-specific issuer
          const newAsset = createAsset(baseInfo.currency, validIssuer);
          if (newAsset !== baseAsset) {
            setBaseAsset(newAsset);
          }
        } else {
          // Token doesn't exist on this network - reset to XRP
          setBaseAsset('XRP');
        }
      }
      // For trustline-derived tokens not in COMMON_TOKENS, keep as-is
    }

    // Update quote asset if it's a common token
    const quoteInfo = parseAsset(quoteAsset);
    if (quoteInfo.currency !== 'XRP') {
      const commonToken = COMMON_TOKENS.find(t => t.currency === quoteInfo.currency);
      if (commonToken) {
        const validIssuer = currentNetwork === 'mainnet' 
          ? commonToken.mainnetIssuer 
          : commonToken.testnetIssuer;
        
        if (validIssuer) {
          // Update to network-specific issuer
          const newAsset = createAsset(quoteInfo.currency, validIssuer);
          if (newAsset !== quoteAsset) {
            setQuoteAsset(newAsset);
          }
        } else {
          // Token doesn't exist on this network - reset to RLUSD
          setQuoteAsset(getRLUSDAsset(currentNetwork));
        }
      }
      // For trustline-derived tokens not in COMMON_TOKENS, keep as-is
    }
  }, [currentNetwork]); // Trigger on network changes

  // Initialize limit price once when switching to limit mode
  useEffect(() => {
    if (orderType === 'limit' && !limitPriceInitialized && marketPrice) {
      const effectivePrice = getEffectivePriceForAssets(marketPrice);
      if (effectivePrice) {
        setPrice(effectivePrice.toString());
        setLimitPriceInitialized(true);
      }
    } else if (orderType === 'market') {
      setLimitPriceInitialized(false); // Reset flag when switching back to market
      if (marketPrice) {
        const effectivePrice = getEffectivePriceForAssets(marketPrice);
        if (effectivePrice) {
          setPrice(effectivePrice.toString());
          // Force recalculation of total when marketPrice arrives
          if (amount) {
            const newTotal = calculateTotal(amount, effectivePrice.toString());
            setTotal(newTotal);
          }
        }
      }
    }
  }, [orderType, marketPrice, limitPriceInitialized, amount, baseAsset, quoteAsset]);

  // Auto-calculate total when amount or price changes
  useEffect(() => {
    if (amount && price) {
      const newTotal = calculateTotal(amount, price);
      setTotal(newTotal);
    } else if (!price) {
      // Clear total when price is cleared
      setTotal('');
    }
  }, [amount, price]);

  // Calculate dependent fields
  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (price && value) {
      const newTotal = calculateTotal(value, price);
      setTotal(newTotal);
    }
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    if (amount && value) {
      const newTotal = calculateTotal(amount, value);
      setTotal(newTotal);
    }
  };

  const handleMaxAmount = () => {
    const trustlineCount = accountLines?.lines?.length || 0;
    const offerCount = accountOffers?.offers?.length || 0;
    // Add 1 to offer count for the pending offer being created
    const pendingOfferCount = offerCount + 1;

    const baseInfo = parseAsset(baseAsset);
    const quoteInfo = parseAsset(quoteAsset);

    console.log('MAX clicked:', {
      orderSide,
      baseAsset,
      quoteAsset,
      price,
      marketPrice,
      effectivePrice: getEffectivePriceForAssets(marketPrice)
    });

    if (orderSide === 'buy') {
      // Buying base with quote - calculate max base we can afford
      const quoteBalance = quoteInfo.currency === 'XRP'
        ? parseFloat(getXRPBalance())
        : getTokenBalanceFromLines(quoteInfo.currency, quoteInfo.issuer, accountLines?.lines);

      console.log('Buy MAX calculation:', {
        quoteBalance,
        price,
        isQuoteXRP: quoteInfo.currency === 'XRP'
      });

      const maxCalc = calculateMaxBuy(
        quoteBalance,
        price,
        quoteInfo.currency === 'XRP',
        trustlineCount,
        pendingOfferCount,
        baseReserve,
        incrementReserve
      );

      console.log('Buy MAX result:', maxCalc);

      if (maxCalc.maxAmount) {
        setAmount(maxCalc.maxAmount);
        // Let useEffect auto-calculate total from amount × price
      }
    } else {
      // Selling base for quote - max is our base balance
      const baseBalance = baseInfo.currency === 'XRP'
        ? parseFloat(getXRPBalance())
        : getTokenBalanceFromLines(baseInfo.currency, baseInfo.issuer, accountLines?.lines);

      console.log('Sell MAX calculation:', {
        baseBalance,
        price,
        isBaseXRP: baseInfo.currency === 'XRP'
      });

      const maxCalc = calculateMaxSell(
        baseBalance,
        price,
        baseInfo.currency === 'XRP',
        trustlineCount,
        pendingOfferCount,
        baseReserve,
        incrementReserve
      );

      console.log('Sell MAX result:', maxCalc);

      if (maxCalc.maxAmount) {
        setAmount(maxCalc.maxAmount);
        // Let useEffect auto-calculate total from amount × price
      }
    }
  };

  const swapPair = () => {
    // Swap base and quote assets
    const temp = baseAsset;
    setBaseAsset(quoteAsset);
    setQuoteAsset(temp);
    // Clear form
    setAmount('');
    setPrice('');
    setTotal('');
  };

  const calculateFlags = () => {
    let flags = 0;
    if (tfPassive) flags |= 0x00010000; // 65536
    if (orderType === 'market') flags |= 0x00020000; // 131072 - Immediate or Cancel for market orders
    if (tfFillOrKill) flags |= 0x00040000; // 262144
    if (orderSide === 'sell') flags |= 0x00080000; // 524288 - tfSell
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
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    // For market orders, use marketPrice; for limit orders, require price to be set
    let effectivePrice = price;
    if (orderType === 'market') {
      if (!marketPrice || marketPrice <= 0) {
        toast({
          title: "Market Price Unavailable",
          description: "Please wait for market price to load or switch to limit order",
          variant: "destructive",
        });
        return;
      }
      effectivePrice = marketPrice.toString();
    } else {
      // Limit order - validate price is set and > 0
      const priceValue = parseFloat(price);
      if (!price || isNaN(priceValue) || priceValue <= 0) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid price greater than 0",
          variant: "destructive",
        });
        return;
      }
      effectivePrice = price;
    }

    // Validate effectivePrice is usable
    const effectivePriceValue = parseFloat(effectivePrice);
    if (isNaN(effectivePriceValue) || effectivePriceValue <= 0) {
      toast({
        title: "Invalid Price",
        description: "Price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Calculate total from amount × price
    const calculatedTotal = calculateTotal(amount, effectivePrice);

    // Validate calculated total
    const calculatedTotalValue = parseFloat(calculatedTotal);
    if (!calculatedTotal || isNaN(calculatedTotalValue) || calculatedTotalValue <= 0) {
      toast({
        title: "Invalid Total",
        description: "Unable to calculate order total. Please check amount and price.",
        variant: "destructive",
      });
      return;
    }

    const baseInfo = parseAsset(baseAsset);
    const quoteInfo = parseAsset(quoteAsset);

    // Validate XRP amounts meet minimum drop precision (1 drop = 0.000001 XRP)
    const MIN_XRP_AMOUNT = 0.000001;
    if (baseInfo.currency === 'XRP' && amountValue < MIN_XRP_AMOUNT) {
      toast({
        title: "Amount Too Small",
        description: "XRP amount must be at least 1 drop (0.000001 XRP)",
        variant: "destructive",
      });
      return;
    }
    if (quoteInfo.currency === 'XRP' && calculatedTotalValue < MIN_XRP_AMOUNT) {
      toast({
        title: "Total Too Small",
        description: "XRP total must be at least 1 drop (0.000001 XRP)",
        variant: "destructive",
      });
      return;
    }

    if (baseInfo.currency !== 'XRP' && !baseInfo.issuer) {
      toast({
        title: "Missing Issuer",
        description: "Non-XRP currencies require an issuer address",
        variant: "destructive",
      });
      return;
    }

    if (quoteInfo.currency !== 'XRP' && !quoteInfo.issuer) {
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
        transactionLedger = accountInfo.ledger_current_index || accountInfo.ledger_index || 1000;
      }

      // Map Buy/Sell to XRPL TakerGets/TakerPays
      // Buy: TakerGets = Total (quote, what you give), TakerPays = Amount (base, what you get)
      // Sell: TakerGets = Amount (base, what you give), TakerPays = Total (quote, what you get)
      let takerGets: any;
      let takerPays: any;

      if (orderSide === 'buy') {
        // Buying base with quote
        if (quoteInfo.currency === 'XRP') {
          const drops = xrplClient.convertXRPToDrops(calculatedTotal);
          if (drops === '0' || parseInt(drops) === 0) {
            toast({
              title: "Amount Too Small",
              description: "XRP total rounds to 0 drops. Increase the amount or price.",
              variant: "destructive",
            });
            return;
          }
          takerGets = drops;
        } else {
          takerGets = { currency: quoteInfo.currency, issuer: quoteInfo.issuer, value: calculatedTotal };
        }
        
        if (baseInfo.currency === 'XRP') {
          const drops = xrplClient.convertXRPToDrops(amount);
          if (drops === '0' || parseInt(drops) === 0) {
            toast({
              title: "Amount Too Small",
              description: "XRP amount rounds to 0 drops. Increase the amount.",
              variant: "destructive",
            });
            return;
          }
          takerPays = drops;
        } else {
          takerPays = { currency: baseInfo.currency, issuer: baseInfo.issuer, value: amount };
        }
      } else {
        // Selling base for quote
        if (baseInfo.currency === 'XRP') {
          const drops = xrplClient.convertXRPToDrops(amount);
          if (drops === '0' || parseInt(drops) === 0) {
            toast({
              title: "Amount Too Small",
              description: "XRP amount rounds to 0 drops. Increase the amount.",
              variant: "destructive",
            });
            return;
          }
          takerGets = drops;
        } else {
          takerGets = { currency: baseInfo.currency, issuer: baseInfo.issuer, value: amount };
        }
        
        if (quoteInfo.currency === 'XRP') {
          const drops = xrplClient.convertXRPToDrops(calculatedTotal);
          if (drops === '0' || parseInt(drops) === 0) {
            toast({
              title: "Amount Too Small",
              description: "XRP total rounds to 0 drops. Increase the amount or price.",
              variant: "destructive",
            });
            return;
          }
          takerPays = drops;
        } else {
          takerPays = { currency: quoteInfo.currency, issuer: quoteInfo.issuer, value: calculatedTotal };
        }
      }

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
        // Check both possible ledger index fields (current or validated ledger)
        transactionLedger = accountInfo.ledger_current_index || accountInfo.ledger_index || 1000;
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
    
    // Save offer to browser storage if it's an OfferCreate
    if (transactionType === 'OfferCreate' && unsignedTransaction && currentWallet) {
      const storedOffer: StoredOffer = {
        sequence: unsignedTransaction.Sequence,
        walletAddress: currentWallet.address,
        network: network,
        originalTakerGets: unsignedTransaction.TakerGets,
        originalTakerPays: unsignedTransaction.TakerPays,
        createdAt: Date.now(),
        createdTxHash: txHash,
        createdLedgerIndex: unsignedTransaction.LastLedgerSequence ? unsignedTransaction.LastLedgerSequence - 1000 : 0,
        fills: [],
        expiration: unsignedTransaction.Expiration,
        flags: unsignedTransaction.Flags
      };
      
      browserStorage.saveOffer(storedOffer);
      console.log('Saved offer to browser storage:', storedOffer);
    }
    
    // Invalidate offers cache
    if (currentWallet) {
      await queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === 'accountOffers' && 
          query.queryKey[1] === currentWallet.address 
      });
    }
    
    // Reset form
    setAmount('');
    setPrice('');
    setTotal('');
    setExpirationDays('');
    setTfPassive(false);
    setTfFillOrKill(false);
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

  // Get effective price based on trading direction
  // Market pair is always "XRP/Token" (base/quote), marketPrice = how many tokens per 1 XRP
  // If user is trading in the same direction, use price directly
  // If user is trading in opposite direction, invert the price
  const getEffectivePriceForAssets = (rawPrice: number | null): number | null => {
    if (!rawPrice) return rawPrice;
    
    const baseInfo = parseAsset(baseAsset);
    const quoteInfo = parseAsset(quoteAsset);
    
    // Simplified logic: 
    // Market pair format is always XRP/Token (e.g., XRP/USD, XRP/RLUSD)
    // marketPrice = how many tokens you get per 1 XRP
    
    // If user's base is XRP → selling XRP for tokens → use price as-is
    // If user's quote is XRP → buying tokens with XRP → invert price (need XRP per token)
    
    const userBaseIsXRP = baseInfo.currency === 'XRP';
    const userQuoteIsXRP = quoteInfo.currency === 'XRP';
    
    if (userBaseIsXRP && !userQuoteIsXRP) {
      // Same direction: selling XRP for token → use marketPrice (tokens per XRP)
      console.log('Price direction: Same as market (XRP→Token)', rawPrice);
      return rawPrice;
    }
    
    if (!userBaseIsXRP && userQuoteIsXRP) {
      // Opposite direction: buying token with XRP → invert (XRP per token)
      const inverted = 1 / rawPrice;
      console.log('Price direction: Inverted (Token→XRP)', { original: rawPrice, inverted });
      return inverted;
    }
    
    // If both are XRP or neither is XRP, something is misconfigured
    console.log('Price direction: No XRP in pair, using as-is', rawPrice);
    return rawPrice;
  };


  // Market pairs configuration - network aware
  const marketPairs = (() => {
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
    const pair = (marketPairs as any)[marketPair];
    if (!pair) return;

    setIsLoadingPrice(true);
    setPriceError(null);
    try {
      // Build InFTF API URL format: XRP/{issuer}_{currency}
      // API accepts either 3-letter codes (USD, EUR) or 40-char HEX codes
      // Do NOT decode hex codes that result in non-standard currency codes
      const currency = pair.quote.currency;
      
      const counter = `${pair.quote.issuer}_${currency}`;
      const url = `https://xrpldata.inftf.org/v1/iou/exchange_rates/XRP/${counter}`;
      
      console.log('Fetching market price from InFTF:', { url, pair: marketPair });
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('InFTF API error:', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('InFTF price data:', data);

      if (data.rate && data.rate > 0) {
        setMarketPrice(data.rate);
        setLastUpdate(new Date(data.timestamp));
      } else {
        setMarketPrice(null);
        setPriceError('No recent trades found');
      }
    } catch (error: any) {
      console.error('Failed to fetch market price:', error);
      setMarketPrice(null);
      setPriceError(error.message || 'Failed to load price data');
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Fetch market price on mount and every 15 seconds
  useEffect(() => {
    // Reset to default pair if current pair not available on network
    if (marketPairs && !(marketPairs as any)[marketPair]) {
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


  // Get available currencies (XRP + active trustlines + common tokens)
  const getAvailableCurrencies = () => {
    const currencies: Array<{ label: string; value: string; issuer?: string; key: string }> = [
      { label: 'XRP', value: 'XRP', key: 'XRP' }
    ];

    // Add active trustlines (with balance > 0 or limit > 0)
    if (accountLines?.lines) {
      accountLines.lines
        .filter((line: any) => parseFloat(line.limit || '0') > 0)
        .forEach((line: any) => {
          // Decode hex currency codes to readable format
          const decodedCurrency = xrplClient.decodeCurrency(line.currency);
          currencies.push({
            label: `${decodedCurrency} (${line.account.substring(0, 8)}...)`,
            value: `${line.currency}:${line.account}`, // Composite value for unique identification
            issuer: line.account,
            key: `${line.currency}-${line.account}`
          });
        });
    }

    // Add common tokens available on current network
    COMMON_TOKENS.forEach(token => {
      const issuer = currentNetwork === 'mainnet' ? token.mainnetIssuer : token.testnetIssuer;
      if (issuer) {
        // Don't add if already in active trustlines
        const alreadyExists = currencies.some(
          c => c.issuer === issuer && c.value.startsWith(token.currency + ':')
        );
        if (!alreadyExists) {
          currencies.push({
            label: token.name,
            value: `${token.currency}:${issuer}`, // Composite value for unique identification
            issuer,
            key: `${token.currency}-${issuer}`
          });
        }
      }
    });

    return currencies;
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
          {marketPrice !== null ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {marketPrice.toFixed(4)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {marketPair.split('/')[1]} per {marketPair.split('/')[0]}
                </span>
              </div>
              {(() => {
                const effectivePrice = getEffectivePriceForAssets(marketPrice);
                const baseInfo = parseAsset(baseAsset);
                const quoteInfo = parseAsset(quoteAsset);
                const baseLabel = baseInfo.currency === 'XRP' ? 'XRP' : xrplClient.decodeCurrency(baseInfo.currency);
                const quoteLabel = quoteInfo.currency === 'XRP' ? 'XRP' : xrplClient.decodeCurrency(quoteInfo.currency);
                
                if (effectivePrice && effectivePrice !== marketPrice) {
                  return (
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
                      Your pair: {effectivePrice.toFixed(6)} {quoteLabel} per {baseLabel}
                    </div>
                  );
                }
                return null;
              })()}
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
              {isLoadingPrice ? 'Loading market data...' : (priceError || 'No price data available')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Order Form - New Buy/Sell Interface */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create Order</CardTitle>
            <CardDescription>Buy or sell on the XRPL DEX</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOffer} className="space-y-4">
              {/* Buy/Sell Tabs */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setOrderSide('buy')}
                  data-testid="button-buy-tab"
                >
                  Buy
                </Button>
                <Button
                  type="button"
                  variant={orderSide === 'sell' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setOrderSide('sell')}
                  data-testid="button-sell-tab"
                >
                  Sell
                </Button>
              </div>

              {/* Market/Limit Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={orderType === 'market' ? 'default' : 'outline'}
                  className="flex-1"
                  size="sm"
                  onClick={() => {
                    setOrderType('market');
                    if (marketPrice) handlePriceChange(marketPrice.toString());
                  }}
                  data-testid="button-market-type"
                >
                  Market
                </Button>
                <Button
                  type="button"
                  variant={orderType === 'limit' ? 'default' : 'outline'}
                  className="flex-1"
                  size="sm"
                  onClick={() => setOrderType('limit')}
                  data-testid="button-limit-type"
                >
                  Limit
                </Button>
              </div>

              {/* Limit Price Field (only for Limit orders) */}
              {orderType === 'limit' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Limit Price ({(() => {
                      const quoteInfo = parseAsset(quoteAsset);
                      const baseInfo = parseAsset(baseAsset);
                      return `${xrplClient.decodeCurrency(quoteInfo.currency)} per ${xrplClient.decodeCurrency(baseInfo.currency)}`;
                    })()})
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="font-mono"
                    data-testid="input-price"
                  />
                </div>
              )}

              {/* Asset to Buy/Sell + Amount */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {orderSide === 'buy' ? 'Buy' : 'Sell'}
                </Label>
                <div className="grid grid-cols-[1fr,2fr] gap-2">
                  <Select 
                    value={baseAsset} 
                    onValueChange={(val) => setBaseAsset(val)}
                  >
                    <SelectTrigger data-testid="select-base-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCurrencies().map((currency) => (
                        <SelectItem 
                          key={`base-${currency.key}`} 
                          value={currency.value}
                        >
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Amount"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="font-mono pr-16"
                      data-testid="input-amount"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 text-xs"
                      onClick={handleMaxAmount}
                      disabled={!price || (orderType === 'market' && !marketPrice)}
                      data-testid="button-max-amount"
                    >
                      MAX
                    </Button>
                  </div>
                </div>
                {orderSide === 'sell' && (() => {
                  const baseInfo = parseAsset(baseAsset);
                  const balance = baseInfo.currency === 'XRP'
                    ? parseFloat(getXRPBalance())
                    : getTokenBalanceFromLines(baseInfo.currency, baseInfo.issuer, accountLines?.lines);
                  const amountValue = parseFloat(amount) || 0;
                  const hasInsufficient = amountValue > balance;
                  return (
                    <p className="text-xs text-muted-foreground">
                      Available: {balance} {xrplClient.decodeCurrency(baseInfo.currency)}
                      {hasInsufficient && (
                        <span className="text-red-500 ml-2">not enough {xrplClient.decodeCurrency(baseInfo.currency)}</span>
                      )}
                    </p>
                  );
                })()}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={swapPair}
                  data-testid="button-swap-pair"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Pay with / Sell for */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {orderSide === 'buy' ? 'Pay with' : 'Sell for'}
                </Label>
                <Select 
                  value={quoteAsset}
                  onValueChange={(val) => setQuoteAsset(val)}
                >
                  <SelectTrigger data-testid="select-quote-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableCurrencies().map((currency) => (
                      <SelectItem 
                        key={`quote-${currency.key}`} 
                        value={currency.value}
                      >
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orderSide === 'buy' && (() => {
                  const quoteInfo = parseAsset(quoteAsset);
                  const balance = quoteInfo.currency === 'XRP'
                    ? parseFloat(getXRPBalance())
                    : getTokenBalanceFromLines(quoteInfo.currency, quoteInfo.issuer, accountLines?.lines);
                  // Calculate total needed for buy
                  const totalNeeded = parseFloat(total) || 0;
                  const hasInsufficient = totalNeeded > balance;
                  return (
                    <p className="text-xs text-muted-foreground">
                      Available: {balance} {xrplClient.decodeCurrency(quoteInfo.currency)}
                      {hasInsufficient && totalNeeded > 0 && (
                        <span className="text-red-500 ml-2">not enough {xrplClient.decodeCurrency(quoteInfo.currency)}</span>
                      )}
                    </p>
                  );
                })()}
              </div>

              {/* Order Summary */}
              {amount && total && (() => {
                const baseInfo = parseAsset(baseAsset);
                const quoteInfo = parseAsset(quoteAsset);
                return (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium mb-3">Order Summary</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span>You're {orderSide === 'buy' ? 'buying' : 'selling'}:</span>
                        <span className="font-semibold">{amount} {xrplClient.decodeCurrency(baseInfo.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>You'll {orderSide === 'buy' ? 'pay' : 'receive'}:</span>
                        <span className="font-semibold">~{total} {xrplClient.decodeCurrency(quoteInfo.currency)}</span>
                      </div>
                      {price && (
                        <div className="flex justify-between">
                          <span>At price:</span>
                          <span className="font-semibold">{parseFloat(price).toFixed(6)} {xrplClient.decodeCurrency(quoteInfo.currency)}/{xrplClient.decodeCurrency(baseInfo.currency)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 mt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">XRPL Technical Details:</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>TakerGets:</span>
                          <span className="font-mono">
                            {orderSide === 'buy' 
                              ? `${total} ${xrplClient.decodeCurrency(quoteInfo.currency)}`
                              : `${amount} ${xrplClient.decodeCurrency(baseInfo.currency)}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>TakerPays:</span>
                          <span className="font-mono">
                            {orderSide === 'buy' 
                              ? `${amount} ${xrplClient.decodeCurrency(baseInfo.currency)}`
                              : `${total} ${xrplClient.decodeCurrency(quoteInfo.currency)}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Flags:</span>
                          <span className="font-mono">
                            {orderSide === 'sell' && 'tfSell '}
                            {orderType === 'market' && 'tfImmediateOrCancel '}
                            {tfPassive && 'tfPassive '}
                            {tfFillOrKill && 'tfFillOrKill'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Advanced Options */}
              <div className="space-y-2">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  Advanced Options {showAdvanced ? '▲' : '▼'}
                </button>
                
                {showAdvanced && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label htmlFor="expiration" className="text-sm">Expiration (days)</Label>
                      <Input
                        id="expiration"
                        type="number"
                        placeholder="Optional (e.g., 7)"
                        value={expirationDays}
                        onChange={(e) => setExpirationDays(e.target.value)}
                        data-testid="input-expiration"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Order Flags</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="tfPassive"
                          checked={tfPassive}
                          onCheckedChange={(checked) => setTfPassive(checked as boolean)}
                          data-testid="checkbox-passive"
                        />
                        <label htmlFor="tfPassive" className="text-sm cursor-pointer">
                          Passive (don't cross spread)
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
                          Fill or Kill
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" data-testid="button-submit-offer">
                Place {orderSide === 'buy' ? 'Buy' : 'Sell'} Order
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
            {accountOffers.offers.map((offer: any, index: number) => {
              // Get stored offer data for this offer
              const storedOffer = currentWallet ? 
                browserStorage.getOffer(currentWallet.address, network, offer.seq) : 
                undefined;
              
              // Enrich with status if we have stored data
              const enrichedOffer = storedOffer ? 
                enrichOfferWithStatus(storedOffer, offer) : 
                null;
              
              return (
                <Card key={index} data-testid={`offer-${offer.seq}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          <span className="font-medium">Order #{offer.seq}</span>
                          {enrichedOffer && enrichedOffer.fillPercentage > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {enrichedOffer.fillPercentage.toFixed(1)}% Filled
                            </span>
                          )}
                        </div>
                        
                        {/* Show original vs remaining if we have stored data */}
                        {enrichedOffer ? (
                          <div className="text-sm space-y-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Original Pay:</span>
                                <span className="font-mono text-xs">{formatOfferAmount(enrichedOffer.originalTakerGets)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Remaining:</span>
                                <span className="font-mono">{formatAmount(offer.taker_gets)}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Original to Receive:</span>
                                <span className="font-mono text-xs">{formatOfferAmount(enrichedOffer.originalTakerPays)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Remaining:</span>
                                <span className="font-mono">{formatAmount(offer.taker_pays)}</span>
                              </div>
                            </div>
                            {enrichedOffer.fills.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">
                                  Fill History ({enrichedOffer.fills.length} fill{enrichedOffer.fills.length > 1 ? 's' : ''})
                                </p>
                                <div className="space-y-1">
                                  {enrichedOffer.fills.slice(0, 3).map((fill, i) => (
                                    <div key={i} className="text-xs flex items-center justify-between">
                                      <span className="text-muted-foreground">
                                        {new Date(fill.timestamp).toLocaleDateString()}
                                      </span>
                                      <span className="font-mono">
                                        {formatOfferAmount(fill.takerPaidAmount)}
                                      </span>
                                    </div>
                                  ))}
                                  {enrichedOffer.fills.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{enrichedOffer.fills.length - 3} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pay:</span>
                              <span className="font-mono">{formatAmount(offer.taker_gets)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">to Receive:</span>
                              <span className="font-mono">{formatAmount(offer.taker_pays)}</span>
                            </div>
                          </div>
                        )}
                        
                        {offer.expiration && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <Calendar className="w-3 h-3" />
                            Expires: {new Date((offer.expiration + 946684800) * 1000).toLocaleString()}
                          </div>
                        )}
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
              );
            })}
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
          network={currentNetwork}
        />
      )}
    </div>
  );
}
