import crypto from 'crypto';

/**
 * Utility for encrypting and decrypting sensitive health information
 * Uses AES-256-CBC for strong encryption
 */
export class EncryptionService {
  private algorithm = 'aes-256-cbc';
  private encryptionKey: Buffer;
  
  constructor(secretKey: string) {
    // Derive a key from the provided secret
    // In production, this key should be securely stored in environment variables
    this.encryptionKey = crypto.scryptSync(secretKey, 'salt', 32); // 32 bytes = 256 bits
  }
  
  /**
   * Encrypt sensitive data
   * @param data Data to encrypt (object or string)
   * @returns Encrypted data as a string
   */
  encrypt(data: any): string {
    // Convert data to string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Generate initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    // Encrypt data
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV + Encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt encrypted data
   * @param encryptedData Encrypted data string
   * @returns Decrypted data
   */
  decrypt(encryptedData: string): any {
    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    
    // Decrypt data
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse as JSON if it's an object
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      // Return as string if not valid JSON
      return decrypted;
    }
  }
  
  /**
   * Generate a secure random token
   * Useful for authentication and session management
   * @param length Length of the token in bytes
   * @returns Secure random token as hex string
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Hash a password securely
   * @param password Password to hash
   * @returns Hashed password
   */
  hashPassword(password: string): string {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password with the salt
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    
    // Return salt + hash
    return `${salt}:${hash}`;
  }
  
  /**
   * Verify a password against a hash
   * @param password Password to verify
   * @param storedHash Stored hash from hashPassword
   * @returns True if password matches
   */
  verifyPassword(password: string, storedHash: string): boolean {
    // Split the stored hash into salt and hash
    const [salt, hash] = storedHash.split(':');
    
    // Hash the provided password with the same salt
    const newHash = crypto.scryptSync(password, salt, 64).toString('hex');
    
    // Compare the hashes
    return hash === newHash;
  }
  
  /**
   * Generate a cryptographically secure request ID
   * @returns Secure request ID
   */
  generateRequestId(): string {
    return crypto.randomUUID();
  }
  
  /**
   * Anonymize sensitive data by creating a deterministic hash
   * Useful for analytics while maintaining privacy
   * @param data Data to anonymize
   * @param salt Salt to use for hashing
   * @returns Anonymized data
   */
  anonymize(data: string, salt: string): string {
    return crypto.createHmac('sha256', salt)
      .update(data)
      .digest('hex');
  }
  
  /**
   * Securely wipe sensitive data from memory
   * @param data Buffer containing sensitive data
   */
  secureWipe(data: Buffer): void {
    crypto.randomFillSync(data, 0, data.length);
  }
}

// Create encryption service instance with a secret key
// In production, get this from a secure environment variable
const SECRET_KEY = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';
export const encryptionService = new EncryptionService(SECRET_KEY);