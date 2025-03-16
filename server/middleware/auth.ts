import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../utils/encryption';

/**
 * Extended Request interface that includes user information
 * This is set by the authentication middleware
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

// Store rate limiting information
const apiRateLimits = new Map<string, { count: number, resetTime: number }>();

/**
 * Middleware to check if user is authenticated
 * This will be used for all protected routes
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  // In a real app, this would verify a JWT token or session cookie
  // For now, we'll look for a session in the request
  const session = req.session as any;
  
  if (session && session.userId) {
    // Add user info to request object for use in route handlers
    (req as AuthenticatedRequest).user = {
      id: session.userId,
      username: session.username || 'user',
      role: session.role || 'user'
    };
    return next();
  }

  // For development, allow requests to proceed without authentication
  // In production, uncomment this to enforce authentication
  // return res.status(401).json({ error: 'Authentication required' });
  
  // Allow request to proceed without authentication for now
  next();
};

/**
 * Middleware to check if user has admin role
 * This will be used for admin-only routes
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  
  if (authReq.user && authReq.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ error: 'Insufficient permissions' });
};

/**
 * Middleware to track API usage and implement rate limiting
 * This helps prevent abuse and ensures fair usage
 */
export const apiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // Max 100 requests per minute
  
  // Get current rate limit info for this IP
  const rateInfo = apiRateLimits.get(clientIp) || { count: 0, resetTime: now + windowMs };
  
  // Reset if the window has expired
  if (now > rateInfo.resetTime) {
    rateInfo.count = 1;
    rateInfo.resetTime = now + windowMs;
  } else {
    rateInfo.count += 1;
  }
  
  // Update rate limit info
  apiRateLimits.set(clientIp, rateInfo);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateInfo.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateInfo.resetTime / 1000).toString());
  
  // Check if rate limit exceeded
  if (rateInfo.count > maxRequests) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later'
    });
  }
  
  next();
};

/**
 * Middleware to log all requests for security auditing
 * Critical for healthcare applications to maintain access logs
 */
export const securityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = encryptionService.generateRequestId();
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const userId = (req as AuthenticatedRequest).user?.id || 'unauthenticated';
  
  // Log request details
  // In production, this would write to a secure audit log
  console.log(`[${timestamp}] [${requestId}] ${method} ${url} - User: ${userId}, IP: ${ip}`);
  
  // Add requestId to response headers for tracking
  res.setHeader('X-Request-ID', requestId);
  
  // Add response logging
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    // Log the response status
    console.log(`[${timestamp}] [${requestId}] Response: ${res.statusCode}`);
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
};