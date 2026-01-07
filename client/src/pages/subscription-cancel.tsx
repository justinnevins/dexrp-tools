import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function SubscriptionCancel() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation('/');
  }, [setLocation]);
  
  return null;
}
