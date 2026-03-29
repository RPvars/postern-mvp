import { redirect } from 'next/navigation';
import { DevRatiosClient } from './client';

export default function DevRatiosPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/');
  }

  return <DevRatiosClient />;
}
