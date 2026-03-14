/**
 * PFAS OAuth2 Token Acquisition Script
 *
 * Uses JWT client_assertion signed with the PFAS certificate's private key
 * as documented in VDAA "API Pārvaldnieka izmantošanas vadlīnijas" v2.6, section 3.1.
 *
 * Flow:
 * 1. Extract private key + public certificate from PFX
 * 2. Build a JWT signed with the private key (RS256)
 * 3. POST to token endpoint with client_assertion_type=jwt-bearer
 *
 * Run: npx tsx scripts/pfas-get-token.ts
 */
import crypto from 'crypto';
import fs from 'fs';
import https from 'https';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const config = {
  authUrl: process.env.BR_AUTH_URL || 'https://apigw.viss.gov.lv/token',
  consumerKey: process.env.BR_CONSUMER_KEY || '',
  consumerSecret: process.env.BR_CONSUMER_SECRET || '',
  certificatePath: process.env.BR_CERTIFICATE_PATH || '',
  certificatePassword: process.env.BR_CERTIFICATE_PASSWORD || '',
};

// ─── Helpers ───

function httpsRequest(options: {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
  pfx: Buffer;
  passphrase: string;
}): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          ...options.headers,
          'Content-Length': String(Buffer.byteLength(options.body)),
        },
        pfx: options.pfx,
        passphrase: options.passphrase,
        rejectUnauthorized: true,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body,
            headers: res.headers as Record<string, string>,
          });
        });
      }
    );
    req.on('error', reject);
    req.write(options.body);
    req.end();
  });
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── JWT Builder ───

function buildJwtWithAud(
  privateKey: string,
  publicCertPem: string,
  audience: string,
  variant: { iss: string; sub: string },
  caCertPem?: string,
): string {

  // Extract all certificates for x5c chain
  const certPems = publicCertPem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
  const x5c: string[] = [];

  for (const pem of certPems) {
    const der = Buffer.from(
      pem.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s/g, ''),
      'base64'
    );
    x5c.push(der.toString('base64'));
  }

  // Add CA cert if provided separately
  if (caCertPem) {
    const caPems = caCertPem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) || [];
    for (const pem of caPems) {
      const der = Buffer.from(
        pem.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s/g, ''),
        'base64'
      );
      x5c.push(der.toString('base64'));
    }
  }

  // Thumbprint from first (client) certificate
  const firstCert = certPems[0];
  if (!firstCert) throw new Error('No certificate found in PFX file');
  const clientCertDer = Buffer.from(
    firstCert.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s/g, ''),
    'base64'
  );
  const thumbprint = crypto.createHash('sha1').update(clientCertDer).digest();
  const x5t = base64url(thumbprint);

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    x5t: x5t,
    x5c: x5c,
  };

  const payload = {
    iss: variant.iss,
    sub: variant.sub,
    aud: audience,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + 300, // 5 minutes
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKey);
  const signatureB64 = base64url(signature);

  return `${signingInput}.${signatureB64}`;
}

function buildJwt(privateKey: string, publicCertPem: string): string {
  const variant = { iss: config.consumerKey, sub: config.consumerKey };
  return buildJwtWithAud(privateKey, publicCertPem, 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token', variant);
}

// ─── Main ───

async function main() {
  console.log('\n========================================');
  console.log('  PFAS Token Acquisition');
  console.log('========================================\n');

  // 1. Load PFX
  if (!config.certificatePath || !fs.existsSync(config.certificatePath)) {
    console.error('Certificate not found. Set BR_CERTIFICATE_PATH in .env');
    process.exit(1);
  }
  const pfx = fs.readFileSync(config.certificatePath);
  console.log(`  Certificate: ${config.certificatePath}`);

  // 2. Extract private key and public cert from PFX using openssl via child_process
  const { execSync } = await import('child_process');

  const privateKeyPem = execSync(
    `openssl pkcs12 -in "${config.certificatePath}" -nocerts -nodes -passin pass:'${config.certificatePassword}'`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/^[\s\S]*?(-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----)[\s\S]*$/, '$1');

  const publicCertPem = execSync(
    `openssl pkcs12 -in "${config.certificatePath}" -clcerts -nokeys -passin pass:'${config.certificatePassword}'`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/^[\s\S]*?(-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----)[\s\S]*$/, '$1');

  // Extract CA certificates from PFX chain
  let caCertPem = '';
  try {
    caCertPem = execSync(
      `openssl pkcs12 -in "${config.certificatePath}" -cacerts -nokeys -passin pass:'${config.certificatePassword}'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    // Extract all CA cert PEM blocks
    const caMatches = caCertPem.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
    caCertPem = caMatches ? caMatches.join('\n') : '';
  } catch { caCertPem = ''; }

  console.log(`  Private key: extracted (${privateKeyPem.split('\n').length} lines)`);
  console.log(`  Client cert: extracted`);
  console.log(`  CA certs: ${caCertPem ? 'found' : 'none'}`);

  // 3. Build JWT — try with chain first, then without
  const variant = { iss: config.consumerKey, sub: config.consumerKey };
  const stsAud = 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token';

  // Variant A: client cert only in x5c (mTLS provides chain)
  const jwtClientOnly = buildJwtWithAud(privateKeyPem, publicCertPem, stsAud, variant);
  // Variant B: full chain in x5c
  const jwtWithChain = buildJwtWithAud(privateKeyPem, publicCertPem, stsAud, variant, caCertPem || undefined);

  console.log(`  JWT (client only): ${jwtClientOnly.length} chars`);
  console.log(`  JWT (with chain): ${jwtWithChain.length} chars`);

  const jwt = jwtWithChain; // Include full chain in x5c header

  // 4. Token request with client_assertion
  const tokenUrl = config.authUrl;
  console.log(`\n  Token endpoint: ${tokenUrl}`);

  const bodyParams = new URLSearchParams({
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwt,
    grant_type: 'client_credentials',
    client_id: config.consumerKey,
    client_secret: config.consumerSecret,
  });

  const postData = bodyParams.toString();

  console.log('\n  Sending token request...');

  try {
    // Try WITH mTLS (PFX) first
    console.log('  Attempt 1: with mTLS (PFX cert)...');
    const response = await httpsRequest({
      url: tokenUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData,
      pfx,
      passphrase: config.certificatePassword,
    });

    console.log(`\n  Status: ${response.statusCode}`);
    console.log(`  Response: ${response.body.substring(0, 500)}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      const data = JSON.parse(response.body);
      console.log('\n  ══════════════════════════════════');
      console.log('  TOKEN ACQUIRED SUCCESSFULLY!');
      console.log('  ══════════════════════════════════');
      console.log(`  Token type: ${data.token_type}`);
      console.log(`  Expires in: ${data.expires_in} seconds`);
      if (data.scope) console.log(`  Scope: ${data.scope}`);
      console.log(`  Access token: ${data.access_token.substring(0, 80)}...`);

      // Test the token with an API call
      console.log('\n  Testing token with LegalEntity API...');
      const apiResponse = await httpsRequest({
        url: 'https://apigw.viss.gov.lv/legalentity/v1.0/legal-entity/40003032949',
        method: 'POST', // Using POST to pass through httpsRequest, will adjust
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: '',
        pfx,
        passphrase: config.certificatePassword,
      });
      console.log(`  API Status: ${apiResponse.statusCode}`);
      console.log(`  API Response: ${apiResponse.body.substring(0, 300)}`);
    } else {
      console.log('\n  [FAIL] Token request failed');

      // Try alternate endpoints
      const alternates = [
        { url: 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token', aud: 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token', label: 'Production STS direct' },
        { url: 'https://apitestgw.vraa.gov.lv/token', aud: 'https://ha.vraa.gov.lv/STS/VISS.Pfas.STS/oauth2/token', label: 'TEST gateway' },
      ];

      for (const alt of alternates) {
        console.log(`\n  Trying: ${alt.label} (${alt.url})...`);
        // Rebuild JWT with correct audience for this endpoint
        const altJwt = buildJwtWithAud(privateKeyPem, publicCertPem, alt.aud, variant, caCertPem || undefined);
        const altBody = new URLSearchParams({
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: altJwt,
          grant_type: 'client_credentials',
          client_id: config.consumerKey,
          client_secret: config.consumerSecret,
        }).toString();

        try {
          const resp = await httpsRequest({
            url: alt.url,
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: altBody,
            pfx,
            passphrase: config.certificatePassword,
          });
          console.log(`  Status: ${resp.statusCode}`);
          console.log(`  Response: ${resp.body.substring(0, 400)}`);
        } catch (e) {
          console.log(`  Error: ${e}`);
        }
      }
    }
  } catch (error) {
    console.error(`\n  [ERROR] ${error}`);
  }

  console.log('\n========================================\n');
}

main().catch(console.error);
