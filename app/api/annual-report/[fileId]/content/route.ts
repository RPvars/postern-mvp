import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '@/lib/business-register/client/auth';
import { httpsRequestWithCertStream } from '@/lib/business-register/client/https-util';
import { businessRegisterConfig } from '@/lib/business-register/config';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { APP_CONFIG } from '@/lib/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const identifier = getClientIdentifier(_request);
  const rateLimitResult = rateLimit(
    `annual-report-download:${identifier}`,
    APP_CONFIG.rateLimit.endpoints.annualReportDownload.maxRequests,
    APP_CONFIG.rateLimit.endpoints.annualReportDownload.windowMs
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  const { fileId } = await params;

  if (!/^\d+$/.test(fileId)) {
    return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 });
  }

  try {
    const token = await authClient.getAccessToken();
    const url = `${businessRegisterConfig.apiGatewayUrl}/annualreport/annual-report/${fileId}/content`;

    const response = await httpsRequestWithCertStream({
      url,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': '*/*',
      },
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      await response.body.cancel();
      const status = response.statusCode === 404 ? 404 : 502;
      return NextResponse.json(
        { error: 'Failed to download document' },
        { status }
      );
    }

    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
    const contentDisposition = response.headers['content-disposition'] as string | undefined;
    const contentLength = response.headers['content-length'] as string | undefined;

    const isPreview = _request.nextUrl.searchParams.get('preview') === 'true';

    const headers: Record<string, string> = {
      // BR API often serves PDFs as application/octet-stream which browsers
      // refuse to render inline. Trust the client's preview signal — the eye
      // button is only shown for PDF reports.
      'Content-Type': isPreview ? 'application/pdf' : contentType,
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    if (isPreview) {
      headers['Content-Disposition'] = 'inline';
    } else if (contentDisposition) {
      headers['Content-Disposition'] = contentDisposition;
    } else {
      headers['Content-Disposition'] = `attachment; filename="annual-report-${fileId}"`;
    }

    return new NextResponse(response.body, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
}
