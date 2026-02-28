#!/bin/bash

# Script to generate RSA key pair for JWT signing

set -e

KEYS_DIR="./secrets"

echo "Generating JWT RSA key pair..."

# Create secrets directory if it doesn't exist
mkdir -p "$KEYS_DIR"

# Generate private key (2048 bits)
openssl genrsa -out "$KEYS_DIR/jwt_private_key.pem" 2048

# Generate public key from private key
openssl rsa -in "$KEYS_DIR/jwt_private_key.pem" -pubout -out "$KEYS_DIR/jwt_public_key.pem"

# Set appropriate permissions
chmod 600 "$KEYS_DIR/jwt_private_key.pem"
chmod 644 "$KEYS_DIR/jwt_public_key.pem"

echo "✅ JWT keys generated successfully!"
echo "   Private key: $KEYS_DIR/jwt_private_key.pem"
echo "   Public key: $KEYS_DIR/jwt_public_key.pem"
echo ""
echo "⚠️  Keep the private key secure and never commit it to version control!"
