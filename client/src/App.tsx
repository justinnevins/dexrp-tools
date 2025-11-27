import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { WalletProvider } from "@/contexts/wallet-context";
import { MobileAppLayout } from "@/components/layout/mobile-app-layout";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import Home from "@/pages/home";
import Send from "@/pages/send";
import Transactions from "@/pages/transactions";
import Tokens from "@/pages/tokens";
import DEX from "@/pages/dex";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function BackButtonHandler() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Only set up back button handler on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    
    const setupBackButton = async () => {
      const listener = await CapacitorApp.addListener('backButton', (event: { canGoBack: boolean }) => {
        // If we're on the home page, minimize the app instead of exiting
        if (location === '/' || !event.canGoBack) {
          CapacitorApp.minimizeApp();
        } else {
          window.history.back();
        }
      });
      
      return listener;
    };
    
    const listenerPromise = setupBackButton();
    
    return () => {
      listenerPromise.then(listener => listener.remove());
    };
  }, [location]);
  
  return null;
}

function Router() {
  return (
    <>
      <BackButtonHandler />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/send" component={Send} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/tokens" component={Tokens} />
        <Route path="/dex" component={DEX} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="xrpl-wallet-theme">
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <MobileAppLayout>
              <Router />
            </MobileAppLayout>
          </TooltipProvider>
        </WalletProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
