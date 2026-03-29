'use client';

import { FinancialRatiosDisplay } from '@/components/financial-ratios-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { MOCK_COMPANIES } from './mock-data';

export function DevRatiosClient() {
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">DEV: Finanšu rādītāju testa lapa</h1>
        <p className="text-sm text-muted-foreground mt-1">
          5 mock uzņēmumi ar dažādiem equity scenārijiem. Tikai development vidē.
        </p>
      </div>

      {MOCK_COMPANIES.map((company) => {
        const latest = company.ratios[0];
        const warning = latest?.ratioWarnings?.['returnOnEquity'];

        return (
          <div key={company.name} className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{company.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{company.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tīrā peļņa:</span>
                    <p className="font-mono font-semibold">
                      {latest?.netIncome != null ? formatCurrency(latest.netIncome) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pašu kapitāls:</span>
                    <p className="font-mono font-semibold">
                      {latest?.equity != null ? formatCurrency(latest.equity) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Aktīvi:</span>
                    <p className="font-mono font-semibold">
                      {latest?.totalAssets != null ? formatCurrency(latest.totalAssets) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ROE:</span>
                    <p className="font-mono font-semibold">
                      {latest?.returnOnEquity != null
                        ? `${(latest.returnOnEquity * 100).toFixed(2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Brīdinājums:</span>
                    <p className={`font-semibold ${warning ? 'text-[#FF8042]' : 'text-green-600'}`}>
                      {warning ? warning.type : 'Nav'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FinancialRatiosDisplay ratios={company.ratios} />
          </div>
        );
      })}
    </div>
  );
}
