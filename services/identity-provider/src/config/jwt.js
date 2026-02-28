const fs = require('fs');
const path = require('path');

const getPrivateKey = () => {
  const keyPath = process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '../../keys/private.pem');
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  
  // Fallback to environment variable for development
  return process.env.JWT_PRIVATE_KEY || 'dev-secret-key';
};

const getPublicKey = () => {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../keys/public.pem');
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  
  // Fallback to environment variable for development
  return process.env.JWT_PUBLIC_KEY || 'dev-secret-key';
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
