import { ArrowUp, ArrowDown, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useTransactions } from '@/hooks/use-wallet';
import { useAccountTransactions } from '@/hooks/use-xrpl';
import { xrplClient } from '@/lib/xrpl-client';

interface RecentTransactionsProps {
  onViewAllClick: () => void;
}

export function RecentTransactions({ onViewAllClick }: RecentTransactionsProps) {
  const { currentWallet } = useWallet();
  const { data: dbTransactions } = useTransactions(currentWallet?.id || null);
  const { data: xrplTransactions } = useAccountTransactions(currentWallet?.address || null, 10);

  // Combine and format transactions from both sources
  const formatTransactions = () => {
    const transactions: any[] = [];

    // Add XRPL transactions
    if (xrplTransactions?.transactions) {
      xrplTransactions.transactions.slice(0, 5).forEach((tx: any) => {
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
            time: new Date((transaction.date || 0) * 1000 + 946684800000).toLocaleDateString() || 'Recently',
            icon: isOutgoing ? ArrowUp : ArrowDown,
            iconBg: isOutgoing ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30',
            iconColor: isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
            amountColor: isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
          });
        } else if (transaction?.TransactionType === 'OfferCreate' || transaction?.TransactionType === 'OfferCancel') {
          // Handle DEX offer transactions
          const takerGets = transaction.TakerGets;
          const takerPays = transaction.TakerPays;
          
          if (takerGets && takerPays) {
            // Determine what was received and what was paid
            let getsAmount = '0';
            let getsCurrency = 'XRP';
            let paysAmount = '0';
            let paysCurrency = 'XRP';
            
            // Parse TakerGets (what the offer creator receives when someone takes the offer)
            if (typeof takerGets === 'string') {
              getsAmount = xrplClient.formatXRPAmount(takerGets);
              getsCurrency = 'XRP';
            } else if (typeof takerGets === 'object' && takerGets.value) {
              getsAmount = takerGets.value;
              getsCurrency = xrplClient.decodeCurrency(takerGets.currency);
            }
            
            // Parse TakerPays (what the offer creator pays when someone takes the offer)
            if (typeof takerPays === 'string') {
              paysAmount = xrplClient.formatXRPAmount(takerPays);
              paysCurrency = 'XRP';
            } else if (typeof takerPays === 'object' && takerPays.value) {
              paysAmount = takerPays.value;
              paysCurrency = xrplClient.decodeCurrency(takerPays.currency);
            }
            
            transactions.push({
              id: transaction.hash || tx.hash,
              type: 'exchange',
              amount: `${paysAmount} ${paysCurrency} → ${getsAmount} ${getsCurrency}`,
              address: 'DEX Trading',
              time: new Date((transaction.date || 0) * 1000 + 946684800000).toLocaleDateString() || 'Recently',
              icon: ArrowLeftRight,
              iconBg: 'bg-blue-100 dark:bg-blue-900/30',
              iconColor: 'text-blue-600 dark:text-blue-400',
              amountColor: 'text-blue-600 dark:text-blue-400',
            });
          }
        }
      });
    }

    // Add database transactions if no XRPL data
    if (transactions.length === 0 && dbTransactions) {
      dbTransactions.slice(0, 5).forEach((tx) => {
        const isOutgoing = tx.type === 'sent';
        transactions.push({
          id: tx.id.toString(),
          type: tx.type,
          amount: `${isOutgoing ? '-' : '+'}${tx.amount} ${tx.currency}`,
          address: tx.toAddress || tx.fromAddress || 'Unknown',
          time: new Date(tx.createdAt).toLocaleDateString() || 'Recently',
          icon: isOutgoing ? ArrowUp : ArrowDown,
          iconBg: isOutgoing ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30',
          iconColor: isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
          amountColor: isOutgoing ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
        });
      });
    }

    return transactions;
  };

  const transactions = formatTransactions();

  const formatAddress = (address: string) => {
    if (address.length > 10) {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return address;
  };

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <Button
          onClick={onViewAllClick}
          variant="ghost"
          className="text-primary font-medium text-sm p-0 h-auto"
        >
          View All
        </Button>
      </div>
      
      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-muted-foreground">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your transaction history will appear here
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${transaction.iconBg} rounded-full flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${transaction.iconColor}`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {transaction.type === 'sent' ? 'Sent' : transaction.type === 'received' ? 'Received' : 'DEX Trade'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.type === 'exchange' ? transaction.address : (transaction.type === 'sent' ? 'To:' : 'From:') + ' ' + formatAddress(transaction.address)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.amountColor}`}>
                      {transaction.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">{transaction.time}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
