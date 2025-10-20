import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { WalletProvider } from "@/contexts/wallet-context";
import { MobileAppLayout } from "@/components/layout/mobile-app-layout";
import Home from "@/pages/home";
import Send from "@/pages/send";
import Transactions from "@/pages/transactions";
import Tokens from "@/pages/tokens";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/send" component={Send} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/tokens" component={Tokens} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
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
