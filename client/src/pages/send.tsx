import { SendTransactionForm } from '@/components/send-transaction-form';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function Send() {
  const [, setLocation] = useLocation();

  return (
    <div className="px-4 py-6">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Send XRP</h1>
      </div>

      <SendTransactionForm 
        onSuccess={() => {
          setLocation('/');
        }}
      />
    </div>
  );
}