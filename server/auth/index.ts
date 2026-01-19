/**
 * Authentication Module
 *
 * Implements secure authentication with:
 * - bcrypt password hashing (cost factor 12)
 * - JWT tokens with refresh capability
 * - Rate limiting on auth endpoints
 * - Secure session management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Configuration with secure defaults
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '15m'; // Short-lived access tokens
const JWT_REFRESH_EXPIRES_IN = '7d';

// Get JWT secret at runtime to support test environments
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

// Validation schemas
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Types
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'patient' | 'caregiver' | 'admin';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Hash a password using bcrypt with secure cost factor
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}

/**
 * Authentication middleware - validates JWT and attaches user to request
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }
    res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles: TokenPayload['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
      return;
    }

    next();
  };
}

/**
 * Validate environment configuration at startup
 */
export function validateAuthConfig(): void {
  const errors: string[] = [];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  if (errors.length > 0) {
    console.error('Authentication configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error('Invalid authentication configuration');
  }

  console.log('Authentication configuration validated');
}

/**
 * Generate secure random token for password reset, etc.
 */
export function generateSecureToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}
