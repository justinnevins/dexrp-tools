import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { xrplClient } from '@/lib/xrpl-client';

interface KeystoneAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (address: string) => void;
}

export function KeystoneAddressModal({ isOpen, onClose, onConfirm }: KeystoneAddressModalProps) {
  const [address, setAddress] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateAddress = (addr: string) => {
    const trimmed = addr.trim();
    const valid = xrplClient.isValidAddress(trimmed);
    setIsValid(valid);
    return valid;
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    validateAddress(newAddress);
  };

  const handleConfirm = () => {
    const trimmed = address.trim();
    if (validateAddress(trimmed)) {
      onConfirm(trimmed);
      setAddress('');
      onClose();
    } else {
      alert('Please enter a valid XRPL address (must be a properly formatted classic address starting with "r")');
    }
  };

  const handleCancel = () => {
    setAddress('');
    setIsValid(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Connect Keystone Pro 3</DialogTitle>
          <DialogDescription>
            Enter your XRP address from your Keystone Pro 3 device to complete the connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Manual Address Entry</h4>
            <p className="text-sm text-muted-foreground">
              QR code scanning requires specific protocol implementation.<br />
              Please manually enter your XRP address from your Keystone Pro 3.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="xrp-address">XRP Address from Device</Label>
            <p className="text-sm text-muted-foreground">
              1. Go to your Keystone Pro 3 device<br />
              2. Navigate to XRP → Accounts<br />
              3. Copy the address for path m/44'/144'/0'/0/0<br />
              4. Enter the address below
            </p>
          </div>

          <div className="space-y-2">
            <Input
              id="xrp-address"
              type="text"
              placeholder="Enter XRP address (starts with 'r')"
              value={address}
              onChange={handleAddressChange}
              onKeyPress={handleKeyPress}
              className={`${isValid ? 'border-green-500' : ''}`}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            {address && !isValid && (
              <p className="text-sm text-red-500">
                Address must start with 'r' and be at least 25 characters
              </p>
            )}
            {isValid && (
              <p className="text-sm text-green-600">
                Valid XRP address format
              </p>
            )}
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleConfirm} 
              disabled={!isValid}
              className="flex-1"
            >
              Confirm Address
            </Button>
            <Button 
              onClick={handleCancel} 
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}