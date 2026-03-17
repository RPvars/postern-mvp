import * as https from 'https';
import * as fs from 'fs';
import { businessRegisterConfig } from '../config';

export interface HttpsResponse {
  statusCode: number;
  body: string;
}

const REQUEST_TIMEOUT_MS = 30_000;

interface HttpsRequestOptions {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

let cachedPfx: Buffer | null = null;

function loadCertificate(): { pfx: Buffer; passphrase: string | undefined } | null {
  if (!businessRegisterConfig.certificatePath) return null;

  if (!cachedPfx) {
    cachedPfx = fs.readFileSync(businessRegisterConfig.certificatePath);
  }

  return {
    pfx: cachedPfx,
    passphrase: businessRegisterConfig.certificatePassword,
  };
}

export interface HttpsBinaryResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

export function httpsRequestWithCertBinary(options: HttpsRequestOptions): Promise<HttpsBinaryResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const cert = loadCertificate();

    const requestOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method,
      headers: { ...options.headers },
      rejectUnauthorized: true,
    };

    if (cert) {
      requestOptions.pfx = cert.pfx;
      requestOptions.passphrase = cert.passphrase;
    }

    const req = https.request(requestOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => { chunks.push(chunk); });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (e) => {
      reject(new Error(`HTTPS request failed: ${e.message}`));
    });

    req.end();
  });
}

export interface HttpsStreamResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: ReadableStream<Uint8Array>;
}

export function httpsRequestWithCertStream(options: HttpsRequestOptions): Promise<HttpsStreamResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const cert = loadCertificate();

    const requestOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method,
      headers: { ...options.headers },
      rejectUnauthorized: true,
    };

    if (cert) {
      requestOptions.pfx = cert.pfx;
      requestOptions.passphrase = cert.passphrase;
    }

    const req = https.request(requestOptions, (res) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          res.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          res.on('end', () => {
            controller.close();
          });
          res.on('error', (err) => {
            controller.error(err);
          });
        },
        cancel() {
          res.destroy();
        },
      });

      resolve({
        statusCode: res.statusCode || 0,
        headers: res.headers as Record<string, string | string[] | undefined>,
        body,
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (e) => {
      reject(new Error(`HTTPS request failed: ${e.message}`));
    });

    req.end();
  });
}

export function httpsRequestWithCert(options: HttpsRequestOptions): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const cert = loadCertificate();

    const requestOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method,
      headers: {
        ...options.headers,
      },
      rejectUnauthorized: true,
    };

    if (cert) {
      requestOptions.pfx = cert.pfx;
      requestOptions.passphrase = cert.passphrase;
    }

    if (options.body) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Length': String(Buffer.byteLength(options.body)),
      };
    }

    const req = https.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, body });
      });
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request to ${url.hostname}${url.pathname} timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on('error', (e) => {
      reject(new Error(`HTTPS request to ${url.hostname}${url.pathname} failed: ${e.message}`));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
