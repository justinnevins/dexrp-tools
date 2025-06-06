import { Link2, Lock, History, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onTrustlineClick: () => void;
  onEscrowClick: () => void;
  onHistoryClick: () => void;
  onSettingsClick: () => void;
}

export function QuickActions({ 
  onTrustlineClick, 
  onEscrowClick, 
  onHistoryClick, 
  onSettingsClick 
}: QuickActionsProps) {
  const actions = [
    {
      title: 'Trustlines',
      description: 'Manage token connections',
      icon: Link2,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      onClick: onTrustlineClick,
    },
    {
      title: 'Escrow',
      description: 'Time-locked payments',
      icon: Lock,
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      onClick: onEscrowClick,
    },
    {
      title: 'History',
      description: 'View transactions',
      icon: History,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      onClick: onHistoryClick,
    },
    {
      title: 'Settings',
      description: 'App preferences',
      icon: Settings,
      iconBg: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-600 dark:text-gray-400',
      onClick: onSettingsClick,
    },
  ];

  return (
    <section className="px-4 py-4">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.title}
              onClick={action.onClick}
              variant="ghost"
              className="h-auto p-4 text-left justify-start bg-white dark:bg-card border border-border rounded-xl shadow-sm touch-target"
            >
              <div className="w-full">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-8 h-8 ${action.iconBg} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${action.iconColor}`} />
                  </div>
                  <span className="font-medium">{action.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
