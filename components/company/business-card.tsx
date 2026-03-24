'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, Phone, Mail, Tag, Globe, ExternalLink } from 'lucide-react';
import type { Company } from '@/lib/types/company';

interface BusinessCardProps {
  company: Company;
}

function getDomain(company: Company): string | null {
  // Prefer website domain
  if (company.website) {
    try {
      return new URL(company.website.startsWith('http') ? company.website : `https://${company.website}`).hostname.replace(/^www\./, '');
    } catch { /* ignore */ }
  }
  // Fallback to email domain
  if (company.email) {
    const domain = company.email.split('@')[1];
    if (domain && !domain.includes('gmail') && !domain.includes('inbox') && !domain.includes('yahoo')) {
      return domain;
    }
  }
  return null;
}

export function BusinessCard({ company }: BusinessCardProps) {
  const [logoError, setLogoError] = useState(false);
  const domain = getDomain(company);
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

  const hasContactInfo = company.phone || company.email || company.website;
  const hasNace = company.naceCode && company.naceDescription;

  // Always show if there's address or NACE (most companies have both)
  if (!company.legalAddress && !hasContactInfo && !hasNace) return null;

  return (
    <div className="container mx-auto px-4 pt-4">
      <div className="flex items-start gap-4 rounded-lg border bg-card p-4">
        {/* Logo */}
        <div className="shrink-0">
          {logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt={company.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-md object-contain bg-white p-1"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Address */}
          {company.legalAddress && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{company.legalAddress}</span>
            </div>
          )}

          {/* Contact info */}
          {hasContactInfo && (
            <div className="flex items-center gap-4 flex-wrap">
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  {domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {company.phone}
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {company.email}
                </a>
              )}
            </div>
          )}

          {/* NACE */}
          {hasNace && (
            <Link
              href={`/industries/${company.naceCode}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {company.naceCode} — {company.naceDescription}
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
