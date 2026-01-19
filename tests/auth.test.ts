/**
 * Authentication Module Tests
 *
 * Tests for:
 * - Password hashing and verification
 * - JWT token generation and validation
 * - Auth middleware behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyToken,
  RegisterSchema,
  LoginSchema,
} from '../server/auth';

// JWT_SECRET is set in vitest.config.ts env option

describe('Authentication Module', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true); // bcrypt prefix
    });

    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('wrongpassword', hash);

      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('JWT Tokens', () => {
    const testPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'patient' as const,
    };

    it('should generate a valid access token', () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should verify and decode a valid token', () => {
      const token = generateAccessToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    it('should throw error for tampered token', () => {
      const token = generateAccessToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyToken(tamperedToken)).toThrow();
    });
  });

  describe('Validation Schemas', () => {
    describe('RegisterSchema', () => {
      it('should accept valid registration data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          name: 'Test User',
        };

        const result = RegisterSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject weak password', () => {
        const weakPasswordData = {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        };

        const result = RegisterSchema.safeParse(weakPasswordData);
        expect(result.success).toBe(false);
      });

      it('should reject invalid email', () => {
        const invalidEmailData = {
          email: 'not-an-email',
          password: 'SecurePass123!',
          name: 'Test User',
        };

        const result = RegisterSchema.safeParse(invalidEmailData);
        expect(result.success).toBe(false);
      });

      it('should require uppercase, lowercase, number, and special char', () => {
        const noUppercase = RegisterSchema.safeParse({
          email: 'test@example.com',
          password: 'securepass123!',
          name: 'Test',
        });
        expect(noUppercase.success).toBe(false);

        const noLowercase = RegisterSchema.safeParse({
          email: 'test@example.com',
          password: 'SECUREPASS123!',
          name: 'Test',
        });
        expect(noLowercase.success).toBe(false);

        const noNumber = RegisterSchema.safeParse({
          email: 'test@example.com',
          password: 'SecurePass!',
          name: 'Test',
        });
        expect(noNumber.success).toBe(false);

        const noSpecial = RegisterSchema.safeParse({
          email: 'test@example.com',
          password: 'SecurePass123',
          name: 'Test',
        });
        expect(noSpecial.success).toBe(false);
      });
    });

    describe('LoginSchema', () => {
      it('should accept valid login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'anypassword',
        };

        const result = LoginSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('should reject empty password', () => {
        const emptyPassword = {
          email: 'test@example.com',
          password: '',
        };

        const result = LoginSchema.safeParse(emptyPassword);
        expect(result.success).toBe(false);
      });
    });
  });
});
