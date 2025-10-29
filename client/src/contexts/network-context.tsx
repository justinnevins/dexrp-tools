import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { xrplClient, type XRPLNetwork } from '@/lib/xrpl-client';

interface NetworkContextType {
  currentNetwork: XRPLNetwork;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [currentNetwork, setCurrentNetwork] = useState<XRPLNetwork>(() => {
    return xrplClient.getCurrentNetwork();
  });

  // Listen for network changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const network = xrplClient.getCurrentNetwork();
      setCurrentNetwork(network);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically in case the network changes from within the app
    const interval = setInterval(() => {
      const network = xrplClient.getCurrentNetwork();
      if (network !== currentNetwork) {
        setCurrentNetwork(network);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentNetwork]);

  return (
    <NetworkContext.Provider
      value={{
        currentNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
