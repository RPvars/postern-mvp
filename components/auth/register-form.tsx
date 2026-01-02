'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GoogleButton } from './google-button';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Password strength checks
  const passwordChecks = {
    minLength: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch =
    formData.password === formData.confirmPassword &&
    formData.confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!isPasswordValid) {
      setError(t('errors.passwordMin'));
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError(t('errors.passwordMismatch'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'An account with this email already exists') {
          setError(t('errors.accountExists'));
        } else if (response.status === 429) {
          setError(t('errors.rateLimited'));
        } else {
          setError(data.error || t('errors.generic'));
        }
        return;
      }

      // Check if email failed to send
      if (data.emailFailed) {
        setEmailFailed(true);
      }
      setSuccess(true);
    } catch (error) {
      setError(t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendError(null);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
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

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('verifyEmail.title')}</CardTitle>
          <CardDescription>{t('verifyEmail.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FEC200]">
            <Check className="h-8 w-8 text-black" />
          </div>
          <p className="text-sm text-muted-foreground">
            {emailFailed ? t('success.registeredEmailFailed') : t('success.registered')}
          </p>

          {resendSuccess ? (
            <p className="mt-4 text-sm text-green-600">{t('resendVerification.success')}</p>
          ) : resendError ? (
            <p className="mt-4 text-sm text-destructive">{resendError}</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {t('resendVerification.didntReceive')}{' '}
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-primary underline hover:no-underline disabled:opacity-50"
              >
                {resendLoading ? t('resendVerification.sending') : t('resendVerification.button')}
              </button>
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="outline">{t('verifyEmail.backToLogin')}</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
        <CardDescription>{t('register.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              {t('register.name')}
            </label>
            <Input
              id="name"
              type="text"
              placeholder={t('register.namePlaceholder')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('register.email')}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t('register.emailPlaceholder')}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('register.password')}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('register.passwordPlaceholder')}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formData.password && (
              <div className="mt-2 space-y-1 text-xs">
                <PasswordCheck
                  valid={passwordChecks.minLength}
                  text={t('errors.passwordMin')}
                />
                <PasswordCheck
                  valid={passwordChecks.uppercase}
                  text={t('errors.passwordUppercase')}
                />
                <PasswordCheck
                  valid={passwordChecks.lowercase}
                  text={t('errors.passwordLowercase')}
                />
                <PasswordCheck
                  valid={passwordChecks.number}
                  text={t('errors.passwordNumber')}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              {t('register.confirmPassword')}
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('register.confirmPasswordPlaceholder')}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {formData.confirmPassword && (
              <PasswordCheck
                valid={passwordsMatch}
                text={t('errors.passwordMismatch')}
              />
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#FEC200] text-black font-semibold hover:bg-[#FEC200]/90"
            disabled={isLoading || !isPasswordValid || !passwordsMatch}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('register.title')}...
              </>
            ) : (
              t('register.submit')
            )}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {t('register.orContinueWith')}
            </span>
          </div>
        </div>

        <GoogleButton text={t('register.google')} />
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t('register.hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('register.login')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

function PasswordCheck({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1 ${valid ? 'text-green-600' : 'text-muted-foreground'}`}>
      {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}
