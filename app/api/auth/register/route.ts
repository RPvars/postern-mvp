import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validations/auth';
import { hashPassword } from '@/lib/auth/password';
import { generateVerificationToken, getTokenExpiry } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { authRateLimiter, getClientIdentifier } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = authRateLimiter.register(clientId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input
    const validated = registerSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = validated.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    // Create verification token
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
    const emailResult = await sendVerificationEmail(normalizedEmail, token);

    if (!emailResult.success) {
      // Account created but email failed - user can resend later
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json(
        {
          message: 'Account created but verification email could not be sent. Please try resending from the login page.',
          userId: user.id,
          emailFailed: true,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
