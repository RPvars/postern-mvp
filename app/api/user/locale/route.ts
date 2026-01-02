import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';

// GET /api/user/locale - Get user's locale preference
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true },
    });

    return NextResponse.json({ locale: user?.locale || 'lv' });
  } catch (error) {
    console.error('Error fetching user locale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/user/locale - Update user's locale preference
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { locale } = body;

    // Validate locale
    if (!locale || !SUPPORTED_LOCALES.includes(locale as Locale)) {
      return NextResponse.json(
        { error: 'Invalid locale. Supported: ' + SUPPORTED_LOCALES.join(', ') },
        { status: 400 }
      );
    }

    // Update user's locale preference
    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale },
    });

    return NextResponse.json({ success: true, locale });
  } catch (error) {
    console.error('Error updating user locale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
