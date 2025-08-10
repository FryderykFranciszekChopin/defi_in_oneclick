import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { isValidAddress, checkRateLimit } from '@/lib/security';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { smartAccountAddress, publicKey, accountIndex } = await request.json();
    
    // Validate input
    if (!isValidAddress(smartAccountAddress)) {
      return NextResponse.json(
        { error: 'Invalid smart account address' },
        { status: 400 }
      );
    }
    
    // Rate limiting
    if (!checkRateLimit(`update-account:${session.user.id}`)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Update user with smart account data
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        smartAccountAddress,
        publicKey,
        accountIndex: accountIndex || 0,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        smartAccountAddress: updatedUser.smartAccountAddress,
      },
    });
  } catch (error) {
    console.error('Failed to update smart account:', error);
    return NextResponse.json(
      { error: 'Failed to update smart account' },
      { status: 500 }
    );
  }
}