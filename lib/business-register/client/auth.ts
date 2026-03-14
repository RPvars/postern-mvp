import { createSign, randomUUID } from 'crypto';
import { execSync } from 'child_process';
import { businessRegisterConfig } from '../config';
import { httpsRequestWithCert } from './https-util';

const PFAS_AUDIENCE = 'https://ha.viss.gov.lv/STS/VISS.Pfas.STS/oauth2/token';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function extractKeysFromPfx(
  pfxPath: string,
  password: string
): { privateKeyPem: string; certDerBase64: string } {
  // Use stdin for password to avoid shell injection via pass: argument
  const privateKeyPem = execSync(
    `openssl pkcs12 -in "${pfxPath}" -nocerts -nodes -passin stdin`,
    { encoding: 'utf-8', input: password, stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(
    /^[\s\S]*?(-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----)[\s\S]*$/,
    '$1'
  );

  const certPem = execSync(
    `openssl pkcs12 -in "${pfxPath}" -clcerts -nokeys -passin stdin`,
    { encoding: 'utf-8', input: password, stdio: ['pipe', 'pipe', 'pipe'] }
  ).replace(
    /^[\s\S]*?(-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----)[\s\S]*$/,
    '$1'
  );

  const certDerBase64 = certPem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');

  return { privateKeyPem, certDerBase64 };
}

function buildClientAssertionJwt(
  clientId: string,
  privateKeyPem: string,
  certDerBase64: string
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'RS256', x5c: [certDerBase64] };
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: PFAS_AUDIENCE,
    jti: randomUUID(),
    iat: now,
    nbf: now,
    exp: now + 3600,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(privateKeyPem);

  return `${signingInput}.${base64url(signature)}`;
}

export class AuthClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private privateKeyPem: string | null = null;
  private certDerBase64: string | null = null;

  private loadKeys(): void {
    if (this.privateKeyPem && this.certDerBase64) return;

    if (!businessRegisterConfig.certificatePath || !businessRegisterConfig.certificatePassword) {
      throw new Error(
        'Certificate not configured. Set BR_CERTIFICATE_PATH and BR_CERTIFICATE_PASSWORD.'
      );
    }

    const keys = extractKeysFromPfx(
      businessRegisterConfig.certificatePath,
      businessRegisterConfig.certificatePassword
    );
    this.privateKeyPem = keys.privateKeyPem;
    this.certDerBase64 = keys.certDerBase64;
  }

  async getAccessToken(): Promise<string> {
    if (businessRegisterConfig.useMockData) {
      return 'MOCK_ACCESS_TOKEN';
    }

    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!businessRegisterConfig.consumerKey || !businessRegisterConfig.consumerSecret) {
      throw new Error(
        'Consumer credentials not configured. Set BR_CONSUMER_KEY and BR_CONSUMER_SECRET.'
      );
    }

    this.loadKeys();

    const clientId = businessRegisterConfig.consumerKey.replace('urn:oauth2:', '');
    const jwt = buildClientAssertionJwt(clientId, this.privateKeyPem!, this.certDerBase64!);

    const postData = new URLSearchParams({
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: jwt,
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: businessRegisterConfig.consumerSecret,
    }).toString();

    const response = await httpsRequestWithCert({
      url: businessRegisterConfig.authUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: postData,
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `Authentication failed: ${response.statusCode} - ${response.body}`
      );
    }

    let data: TokenResponse;
    try {
      data = JSON.parse(response.body) as TokenResponse;
    } catch {
      throw new Error(`Failed to parse token response: ${response.body}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

    return this.accessToken;
  }
}

export const authClient = new AuthClient();
