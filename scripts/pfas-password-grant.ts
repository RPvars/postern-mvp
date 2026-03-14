/**
 * PFAS OAuth2 Token - Password Grant Flow
 *
 * From VDAA docs v2.23 section 5.6:
 *   curl -k -d "grant_type=password&username={PFAS_USER}&password={PFAS_PASS}&scope=PRODUCTION"
 *        -H "Authorization: Basic {base64(consumerKey:consumerSecret)}"
 *        https://apigw.viss.gov.lv/token
 *
 * Run: npx tsx scripts/pfas-password-grant.ts
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const config = {
  authUrl: process.env.BR_AUTH_URL || 'https://apigw.viss.gov.lv/token',
  consumerKey: process.env.BR_CONSUMER_KEY || '',
  consumerSecret: process.env.BR_CONSUMER_SECRET || '',
  pfasUsername: process.env.BR_PORTAL_USERNAME || '',
  pfasPassword: process.env.BR_PORTAL_PASSWORD || '',
  certificatePath: process.env.BR_CERTIFICATE_PATH || '',
  certificatePassword: process.env.BR_CERTIFICATE_PASSWORD || '',
};

function httpsPost(options: {
  url: string;
  headers: Record<string, string>;
  body: string;
  pfx?: Buffer;
  passphrase?: string;
}): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          ...options.headers,
          'Content-Length': String(Buffer.byteLength(options.body)),
        },
        ...(options.pfx ? { pfx: options.pfx, passphrase: options.passphrase } : {}),
        rejectUnauthorized: true,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body }));
      }
    );
    req.on('error', reject);
    req.write(options.body);
    req.end();
  });
}

async function main() {
  console.log('\n========================================');
  console.log('  PFAS Password Grant Flow');
  console.log('========================================\n');

  // Extract the UUID part from the consumer key for Basic Auth
  // Consumer key format: urn:oauth2:UUID
  const consumerKeyUuid = config.consumerKey.replace('urn:oauth2:', '');

  // Load PFX for mTLS
  let pfx: Buffer | undefined;
  if (config.certificatePath && fs.existsSync(config.certificatePath)) {
    pfx = fs.readFileSync(config.certificatePath);
    console.log(`  Certificate: ${config.certificatePath}`);
  }

  // Variants to try
  const variants = [
    {
      label: 'UUID key + API_RPAVARS + API password',
      basicUser: consumerKeyUuid,
      basicPass: config.consumerSecret,
      username: config.pfasUsername,
      password: config.pfasPassword,
      usePfx: true,
    },
    {
      label: 'UUID key + FP_RPAVARS + API password',
      basicUser: consumerKeyUuid,
      basicPass: config.consumerSecret,
      username: 'FP_RPAVARS',
      password: config.pfasPassword,
      usePfx: true,
    },
    {
      label: 'UUID key + API_RPAVARS + cert password',
      basicUser: consumerKeyUuid,
      basicPass: config.consumerSecret,
      username: config.pfasUsername,
      password: config.certificatePassword,
      usePfx: true,
    },
    {
      label: 'UUID key + FP_RPAVARS + cert password',
      basicUser: consumerKeyUuid,
      basicPass: config.consumerSecret,
      username: 'FP_RPAVARS',
      password: config.certificatePassword,
      usePfx: true,
    },
    {
      label: 'UUID key + API_RPAVARS + no scope',
      basicUser: consumerKeyUuid,
      basicPass: config.consumerSecret,
      username: config.pfasUsername,
      password: config.pfasPassword,
      usePfx: true,
      noScope: true,
    },
  ];

  for (const v of variants) {
    console.log(`\n  --- ${v.label} ---`);

    const basicAuth = Buffer.from(`${v.basicUser}:${v.basicPass}`).toString('base64');

    const bodyObj: Record<string, string> = {
      grant_type: 'password',
      username: v.username,
      password: v.password,
    };
    if (!(v as any).noScope) bodyObj.scope = 'PRODUCTION';
    const bodyParams = new URLSearchParams(bodyObj);

    console.log(`  Basic Auth user: ${v.basicUser.substring(0, 30)}...`);
    console.log(`  PFAS username: ${v.username}`);
    console.log(`  URL: ${config.authUrl}`);

    try {
      const resp = await httpsPost({
        url: config.authUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: bodyParams.toString(),
        ...(v.usePfx && pfx ? { pfx, passphrase: config.certificatePassword } : {}),
      });

      console.log(`  Status: ${resp.statusCode}`);
      console.log(`  Response: ${resp.body.substring(0, 500)}`);

      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        const data = JSON.parse(resp.body);
        console.log('\n  ==============================');
        console.log('  TOKEN ACQUIRED!');
        console.log('  ==============================');
        console.log(`  Token type: ${data.token_type}`);
        console.log(`  Expires in: ${data.expires_in}s`);
        console.log(`  Access token: ${data.access_token?.substring(0, 80)}...`);
        return; // Success, stop trying
      }
    } catch (e) {
      console.log(`  Error: ${e}`);
    }
  }

  console.log('\n  All variants failed.');
  console.log('\n========================================\n');
}

main().catch(console.error);
