import { businessRegisterConfig } from '../config';
import fs from 'fs';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class AuthClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async getAccessToken(): Promise<string> {
    // Return mock token if mock mode enabled
    if (businessRegisterConfig.useMockData) {
      return 'MOCK_ACCESS_TOKEN';
    }

    // Check if current token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Load certificate
    if (!businessRegisterConfig.certificatePath) {
      throw new Error('Certificate path not configured. Set BR_CERTIFICATE_PATH environment variable.');
    }

    const certificate = fs.readFileSync(businessRegisterConfig.certificatePath);

    // Request new token with OAuth 2.0 + certificate
    const response = await fetch(businessRegisterConfig.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: businessRegisterConfig.consumerKey,
        client_secret: businessRegisterConfig.consumerSecret,
      }),
      // Certificate authentication (implementation depends on cert format)
      // This is a simplified example - real implementation may need node:tls
      // TODO: Implement proper certificate-based authentication with node:tls
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data: TokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    return this.accessToken;
  }
}

export const authClient = new AuthClient();
