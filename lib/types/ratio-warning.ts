export type RatioWarningType = 'negativeEquity' | 'negativeEquityNegativeIncome' | 'lowEquityRatio';

export interface RatioWarning {
  type: RatioWarningType;
  params?: Record<string, string | number>;
}
