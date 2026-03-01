const fs = require('fs');
const path = require('path');

const getPrivateKey = () => {
  // Try base64 encoded environment variable first
  if (process.env.JWT_PRIVATE_KEY_BASE64) {
    return Buffer.from(process.env.JWT_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  }
  
  // Try direct environment variable
  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY;
  }
  
  // Try file path
  const keyPath = process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '../../keys/private.pem');
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  
  // Fallback for development
  return 'dev-secret-key';
};

const getPublicKey = () => {
  // Try base64 encoded environment variable first
  if (process.env.JWT_PUBLIC_KEY_BASE64) {
    return Buffer.from(process.env.JWT_PUBLIC_KEY_BASE64, 'base64').toString('utf8');
  }
  
  // Try direct environment variable
  if (process.env.JWT_PUBLIC_KEY) {
    return process.env.JWT_PUBLIC_KEY;
  }
  
  // Try file path
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../keys/public.pem');
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  
  // Fallback for development
  return 'dev-secret-key';
};

// Determine if we're using RSA or HMAC based on key availability
const privateKey = getPrivateKey();
const publicKey = getPublicKey();
const isRSA = privateKey.includes('BEGIN') && publicKey.includes('BEGIN');

module.exports = {
  privateKey: privateKey,
  publicKey: publicKey,
  accessTokenExpiry: process.env.JWT_EXPIRY_ACCESS || '15m',
  refreshTokenExpiry: process.env.JWT_EXPIRY_REFRESH || '7d',
  algorithm: isRSA ? 'RS256' : 'HS256',
  issuer: 'cafeteria-identity-provider',
};
