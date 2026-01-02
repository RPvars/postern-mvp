import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateVerificationToken, getTokenExpiry } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { authRateLimiter, getClientIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = authRateLimiter.resendVerification(clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validated = resendSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validated.data;
    const normalizedEmail = email.toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json(
        { message: 'If an account exists and is not verified, a verification email has been sent.' },
        { status: 200 }
      );
    }

    // Delete existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        type: 'EMAIL_VERIFICATION',
      },
    });

    // Create new verification token
    const token = generateVerificationToken();
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires: getTokenExpiry('EMAIL_VERIFICATION'),
        type: 'EMAIL_VERIFICATION',
      },
    });

    // Send verification email
    await sendVerificationEmail(normalizedEmail, token);

    return NextResponse.json(
      { message: 'If an account exists and is not verified, a verification email has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending verification email' },
      { status: 500 }
    );
  }
}
