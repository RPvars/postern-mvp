export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('lv-LV', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('lv-LV');
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}
