/**
 * Minimal PFAS token test - matches exact code that previously returned ID4058
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

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function main() {
  const pfx = fs.readFileSync(config.certificatePath);
  const { execSync } = await import('child_process');

  const privateKeyPem = execSync(
    `openssl pkcs12 -in "${config.certificatePath}" -nocerts -nodes -passin pass:'${config.certificatePassword}'`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/^[\s\S]*?(-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----)[\s\S]*$/, '$1');

  const publicCertPem = execSync(
    `openssl pkcs12 -in "${config.certificatePath}" -clcerts -nokeys -passin pass:'${config.certificatePassword}'`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/^[\s\S]*?(-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----)[\s\S]*$/, '$1');

  // Original code that returned ID4058
  const certDer = Buffer.from(
    publicCertPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, ''),
    'base64'
  );
  const thumbprint = crypto.createHash('sha1').update(certDer).digest();
  const x5t = base64url(thumbprint);
  const x5c = certDer.toString('base64');

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
    x5t: x5t,
    x5c: [x5c],
  };

  const payload = {
    iss: config.consumerKey,
    sub: config.consumerKey,
    aud: 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token',
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + 300,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKeyPem);
  const jwt = `${signingInput}.${base64url(signature)}`;

  console.log(`JWT length: ${jwt.length}`);

  const bodyParams = new URLSearchParams({
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwt,
    grant_type: 'client_credentials',
    client_id: config.consumerKey,
    client_secret: config.consumerSecret,
  });

  const postData = bodyParams.toString();
  const url = new URL(config.authUrl);

  const req = https.request(
    {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': String(Buffer.byteLength(postData)),
      },
      pfx,
      passphrase: config.certificatePassword,
      rejectUnauthorized: true,
    },
    (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${body}`);
      });
    }
  );
  req.on('error', (e) => console.error('Error:', e));
  req.write(postData);
  req.end();
}

main().catch(console.error);
