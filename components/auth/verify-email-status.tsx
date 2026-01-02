'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Check, X, ArrowLeft } from 'lucide-react';

export function VerifyEmailStatus() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError(t('verifyEmail.errorMessage'));
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setError(data.error || t('verifyEmail.errorMessage'));
          return;
        }

        setStatus('success');
      } catch (error) {
        setStatus('error');
        setError(t('errors.generic'));
      }
    };

    verifyEmail();
  }, [token, t]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setResendLoading(true);
    setResendError(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendSuccess(true);
      } else {
        setResendError(t('resendVerification.error'));
      }
    } catch {
      setResendError(t('resendVerification.error'));
    } finally {
      setResendLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('verifyEmail.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {t('verifyEmail.checking')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('verifyEmail.successTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FEC200]">
            <Check className="h-8 w-8 text-black" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('verifyEmail.successMessage')}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('verifyEmail.backToLogin')}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('verifyEmail.errorTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <X className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">
          {error || t('verifyEmail.errorMessage')}
        </p>

        {resendSuccess ? (
          <p className="mt-4 text-sm text-green-600">{t('resendVerification.success')}</p>
        ) : (
          <form onSubmit={handleResendVerification} className="mt-6 space-y-3">
            <p className="text-sm font-medium">{t('resendVerification.requestNew')}</p>
            <Input
              type="email"
              placeholder={t('resendVerification.enterEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={resendLoading}
            />
            {resendError && (
              <p className="text-sm text-destructive">{resendError}</p>
            )}
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={resendLoading || !email}
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('resendVerification.sending')}
                </>
              ) : (
                t('resendVerification.button')
              )}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center gap-4">
        <Link href="/login">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('verifyEmail.backToLogin')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
