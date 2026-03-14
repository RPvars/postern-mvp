import 'dotenv/config';
import { execSync } from 'child_process';
import { createSign, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as https from 'https';

const pfxPath = process.env.BR_CERTIFICATE_PATH!;
const pfxPass = process.env.BR_CERTIFICATE_PASSWORD!;
const consumerKey = process.env.BR_CONSUMER_KEY!;
const consumerSecret = process.env.BR_CONSUMER_SECRET!;

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function httpsReq(opts: any, body?: string): Promise<{status:number,body:string}> {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => resolve({status: res.statusCode!, body: data}));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken(): Promise<string> {
  const privateKeyPem = execSync(
    `openssl pkcs12 -in "${pfxPath}" -nocerts -nodes -passin pass:'${pfxPass}'`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/^[\s\S]*?(-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----)[\s\S]*$/, '$1');
  const certPem = execSync(
    `openssl pkcs12 -in "${pfxPath}" -clcerts -nokeys -passin pass:'${pfxPass}'`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(/^[\s\S]*?(-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----)[\s\S]*$/, '$1');
  const certDer = certPem.replace(/-----BEGIN CERTIFICATE-----/g,'').replace(/-----END CERTIFICATE-----/g,'').replace(/\s/g,'');
  const clientId = consumerKey.replace('urn:oauth2:','');
  const now = Math.floor(Date.now()/1000);
  const h = base64url(JSON.stringify({ typ:'JWT', alg:'RS256', x5c:[certDer] }));
  const p = base64url(JSON.stringify({ iss:clientId, sub:clientId, aud:'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token', jti:randomUUID(), iat:now, nbf:now, exp:now+3600 }));
  const sign = createSign('RSA-SHA256');
  sign.update(h+'.'+p);
  const jwt = h+'.'+p+'.'+base64url(sign.sign(privateKeyPem));
  const postData = new URLSearchParams({
    client_assertion_type:'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion:jwt, grant_type:'client_credentials',
    client_id:clientId, client_secret:consumerSecret,
  }).toString();
  const pfx = fs.readFileSync(pfxPath);
  const res = await httpsReq({
    hostname:'apigw.viss.gov.lv', path:'/token', method:'POST', port:443,
    pfx, passphrase:pfxPass, rejectUnauthorized:true,
    headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(postData)},
  }, postData);
  return JSON.parse(res.body).access_token;
}

async function callApi(token: string, path: string, label: string) {
  const pfx = fs.readFileSync(pfxPath);
  console.log(`\n=== ${label} ===`);
  console.log(`GET https://apigw.viss.gov.lv${path}`);
  const res = await httpsReq({
    hostname:'apigw.viss.gov.lv', path, method:'GET', port:443,
    pfx, passphrase:pfxPass, rejectUnauthorized:true,
    headers:{'Authorization':`Bearer ${token}`, 'Accept':'application/json'},
  });
  console.log(`Status: ${res.status}`);
  try {
    const json = JSON.parse(res.body);
    console.log(JSON.stringify(json, null, 2).substring(0, 3000));
  } catch {
    console.log(`Body: ${res.body.substring(0, 500)}`);
  }
}

async function main() {
  const token = await getToken();
  console.log(`Token OK`);

  // Search with correct param 'q'
  await callApi(token, '/searchlegalentities/search/legal-entities?q=Latvenergo', 'Search: q=Latvenergo');
  
  // LegalEntity
  await callApi(token, '/legalentity/legal-entity/40003032949', 'LegalEntity: Latvenergo');
  
  // NaturalPerson - try different paths
  await callApi(token, '/naturalperson/legal-entity/40003032949/natural-persons', 'NaturalPerson: Latvenergo board');
  await callApi(token, '/naturalperson/natural-persons?registrationNumber=40003032949', 'NaturalPerson: alt path');
}

main().catch(console.error);
