/**
 * Tests multiple token endpoint + auth method combinations
 * to find the correct one for VISS PFAS OAuth2.
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pfx = fs.readFileSync(process.env.BR_CERTIFICATE_PATH || '');
const passphrase = process.env.BR_CERTIFICATE_PASSWORD || '';
const key = process.env.BR_CONSUMER_KEY || '';
const secret = process.env.BR_CONSUMER_SECRET || '';

interface TestCase {
  name: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

// Server prepends "urn:oauth2:" to Basic Auth username.
// So we should send just the UUID part as username.
const keyUuid = key.replace('urn:oauth2:', '');
const basicAuthUuid = Buffer.from(`${keyUuid}:${secret}`).toString('base64');

const stsUrl = 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token';
const apigwUrl = 'https://apigw.viss.gov.lv/token';

// Try direct API calls - maybe Mutual SSL (cert = auth, no OAuth needed)
const tests: TestCase[] = [
  // Direct API with cert only (no auth headers)
  {
    name: '1) NaturalPerson API - cert only, no auth',
    url: 'https://apigw.viss.gov.lv/naturalperson/v1_2/natural-person/220146-11844',
    headers: { 'Accept': 'application/json' },
    body: '',
  },
  // Direct API with cert + consumer key as Bearer
  {
    name: '2) NaturalPerson API - cert + Bearer consumer key',
    url: 'https://apigw.viss.gov.lv/naturalperson/v1_2/natural-person/220146-11844',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: '',
  },
  // Direct API with cert + API Key header
  {
    name: '3) NaturalPerson API - cert + apikey header',
    url: 'https://apigw.viss.gov.lv/naturalperson/v1_2/natural-person/220146-11844',
    headers: {
      'Accept': 'application/json',
      'apikey': key,
    },
    body: '',
  },
  // Direct API with cert + Basic Auth (consumer key)
  {
    name: '4) NaturalPerson API - cert + Basic Auth UUID',
    url: 'https://apigw.viss.gov.lv/naturalperson/v1_2/natural-person/220146-11844',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuthUuid}`,
    },
    body: '',
  },
  // SearchLegalEntities with cert only
  {
    name: '5) SearchLegalEntities - cert only',
    url: 'https://apigw.viss.gov.lv/searchlegalentities/v1.0/legal-entities?name=Latvenergo',
    headers: { 'Accept': 'application/json' },
    body: '',
  },
  // LegalEntity with cert only
  {
    name: '6) LegalEntity - cert only',
    url: 'https://apigw.viss.gov.lv/legalentity/v1.0/legal-entity/40003032949',
    headers: { 'Accept': 'application/json' },
    body: '',
  },
];

function doRequest(test: TestCase): Promise<void> {
  return new Promise((resolve) => {
    const url = new URL(test.url);
    const headers: Record<string, string> = {
      ...test.headers,
      'Content-Length': String(Buffer.byteLength(test.body)),
    };

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: test.body ? 'POST' : 'GET',
        headers,
        pfx,
        passphrase,
        rejectUnauthorized: true,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          const status = res.statusCode || 0;
          const marker = status >= 200 && status < 300 ? 'SUCCESS' : 'FAIL';
          console.log(`--- ${test.name} ---`);
          console.log(`[${marker}] Status: ${status}`);
          console.log(`Response: ${body.substring(0, 300)}`);
          console.log('');
          resolve();
        });
      }
    );
    req.on('error', (e) => {
      console.log(`--- ${test.name} ---`);
      console.log(`[ERROR] ${e.message}`);
      console.log('');
      resolve();
    });
    req.write(test.body);
    req.end();
  });
}

async function main() {
  console.log('Testing token endpoint variants...\n');
  for (const t of tests) {
    await doRequest(t);
  }
}

main().catch(console.error);
