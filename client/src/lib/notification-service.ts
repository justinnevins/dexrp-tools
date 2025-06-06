class NotificationService {
  private isEnabled: boolean = false;
  private previousTransactionCount: number = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.isEnabled = localStorage.getItem('notifications_enabled') === 'true';
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  enable() {
    this.isEnabled = true;
    localStorage.setItem('notifications_enabled', 'true');
  }

  disable() {
    this.isEnabled = false;
    localStorage.setItem('notifications_enabled', 'false');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  isNotificationEnabled(): boolean {
    return this.isEnabled && Notification.permission === 'granted';
  }

  showNotification(title: string, options: NotificationOptions = {}) {
    if (!this.isNotificationEnabled()) {
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: true,
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  showTransactionNotification(type: 'sent' | 'received', amount: string, address: string) {
    const isReceived = type === 'received';
    const title = isReceived ? 'XRP Received' : 'XRP Sent';
    const body = isReceived 
      ? `Received ${amount} XRP from ${this.formatAddress(address)}`
      : `Sent ${amount} XRP to ${this.formatAddress(address)}`;

    this.showNotification(title, {
      body,
      tag: 'transaction',
      icon: '/favicon.ico',
    });
  }

  private formatAddress(address: string): string {
    if (address.length > 10) {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return address;
  }

  // Monitor transactions for a specific wallet address
  startTransactionMonitoring(walletAddress: string) {
    if (!this.isNotificationEnabled() || this.monitoringInterval) {
      return;
    }

    // Check for new transactions every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/transactions?wallet=${walletAddress}&limit=5`);
        const transactions = await response.json();
        
        // Check if there are new transactions
        if (transactions.length > this.previousTransactionCount) {
          const newTransactions = transactions.slice(0, transactions.length - this.previousTransactionCount);
          
          newTransactions.forEach((tx: any) => {
            this.showTransactionNotification(
              tx.type,
              tx.amount,
              tx.toAddress || tx.fromAddress || 'Unknown'
            );
          });
        }
        
        this.previousTransactionCount = transactions.length;
      } catch (error) {
        console.error('Error monitoring transactions:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  stopTransactionMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export const notificationService = new NotificationService();