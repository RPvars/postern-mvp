import { NextRequest, NextResponse } from 'next/server';
import { runCleanupTasks } from '@/lib/cleanup';
import { env } from '@/lib/env';

/**
 * Cron endpoint for scheduled cleanup tasks
 *
 * For Vercel Cron Jobs, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * For manual execution during development, call:
 * curl http://localhost:3000/api/cron/cleanup
 */
export async function GET(request: NextRequest) {
  // Verify the request is authorized
  // Option 1: Check for Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const results = await runCleanupTasks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('[Cron] Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
