import { ArrowUp, ArrowDown, Lock, Filter, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet, useTransactions } from '@/hooks/use-wallet';
import { useAccountTransactions } from '@/hooks/use-xrpl';
import { xrplClient } from '@/lib/xrpl-client';

export default function Transactions() {
  const { currentWallet } = useWallet();
  const { data: dbTransactions, isLoading: dbLoading } = useTransactions(currentWallet?.id || null);
  const { data: xrplTransactions, isLoading: xrplLoading } = useAccountTransactions(currentWallet?.address || null);

  const isLoading = dbLoading || xrplLoading;

  // Combine and format transactions from both sources
  const formatTransactions = () => {
    const transactions: any[] = [];

    // Add XRPL transactions first
    if (xrplTransactions?.transactions) {
      xrplTransactions.transactions.forEach((tx: any) => {
        // Handle both tx.tx_json (historical) and tx structure (real-time)
        const transaction = tx.tx_json || tx.tx || tx;
        
        if (transaction?.TransactionType === 'Payment') {
          // Handle both XRP (string) and token (object) amounts
          // Note: Amount field was renamed to DeliverMax in newer XRPL versions
          const amountField = transaction.DeliverMax || transaction.Amount;
          let amount = '0';
          let currency = 'XRP';
          
          if (typeof amountField === 'string') {
            // XRP payment (in drops)
            amount = xrplClient.formatXRPAmount(amountField);
            currency = 'XRP';
          } else if (typeof amountField === 'object' && amountField.value) {
            // Token payment
            amount = amountField.value;
            currency = xrplClient.decodeCurrency(amountField.currency);
          }
          
          const isOutgoing = transaction.Account === currentWallet?.address;
          
          transactions.push({
            id: transaction.hash || tx.hash,
            type: isOutgoing ? 'sent' : 'received',
            amount: `${isOutgoing ? '-' : '+'}${amount} ${currency}`,
            address: isOutgoing ? transaction.Destination : transaction.Account,
            time: new Date((transaction.date || 0) * 1000 + 946684800000),
            hash: transaction.hash || tx.hash,
            status: tx.meta?.TransactionResult === 'tesSUCCESS' ? 'confirmed' : 'failed',
            icon: isOutgoing ? ArrowUp : ArrowDown,
            iconBg: isOutgoing ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30',
            iconColor: isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
            amountColor: isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
          });
        }
      });
    }

    // Add database transactions if no XRPL data
    if (transactions.length === 0 && dbTransactions) {
      dbTransactions.forEach((tx) => {
        const isOutgoing = tx.type === 'sent';
        transactions.push({
          id: tx.id.toString(),
          type: tx.type,
          amount: `${isOutgoing ? '-' : '+'}${tx.amount} ${tx.currency}`,
          address: tx.toAddress || tx.fromAddress || 'Unknown',
          time: new Date(tx.createdAt),
          hash: tx.txHash || null,
          status: tx.status,
          icon: tx.type === 'escrow' ? Lock : isOutgoing ? ArrowUp : ArrowDown,
          iconBg: tx.type === 'escrow' ? 'bg-purple-100 dark:bg-purple-900/30' : 
                   isOutgoing ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30',
          iconColor: tx.type === 'escrow' ? 'text-purple-600 dark:text-purple-400' :
                     isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
          amountColor: tx.type === 'escrow' ? 'text-purple-600 dark:text-purple-400' :
                       isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
        });
      });
    }

    // Sort by time (newest first)
    return transactions.sort((a, b) => b.time.getTime() - a.time.getTime());
  };

  const transactions = formatTransactions();

  const formatAddress = (address: string) => {
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }
    return address;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <Button variant="outline" size="sm" disabled>
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white dark:bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
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
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No Transactions Yet</h3>
          <p className="text-muted-foreground text-sm">
            Your transaction history will appear here once you start using your wallet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const Icon = transaction.icon;
            return (
              <div
                key={transaction.id}
                className="bg-white dark:bg-card border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${transaction.iconBg} rounded-full flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${transaction.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.type === 'sent' ? 'Sent XRP' : 
                         transaction.type === 'received' ? 'Received XRP' : 
                         'Escrow Created'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.type === 'sent' ? 'To:' : 
                         transaction.type === 'received' ? 'From:' : 
                         'Release:'} {formatAddress(transaction.address)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.amountColor}`}>
                      {transaction.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.time)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-1 rounded-full ${getStatusColor(transaction.status)} bg-muted`}>
                    {transaction.status}
                  </span>
                  {transaction.hash && (
                    <span className="text-muted-foreground font-mono">
                      {transaction.hash.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
