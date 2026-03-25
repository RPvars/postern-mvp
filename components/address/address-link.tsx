import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface AddressLinkProps {
  address: string;
  showIcon?: boolean;
  variant?: 'accent' | 'subtle';
  className?: string;
}

export function AddressLink({ address, showIcon = true, variant = 'accent', className = '' }: AddressLinkProps) {
  const variantClass = variant === 'accent'
    ? 'text-link-accent hover:text-link-accent-hover hover:underline'
    : 'text-muted-foreground hover:text-foreground';

  return (
    <Link
      href={`/address?q=${encodeURIComponent(address)}`}
      className={`inline-flex items-center gap-1.5 transition-colors ${variantClass} ${className}`}
    >
      {showIcon && <MapPin className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{address}</span>
    </Link>
  );
}
