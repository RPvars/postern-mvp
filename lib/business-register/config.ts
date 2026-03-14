import { z } from 'zod';

const configSchema = z.object({
  authUrl: z.string().url(),
  consumerKey: z.string(),
  consumerSecret: z.string(),
  certificatePath: z.string().optional(),
  certificatePassword: z.string().optional(),
  useMockData: z.boolean().default(false),
  transactionApiUrl: z.string().url(),
  pingpongUrl: z.string().url(),
  eServiceId: z.string(),
  authorityIdent: z.string(),
  apiGatewayUrl: z.string().url(),
});

function getConfig() {
  const config = {
    authUrl: process.env.BR_AUTH_URL || 'https://apigw.viss.gov.lv/token',
    consumerKey: process.env.BR_CONSUMER_KEY || '',
    consumerSecret: process.env.BR_CONSUMER_SECRET || '',
    certificatePath: process.env.BR_CERTIFICATE_PATH,
    certificatePassword: process.env.BR_CERTIFICATE_PASSWORD,
    useMockData: process.env.BR_USE_MOCK_DATA === 'true',
    transactionApiUrl: process.env.BR_TRANSACTION_API_URL || 'https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/transactions',
    pingpongUrl: process.env.BR_PINGPONG_URL || 'https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/pingpong',
    eServiceId: process.env.BR_ESERVICE_ID || 'URN:IVIS:100001:EP.DA-DA616-V1-0',
    authorityIdent: process.env.BR_AUTHORITY_IDENT || 'FP_RPAVARS',
    apiGatewayUrl: process.env.BR_API_GATEWAY_URL || 'https://apigw.viss.gov.lv',
  };

  return configSchema.parse(config);
}

export const businessRegisterConfig = getConfig();
