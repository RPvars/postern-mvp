import { Suspense } from 'react';
import { VerifyEmailStatus } from '@/components/auth/verify-email-status';

export const metadata = {
  title: 'Apstiprināt e-pastu | Posterns',
  description: 'Apstiprināt savu e-pasta adresi',
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
