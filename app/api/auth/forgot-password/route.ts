import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { generatePasswordResetToken, getTokenExpiry } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { authRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = authRateLimiter.forgotPassword(clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validated = forgotPasswordSchema.safeParse(body);
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
    if (!user) {
      return NextResponse.json(
        { message: 'If an account exists, a password reset email has been sent.' },
        { status: 200 }
      );
    }

    // Delete existing password reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: normalizedEmail,
        type: 'PASSWORD_RESET',
      },
    });

    // Create password reset token
    const token = generatePasswordResetToken();
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires: getTokenExpiry('PASSWORD_RESET'),
        type: 'PASSWORD_RESET',
      },
    });

    // Send password reset email
    await sendPasswordResetEmail(normalizedEmail, token);

    return NextResponse.json(
      { message: 'If an account exists, a password reset email has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
