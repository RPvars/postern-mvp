import { prisma } from './prisma';
import { env } from './env';

/**
 * Cleanup expired verification tokens and password reset tokens
 * Prevents unbounded growth of the VerificationToken table
 */
export async function cleanupExpiredTokens() {
  try {
    const deleted = await prisma.verificationToken.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    if (env.NODE_ENV === 'development') {
      console.log(`[Cleanup] Deleted ${deleted.count} expired tokens`);
    }

    return { success: true, count: deleted.count };
  } catch (error) {
    console.error('[Cleanup] Failed to delete expired tokens:', error);
    return { success: false, count: 0, error };
  }
}

/**
 * Cleanup expired sessions
 * Note: NextAuth.js with database adapter handles this automatically,
 * but this function provides manual cleanup if needed
 */
export async function cleanupExpiredSessions() {
  try {
    const deleted = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    if (env.NODE_ENV === 'development') {
      console.log(`[Cleanup] Deleted ${deleted.count} expired sessions`);
    }

    return { success: true, count: deleted.count };
  } catch (error) {
    console.error('[Cleanup] Failed to delete expired sessions:', error);
    return { success: false, count: 0, error };
  }
}

/**
 * Run all cleanup tasks
 */
export async function runCleanupTasks() {
  console.log('[Cleanup] Starting cleanup tasks...');

  const [tokensResult, sessionsResult] = await Promise.all([
    cleanupExpiredTokens(),
    cleanupExpiredSessions(),
  ]);

  console.log('[Cleanup] Cleanup tasks completed', {
    tokens: tokensResult.count,
    sessions: sessionsResult.count,
  });

  return {
    tokens: tokensResult,
    sessions: sessionsResult,
  };
}
