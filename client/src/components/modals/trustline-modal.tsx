import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet, useTrustlines, useCreateTrustline } from '@/hooks/use-wallet';
import { useAccountLines } from '@/hooks/use-xrpl';
import { useToast } from '@/hooks/use-toast';
import { xrplClient } from '@/lib/xrpl-client';

interface TrustlineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrustlineModal({ isOpen, onClose }: TrustlineModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [currency, setCurrency] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [limit, setLimit] = useState('');

  const { currentWallet } = useWallet();
  const { data: dbTrustlines } = useTrustlines(currentWallet?.id || null);
  const { data: xrplLines } = useAccountLines(currentWallet?.address || null);
  const createTrustline = useCreateTrustline();
  const { toast } = useToast();

  // Combine trustlines from database and XRPL
  const trustlines = [];
  
  // Add XRPL trustlines
  if (xrplLines?.lines) {
    xrplLines.lines.forEach((line: any) => {
      const decodedCurrency = xrplClient.decodeCurrency(line.currency);
      trustlines.push({
        id: `xrpl-${line.account}-${line.currency}`,
        currency: decodedCurrency,
        rawCurrency: line.currency,
        issuer: line.account,
        issuerName: 'XRPL Network',
        balance: line.balance,
        limit: line.limit,
        isActive: true,
      });
    });
  }

  // Add database trustlines if no XRPL data
  if (trustlines.length === 0 && dbTrustlines) {
    trustlines.push(...dbTrustlines);
  }

  const handleAddTrustline = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentWallet || !currency || !issuer || !issuerName || !limit) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTrustline.mutateAsync({
        walletId: currentWallet.id,
        currency,
        issuer,
        issuerName,
        limit,
      });

      toast({
        title: "Trustline Created",
        description: `Trustline for ${currency} has been created`,
      });

      setCurrency('');
      setIssuer('');
      setIssuerName('');
      setLimit('');
      setShowAddForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create trustline",
        variant: "destructive",
      });
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return num.toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bottom-0 translate-y-0 rounded-t-3xl data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom max-h-[80vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border sticky top-0 bg-background">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Trustline Manager</DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="p-2 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="pt-4 pb-6">
          {!showAddForm ? (
            <>
              <div className="mb-6">
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 mb-4 touch-target"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Trustline
                </Button>
              </div>
              
              <h4 className="font-semibold mb-3">Active Trustlines</h4>
              
              {trustlines.length === 0 ? (
                <div className="bg-muted rounded-xl p-6 text-center">
                  <p className="text-muted-foreground">No trustlines found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add trustlines to hold other tokens
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trustlines.map((trustline) => (
                    <div
                      key={trustline.id}
                      className="bg-muted rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {trustline.currency.slice(0, 3)}
                          </div>
                          <div>
                            <p className="font-medium">{trustline.currency} ({trustline.issuerName})</p>
                            <p className="text-sm text-muted-foreground">
                              Balance: {formatBalance(trustline.balance)} {trustline.currency}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary text-sm font-medium"
                        >
                          Manage
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Limit: {formatBalance(trustline.limit)} {trustline.currency}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleAddTrustline} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Add New Trustline</h4>
                <Button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>

              <div>
                <Label htmlFor="currency" className="block text-sm font-medium mb-2">
                  Currency Code
                </Label>
                <Input
                  id="currency"
                  type="text"
                  placeholder="USD, BTC, ETH..."
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="touch-target"
                  maxLength={3}
                />
              </div>

              <div>
                <Label htmlFor="issuer" className="block text-sm font-medium mb-2">
                  Issuer Address
                </Label>
                <Input
                  id="issuer"
                  type="text"
                  placeholder="rN7n...4X2k"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="touch-target"
                />
              </div>

              <div>
                <Label htmlFor="issuerName" className="block text-sm font-medium mb-2">
                  Issuer Name
                </Label>
                <Input
                  id="issuerName"
                  type="text"
                  placeholder="Bitstamp, Gatehub..."
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  className="touch-target"
                />
              </div>

              <div>
                <Label htmlFor="limit" className="block text-sm font-medium mb-2">
                  Trust Limit
                </Label>
                <Input
                  id="limit"
                  type="number"
                  placeholder="10000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="touch-target"
                  step="0.01"
                  min="0"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 touch-target"
                disabled={!currency || !issuer || !issuerName || !limit || createTrustline.isPending}
              >
                {createTrustline.isPending ? 'Creating...' : 'Create Trustline'}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
