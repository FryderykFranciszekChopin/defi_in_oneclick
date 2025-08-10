/**
 * Security utilities for OneClick DeFi
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextRequest } from 'next/server';

/**
 * Verify user is authenticated
 */
export async function requireAuth(request?: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }
  
  return session;
}

/**
 * Verify user owns the smart account
 */
export async function verifyAccountOwnership(userEmail: string, accountAddress: string) {
  // In production, verify from database
  const session = await getServerSession(authOptions);
  
  if (session?.user?.email !== userEmail) {
    throw new Error('Account ownership verification failed');
  }
  
  return true;
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  // Remove any potential script tags or malicious content
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Rate limiting check (implement with Redis in production)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || record.resetTime < now) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}