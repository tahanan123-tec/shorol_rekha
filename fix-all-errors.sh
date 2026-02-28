#!/bin/bash
# Comprehensive Error Fix Script for Cafeteria System
# This script installs all dependencies and fixes common issues

set -e

echo "========================================"
echo "Cafeteria System - Error Fix Script"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if npm is installed
echo -e "${YELLOW}Checking for npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm version $NPM_VERSION found${NC}"
else
    echo -e "${RED}✗ npm not found. Please install Node.js first.${NC}"
    exit 1
fi

# Function to install dependencies
install_dependencies() {
    local path=$1
    local name=$2
    
    echo ""
    echo -e "${YELLOW}Installing dependencies for $name...${NC}"
    
    if [ -f "$path/package.json" ]; then
        cd "$path"
        if npm install; then
            echo -e "${GREEN}✓ $name dependencies installed successfully${NC}"
        else
            echo -e "${RED}✗ Failed to install $name dependencies${NC}"
        fi
        cd - > /dev/null
    else
        echo -e "${RED}✗ No package.json found in $path${NC}"
    fi
}

# Install Frontend Dependencies
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Installing Frontend Dependencies${NC}"
echo -e "${CYAN}========================================${NC}"

install_dependencies "client" "Client App"
install_dependencies "admin-dashboard" "Admin Dashboard"

# Install Service Dependencies
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Installing Service Dependencies${NC}"
echo -e "${CYAN}========================================${NC}"

services=(
    "identity-provider"
    "order-gateway"
    "kitchen-queue"
    "stock-service"
    "notification-hub"
    "chaos-monkey"
    "predictive-scaler"
)

for service in "${services[@]}"; do
    install_dependencies "services/$service" "$service"
done

# Type check frontends
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Running Type Checks${NC}"
echo -e "${CYAN}========================================${NC}"

echo ""
echo -e "${YELLOW}Type checking Client...${NC}"
cd client
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Client type check passed${NC}"
else
    echo -e "${YELLOW}⚠ Client has type errors (check with 'npm run type-check' in client/)${NC}"
fi
cd ..

echo ""
echo -e "${YELLOW}Type checking Admin Dashboard...${NC}"
cd admin-dashboard
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Admin Dashboard type check passed${NC}"
else
    echo -e "${YELLOW}⚠ Admin Dashboard has type errors (check with 'npm run type-check' in admin-dashboard/)${NC}"
fi
cd ..

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${NC}1. Copy .env.example to .env in root directory${NC}"
echo -e "${NC}2. Copy .env.example to .env in each service directory${NC}"
echo -e "${NC}3. Run 'docker-compose up -d' to start infrastructure${NC}"
echo -e "${NC}4. Run services individually or use the start scripts${NC}"
echo ""
