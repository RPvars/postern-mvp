'use client';

import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

export function UserButton() {
  const t = useTranslations('auth');
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (status === 'loading') {
    return (
      <Button variant="outline" className="h-9" disabled>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </Button>
    );
  }

  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: '/' });
  };

  const userInitials = session.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || session.user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="h-9 gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="h-5 w-5 rounded-full"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {userInitials}
          </div>
        )}
        <span className="hidden sm:inline-block max-w-[100px] truncate">
          {session.user?.name || session.user?.email?.split('@')[0]}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border bg-card py-1 shadow-lg">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">{session.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user?.email}
              </p>
            </div>

            <div className="py-1">
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to profile when implemented
                }}
              >
                <User className="h-4 w-4" />
                {t('userMenu.profile')}
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to settings when implemented
                }}
              >
                <Settings className="h-4 w-4" />
                {t('userMenu.settings')}
              </button>
            </div>

            <div className="border-t py-1">
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                <LogOut className="h-4 w-4" />
                {isLoading ? `${t('userMenu.logout')}...` : t('userMenu.logout')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
