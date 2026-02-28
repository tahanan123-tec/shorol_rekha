#!/bin/bash

# Install Dependencies Script
# This script installs all dependencies for the cafeteria system

echo "=========================================="
echo "Installing Cafeteria System Dependencies"
echo "=========================================="
echo ""

# Function to install dependencies
install_deps() {
    local dir=$1
    local name=$2
    
    echo "📦 Installing dependencies for $name..."
    cd "$dir"
    
    if [ -f "package.json" ]; then
        npm install
        if [ $? -eq 0 ]; then
            echo "✅ $name dependencies installed successfully"
        else
            echo "❌ Failed to install $name dependencies"
            exit 1
        fi
    else
        echo "⚠️  No package.json found in $dir"
    fi
    
    cd - > /dev/null
    echo ""
}

# Install backend services
echo "🔧 Installing Backend Services..."
echo ""

install_deps "services/identity-provider" "Identity Provider"
install_deps "services/order-gateway" "Order Gateway"
install_deps "services/stock-service" "Stock Service"
install_deps "services/kitchen-queue" "Kitchen Queue"
install_deps "services/notification-hub" "Notification Hub"
install_deps "services/chaos-monkey" "Chaos Monkey"
install_deps "services/predictive-scaler" "Predictive Scaler"

# Install frontend applications
echo "🎨 Installing Frontend Applications..."
echo ""

install_deps "admin-dashboard" "Admin Dashboard"
install_deps "client" "Client Application"

echo "=========================================="
echo "✅ All dependencies installed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Reload VS Code: Ctrl+Shift+P -> 'Developer: Reload Window'"
echo "2. Or restart TypeScript: Ctrl+Shift+P -> 'TypeScript: Restart TS Server'"
echo ""
echo "To start the system:"
echo "  docker-compose up -d"
echo ""
