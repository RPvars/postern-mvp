import { z } from 'zod';

const configSchema = z.object({
  authUrl: z.string().url(),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
  certificatePath: z.string().optional(),
  certificatePassword: z.string().optional(),
  useMockData: z.boolean().default(false),
});

function getConfig() {
  const config = {
    authUrl: process.env.BR_AUTH_URL || 'https://ha.vraa.gov.lv/STS/VISS.Pfas.STS/oauth2/token',
    consumerKey: process.env.BR_CONSUMER_KEY || '',
    consumerSecret: process.env.BR_CONSUMER_SECRET || '',
    certificatePath: process.env.BR_CERTIFICATE_PATH,
    certificatePassword: process.env.BR_CERTIFICATE_PASSWORD,
    useMockData: process.env.BR_USE_MOCK_DATA === 'true',
  };

  return configSchema.parse(config);
}

export const businessRegisterConfig = getConfig();
