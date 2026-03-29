export type RatioWarningType = 'negativeEquity' | 'negativeEquityNegativeIncome' | 'lowEquityRatio';

export interface RatioWarning {
  type: RatioWarningType;
  messageKey: string;
  params?: Record<string, string | number>;
}
