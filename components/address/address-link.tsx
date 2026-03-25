import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface AddressLinkProps {
  address: string;
  showIcon?: boolean;
  className?: string;
}

export function AddressLink({ address, showIcon = true, className = '' }: AddressLinkProps) {
  return (
    <Link
      href={`/address?q=${encodeURIComponent(address)}`}
      className={`inline-flex items-center gap-1.5 text-[#FEC200] hover:underline hover:decoration-[#FEC200] transition-colors ${className}`}
    >
      {showIcon && <MapPin className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{address}</span>
    </Link>
  );
}
