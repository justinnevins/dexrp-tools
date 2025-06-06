import { Plus, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet, useTrustlines } from '@/hooks/use-wallet';
import { useAccountLines } from '@/hooks/use-xrpl';

export default function Tokens() {
  const { currentWallet } = useWallet();
  const { data: dbTrustlines, isLoading: dbLoading } = useTrustlines(currentWallet?.id || null);
  const { data: xrplLines, isLoading: xrplLoading } = useAccountLines(currentWallet?.address || null);

  const isLoading = dbLoading || xrplLoading;

  // Combine trustlines from database and XRPL
  const trustlines = [];
  
  // Add XRP as the native token first
  trustlines.push({
    id: 'native-xrp',
    currency: 'XRP',
    issuer: 'Native',
    issuerName: 'XRP Ledger',
    balance: currentWallet?.balance || '0',
    limit: 'Native',
    isActive: true,
    isNative: true,
  });
  
  // Add XRPL trustlines
  if (xrplLines?.lines) {
    xrplLines.lines.forEach((line: any) => {
      trustlines.push({
        id: `xrpl-${line.account}-${line.currency}`,
        currency: line.currency,
        issuer: line.account,
        issuerName: 'XRPL Network',
        balance: line.balance,
        limit: line.limit,
        isActive: true,
        isNative: false,
      });
    });
  }

  // Add database trustlines if no XRPL data (excluding XRP)
  if (trustlines.length === 1 && dbTrustlines) {
    trustlines.push(...dbTrustlines.map(tl => ({ ...tl, isNative: false })));
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(6);
  };

  const formatLimit = (limit: string) => {
    if (limit === 'Native') return 'Native';
    const num = parseFloat(limit);
    return num.toFixed(2);
  };

  const getCurrencyColor = (currency: string) => {
    const colors = {
      'XRP': 'bg-[hsl(var(--xrpl-teal))]',
      'USD': 'bg-blue-500',
      'BTC': 'bg-orange-500',
      'ETH': 'bg-purple-500',
      'EUR': 'bg-green-500',
    };
    return colors[currency as keyof typeof colors] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Tokens</h1>
          <Button variant="outline" size="sm" disabled>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </div>
                <div>
                  <div className="h-4 bg-muted rounded w-16 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Tokens</h1>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Token
        </Button>
      </div>

      {trustlines.length === 1 ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Only XRP Available</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Create trustlines to hold other tokens on the XRP Ledger.
          </p>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Trustline
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {trustlines.map((token) => (
            <div
              key={token.id}
              className="bg-white dark:bg-card border border-border rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${getCurrencyColor(token.currency)} rounded-full flex items-center justify-center text-white font-bold`}>
                    {token.currency.slice(0, 3)}
                  </div>
                  <div>
                    <p className="font-semibold">{token.currency}</p>
                    <p className="text-sm text-muted-foreground">
                      {token.isNative ? 'Native Token' : token.issuerName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatBalance(token.balance)} {token.currency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {token.isNative ? '' : `Limit: ${formatLimit(token.limit)} ${token.currency}`}
                  </p>
                </div>
              </div>
              
              {!token.isNative && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Issuer:</span>
                    <span className="font-mono text-muted-foreground">
                      {token.issuer.slice(0, 8)}...{token.issuer.slice(-8)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
