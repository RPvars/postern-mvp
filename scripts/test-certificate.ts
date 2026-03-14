/**
 * Business Register API - Production Environment Diagnostic Script
 *
 * Tests connectivity, certificate, authentication, and transaction API step by step.
 *
 * Run with: npx tsx scripts/test-certificate.ts
 * Run specific step: npx tsx scripts/test-certificate.ts --step=3
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const config = {
  authUrl: process.env.BR_AUTH_URL || 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token',
  consumerKey: process.env.BR_CONSUMER_KEY || '',
  consumerSecret: process.env.BR_CONSUMER_SECRET || '',
  certificatePath: process.env.BR_CERTIFICATE_PATH || '',
  certificatePassword: process.env.BR_CERTIFICATE_PASSWORD || '',
  transactionApiUrl: process.env.BR_TRANSACTION_API_URL || 'https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/transactions',
  pingpongUrl: process.env.BR_PINGPONG_URL || 'https://vissapi.viss.gov.lv/ApiManagement.TransactionApi/pingpong',
  eServiceId: process.env.BR_ESERVICE_ID || 'URN:IVIS:100001:EP.DA-DA616-V1-0',
  authorityIdent: process.env.BR_AUTHORITY_IDENT || 'FP_RPAVARS',
  apiBaseUrl: process.env.BR_API_BASE_URL || '',
};

function mask(value: string, showChars = 4): string {
  if (!value) return '(not set)';
  if (value.length <= showChars) return '****';
  return value.substring(0, showChars) + '****';
}

function httpsRequest(options: {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  pfx?: Buffer;
  passphrase?: string;
}): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method,
      headers: { ...options.headers },
      rejectUnauthorized: true,
    };

    if (options.pfx) {
      reqOptions.pfx = options.pfx;
      reqOptions.passphrase = options.passphrase;
    }

    if (options.body) {
      reqOptions.headers = {
        ...reqOptions.headers,
        'Content-Length': String(Buffer.byteLength(options.body)),
      };
    }

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body });
      });
    });

    req.on('error', (e) => reject(e));

    if (options.body) req.write(options.body);
    req.end();
  });
}

// ─── Step 1: Environment Check ───

function step1_environment(): boolean {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 1: Environment Configuration   ║');
  console.log('╚══════════════════════════════════════╝\n');

  console.log(`  Auth URL:           ${config.authUrl}`);
  console.log(`  Transaction API:    ${config.transactionApiUrl}`);
  console.log(`  Pingpong URL:       ${config.pingpongUrl}`);
  console.log(`  eServiceId:         ${config.eServiceId}`);
  console.log(`  Authority Ident:    ${config.authorityIdent}`);
  console.log(`  API Base URL:       ${config.apiBaseUrl || '(not set - TBD after portal subscription)'}`);
  console.log(`  Consumer Key:       ${mask(config.consumerKey)}`);
  console.log(`  Consumer Secret:    ${mask(config.consumerSecret)}`);
  console.log(`  Certificate Path:   ${config.certificatePath || '(not set)'}`);
  console.log(`  Certificate Pass:   ${config.certificatePassword ? '****' : '(not set)'}`);

  const isProduction = config.authUrl.includes('viss.gov.lv');
  console.log(`\n  Environment:        ${isProduction ? 'PRODUCTION (viss.gov.lv)' : 'TEST (vraa.gov.lv)'}`);

  console.log('\n  [PASS] Environment configuration loaded');
  return true;
}

// ─── Step 2: Certificate Check ───

function step2_certificate(): { success: boolean; pfx?: Buffer } {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 2: Certificate Verification    ║');
  console.log('╚══════════════════════════════════════╝\n');

  if (!config.certificatePath) {
    console.log('  [FAIL] BR_CERTIFICATE_PATH not set in .env');
    return { success: false };
  }

  if (!fs.existsSync(config.certificatePath)) {
    console.log(`  [FAIL] Certificate file not found: ${config.certificatePath}`);
    return { success: false };
  }

  try {
    const pfx = fs.readFileSync(config.certificatePath);
    console.log(`  Certificate: ${config.certificatePath}`);
    console.log(`  Size: ${pfx.length} bytes`);
    console.log('\n  [PASS] Certificate loaded successfully');
    return { success: true, pfx };
  } catch (error) {
    console.log(`  [FAIL] Failed to load certificate: ${error}`);
    return { success: false };
  }
}

// ─── Step 3: Pingpong (Network + Certificate Test) ───

async function step3_pingpong(pfx: Buffer): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 3: Pingpong Connectivity Test  ║');
  console.log('╚══════════════════════════════════════╝\n');

  const url = new URL(config.pingpongUrl);
  console.log(`  Connecting to: ${url.hostname}${url.pathname}`);

  try {
    const response = await httpsRequest({
      url: config.pingpongUrl,
      method: 'GET',
      pfx,
      passphrase: config.certificatePassword,
    });

    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Response: ${response.body.substring(0, 200)}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('\n  [PASS] Pingpong successful - network and certificate OK');
      return true;
    } else {
      console.log('\n  [FAIL] Pingpong returned error status');
      console.log('  Possible causes:');
      console.log('  - Certificate not registered with VISS production environment');
      console.log('  - Network/firewall blocking access to vissapi.viss.gov.lv');
      return false;
    }
  } catch (error) {
    console.log(`\n  [FAIL] Pingpong failed: ${error}`);
    console.log('  Possible causes:');
    console.log('  - Certificate not trusted by the server');
    console.log('  - Network connectivity issues');
    console.log('  - DNS resolution failure for vissapi.viss.gov.lv');
    return false;
  }
}

// ─── Step 4: Credentials Check ───

function step4_credentials(): boolean {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 4: API Credentials Check       ║');
  console.log('╚══════════════════════════════════════╝\n');

  if (!config.consumerKey || !config.consumerSecret) {
    console.log('  [SKIP] Consumer Key and/or Secret not set');
    console.log('');
    console.log('  To get credentials:');
    console.log('  1. Import FP_RPAVARS.pfx into your browser (macOS Keychain or Firefox)');
    console.log('  2. Go to: https://api.viss.gov.lv/devportal/apis');
    console.log('  3. Login with username: API_RPAVARS');
    console.log('  4. Create application: APP-FP_RPAVARS-PosternMVP');
    console.log('  5. Subscribe to the Business Register API');
    console.log('  6. Copy Consumer Key and Secret to .env:');
    console.log('     BR_CONSUMER_KEY="your-key"');
    console.log('     BR_CONSUMER_SECRET="your-secret"');
    return false;
  }

  console.log(`  Consumer Key:    ${mask(config.consumerKey, 8)}`);
  console.log(`  Consumer Secret: ${mask(config.consumerSecret, 4)}`);
  console.log('\n  [PASS] Credentials configured');
  return true;
}

// ─── Step 5: OAuth Token ───

async function step5_token(pfx: Buffer): Promise<{ success: boolean; token?: string }> {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 5: OAuth Token Request         ║');
  console.log('╚══════════════════════════════════════╝\n');

  if (!config.consumerKey || !config.consumerSecret) {
    console.log('  [SKIP] No credentials - complete Step 4 first');
    return { success: false };
  }

  const url = new URL(config.authUrl);
  console.log(`  Token endpoint: ${url.hostname}${url.pathname}`);

  const postData = new URLSearchParams({
    grant_type: 'client_credentials',
  }).toString();

  const keyId = config.consumerKey.replace('urn:oauth2:', '');
  const basicAuth = Buffer.from(
    `${keyId}:${config.consumerSecret}`
  ).toString('base64');

  try {
    const response = await httpsRequest({
      url: config.authUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: postData,
      pfx,
      passphrase: config.certificatePassword,
    });

    console.log(`  Status: ${response.statusCode}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const data = JSON.parse(response.body);
      console.log(`  Token type: ${data.token_type}`);
      console.log(`  Expires in: ${data.expires_in} seconds`);
      console.log(`  Token: ${data.access_token.substring(0, 50)}...`);
      console.log('\n  [PASS] OAuth token obtained successfully');
      return { success: true, token: data.access_token };
    } else {
      console.log(`  Response: ${response.body}`);
      console.log('\n  [FAIL] Token request failed');
      console.log('  Possible causes:');
      console.log('  - Invalid consumer key/secret');
      console.log('  - Certificate not authorized for this application');
      console.log('  - Application not subscribed to any API');
      return { success: false };
    }
  } catch (error) {
    console.log(`\n  [FAIL] Token request error: ${error}`);
    return { success: false };
  }
}

// ─── Step 6: Transaction API ───

async function step6_transaction(pfx: Buffer, token: string): Promise<boolean> {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 6: Transaction API Test        ║');
  console.log('╚══════════════════════════════════════╝\n');

  const url = new URL(config.transactionApiUrl);
  console.log(`  Transaction API: ${url.hostname}${url.pathname}`);
  console.log(`  eServiceId: ${config.eServiceId}`);

  const transactionId = crypto.randomUUID().replace(/-/g, '');
  const body = JSON.stringify({
    eServiceId: config.eServiceId,
    transactionId,
  });

  try {
    const response = await httpsRequest({
      url: config.transactionApiUrl,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
      pfx,
      passphrase: config.certificatePassword,
    });

    console.log(`  Status: ${response.statusCode}`);
    console.log(`  Transaction ID: ${transactionId}`);
    console.log(`  Response: ${response.body.substring(0, 300)}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('\n  [PASS] Transaction created successfully');
      return true;
    } else {
      console.log('\n  [FAIL] Transaction creation failed');
      console.log('  Possible causes:');
      console.log('  - Invalid eServiceId');
      console.log('  - Token does not have transaction API scope');
      return false;
    }
  } catch (error) {
    console.log(`\n  [FAIL] Transaction API error: ${error}`);
    return false;
  }
}

// ─── Step 7: Portal Instructions ───

function step7_nextSteps() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Step 7: Next Steps                  ║');
  console.log('╚══════════════════════════════════════╝\n');

  if (!config.consumerKey) {
    console.log('  PRIORITY: Get API credentials from developer portal\n');
    console.log('  1. Import certificate into browser:');
    console.log(`     File: ${config.certificatePath}`);
    console.log('     (Double-click to add to macOS Keychain, or import in Firefox)\n');
    console.log('  2. Open developer portal:');
    console.log('     https://api.viss.gov.lv/devportal/apis\n');
    console.log('  3. Login:');
    console.log('     Username: API_RPAVARS');
    console.log('     Password: (sent to +37129997132)\n');
    console.log('  4. Create application:');
    console.log('     Name: APP-FP_RPAVARS-PosternMVP\n');
    console.log('  5. Subscribe to Business Register API\n');
    console.log('  6. Copy Consumer Key + Secret to .env:');
    console.log('     BR_CONSUMER_KEY="your-key"');
    console.log('     BR_CONSUMER_SECRET="your-secret"\n');
    console.log('  7. Re-run this script: npx tsx scripts/test-certificate.ts');
  } else if (!config.apiBaseUrl) {
    console.log('  PRIORITY: Find and set the Business Register API base URL\n');
    console.log('  1. In the developer portal, find the subscribed API endpoint URL');
    console.log('  2. Set it in .env:');
    console.log('     BR_API_BASE_URL="https://..."');
    console.log('  3. Set BR_USE_MOCK_DATA="false"');
    console.log('  4. Start using real API data!');
  } else {
    console.log('  All configured! Set BR_USE_MOCK_DATA="false" to switch to live data.');
  }
}

// ─── Main ───

async function main() {
  const stepArg = process.argv.find(a => a.startsWith('--step='));
  const onlyStep = stepArg ? parseInt(stepArg.split('=')[1]) : null;

  console.log('\n========================================');
  console.log('  Business Register API Diagnostic');
  console.log('  Production Environment');
  console.log('========================================');

  // Step 1: Environment
  if (!onlyStep || onlyStep === 1) {
    step1_environment();
  }

  // Step 2: Certificate
  let pfx: Buffer | undefined;
  if (!onlyStep || onlyStep === 2) {
    const result = step2_certificate();
    pfx = result.pfx;
    if (!result.success && !onlyStep) {
      console.log('\n  Cannot continue without certificate. Fix and re-run.');
      return;
    }
  } else {
    // Load cert silently for later steps
    if (config.certificatePath && fs.existsSync(config.certificatePath)) {
      pfx = fs.readFileSync(config.certificatePath);
    }
  }

  // Step 3: Pingpong
  if ((!onlyStep || onlyStep === 3) && pfx) {
    await step3_pingpong(pfx);
  }

  // Step 4: Credentials
  if (!onlyStep || onlyStep === 4) {
    step4_credentials();
  }

  // Step 5: Token
  let token: string | undefined;
  if ((!onlyStep || onlyStep === 5) && pfx) {
    const result = await step5_token(pfx);
    token = result.token;
  }

  // Step 6: Transaction
  if ((!onlyStep || onlyStep === 6) && pfx && token) {
    await step6_transaction(pfx, token);
  } else if ((!onlyStep || onlyStep === 6) && !token) {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  Step 6: Transaction API Test        ║');
    console.log('╚══════════════════════════════════════╝\n');
    console.log('  [SKIP] No token available - complete Step 5 first');
  }

  // Step 7: Next steps
  if (!onlyStep || onlyStep === 7) {
    step7_nextSteps();
  }

  console.log('\n========================================');
  console.log('  Diagnostic Complete');
  console.log('========================================\n');
}

main().catch(console.error);
