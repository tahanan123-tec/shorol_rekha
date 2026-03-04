# 🍽️ IUT Cafeteria Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Microservices](https://img.shields.io/badge/Architecture-Microservices-green.svg)](https://microservices.io/)

A production-ready, scalable microservices-based food ordering system built for Islamic University of Technology (IUT) cafeteria operations.

## ✨ Features

### 🎯 Core Functionality
- **Real-time Order Management** - Live order tracking with WebSocket notifications
- **Multi-item Cart System** - Add multiple items with proper quantity management
- **Stock Management** - Real-time inventory tracking with optimistic locking
- **Admin Dashboard** - Comprehensive management interface with metrics
- **User Authentication** - Secure JWT-based authentication with rate limiting

### 🔒 Security & Reliability
- **Compensating Transactions** - Automatic stock rollback on order failures
- **Circuit Breakers** - Fault tolerance with automatic recovery
- **Rate Limiting** - Protection against abuse and DDoS
- **WAF Integration** - Web Application Firewall for security
- **Idempotency** - Safe retry mechanisms for all operations

### 📊 Monitoring & Observability
- **Prometheus Metrics** - Comprehensive system metrics
- **Grafana Dashboards** - Real-time visualization
- **Distributed Tracing** - Jaeger integration for request tracking
- **Structured Logging** - Centralized log management

### 🎨 User Experience
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Dark/Light Theme** - Ramadan-themed black & gold design
- **Real-time Updates** - Live order status notifications
- **Optimistic UI** - Fast, responsive user interactions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         NGINX (Load Balancer)                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌──────▼──────┐
│  Client App    │   │ Admin Dashboard │   │   API GW    │
│  (Next.js)     │   │   (Next.js)     │   │             │
└────────────────┘   └─────────────────┘   └──────┬──────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────┐
                     │                             │                 │
            ┌────────▼────────┐         ┌─────────▼────────┐  ┌─────▼──────┐
            │ Identity Provider│         │  Order Gateway   │  │Stock Service│
            │   (Auth & JWT)   │         │ (Order Logic)    │  │(Inventory)  │
            └──────────────────┘         └──────────────────┘  └─────────────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────┐
                     │                             │                 │
            ┌────────▼────────┐         ┌─────────▼────────┐  ┌─────▼──────┐
            │ Kitchen Queue   │         │ Notification Hub │  │   Redis    │
            │  (Processing)   │         │   (WebSocket)    │  │  (Cache)   │
            └──────────────────┘         └──────────────────┘  └────────────┘
                     │
            ┌────────▼────────┐
            │   RabbitMQ      │
            │ (Message Queue) │
            └──────────────────┘
                     │
            ┌────────▼────────┐
            │   PostgreSQL    │
            │   (Database)    │
            └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/iut-cafeteria-system.git
cd iut-cafeteria-system
```

### 2. Setup Environment
```bash
# Copy environment files
cp .env.example .env
cp client/.env.example client/.env.local
cp admin-dashboard/.env.example admin-dashboard/.env.local

# Generate JWT keys (optional - defaults provided)
./scripts/deployment/setup-env-files.ps1
```

### 3. Start the System
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Applications
- **Client App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3100
- **Grafana**: http://localhost:3200 (admin/admin)
- **Prometheus**: http://localhost:9090
- **RabbitMQ**: http://localhost:15672 (admin/admin)

## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| Client | 3000 | Student-facing web application |
| Admin Dashboard | 3100 | Management interface |
| Identity Provider | 3001 | Authentication & authorization |
| Order Gateway | 3002 | Order processing & orchestration |
| Stock Service | 3003 | Inventory management |
| Kitchen Queue | 3004 | Order preparation workflow |
| Notification Hub | 3005 | Real-time notifications |
| Chaos Monkey | 3006 | Chaos engineering testing |
| NGINX | 80/443 | Reverse proxy & load balancer |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Caching layer |
| RabbitMQ | 5672/15672 | Message broker |
| Prometheus | 9090 | Metrics collection |
| Grafana | 3200 | Metrics visualization |
| Jaeger | 16686 | Distributed tracing |

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies for all services
npm run install:all

# Start individual service
cd services/order-gateway
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Testing
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Load tests
npm run test:load

# Test multi-item orders
./scripts/testing/test-multi-item-orders.ps1
```

## 📚 Documentation

- [Architecture Overview](docs/architecture/ARCHITECTURE.md)
- [Deployment Guide](docs/deployment/QUICK_DEPLOY.md)
- [API Documentation](docs/api/README.md)
- [Security Implementation](docs/security/IMPLEMENTATION.md)
- [Troubleshooting Guide](docs/troubleshooting/TROUBLESHOOTING.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## 🔧 Configuration

### Environment Variables
Key environment variables for each service:

**Order Gateway**
```env
PORT=3002
DATABASE_URL=postgresql://orders_user:orders_pass@postgres:5432/orders_db
REDIS_URL=redis://redis:6379/1
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
INTERNAL_API_KEY=your-secret-key
```

**Stock Service**
```env
PORT=3003
DATABASE_URL=postgresql://inventory_user:inventory_pass@postgres:5432/inventory_db
INTERNAL_API_KEY=your-secret-key
```

See [.env.example](.env.example) for complete configuration.

## 🎯 Key Features Implementation

### Compensating Transactions
Automatic rollback of stock reservations when order creation fails:
```javascript
// If order fails after stock reservation
if (stockReserved) {
  await stockService.releaseStock(orderId, items);
}
```

### Circuit Breaker Pattern
Prevents cascading failures with automatic recovery:
```javascript
const circuitBreaker = new CircuitBreaker(stockService, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});
```

### Optimistic Locking
Prevents race conditions in high-concurrency scenarios:
```sql
UPDATE inventory 
SET reserved_quantity = reserved_quantity + $1,
    version = version + 1
WHERE item_id = $2 AND version = $3
```

## 📊 Monitoring

### Metrics
Access Prometheus metrics at `/metrics` endpoint for each service:
- Request rates and latencies
- Error rates
- Circuit breaker states
- Stock levels
- Order processing times

### Dashboards
Pre-configured Grafana dashboards:
- System Overview
- Service Details
- Order Analytics
- Stock Management

## 🔐 Security

- **Authentication**: JWT with RS256 signing
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Per-user and global limits
- **WAF**: SQL injection and XSS protection
- **HTTPS**: TLS 1.3 support
- **Secrets Management**: Docker secrets integration

## 🚢 Deployment

### Docker Compose (Development)
```bash
docker-compose up -d
```

### Docker Compose (Production)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
# Apply configurations
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n cafeteria
```

See [Deployment Guide](docs/deployment/CLOUD_DEPLOYMENT.md) for cloud deployment instructions.

## 🧪 Testing

### Manual Testing
```bash
# Test order creation
./test-order-simple.ps1

# Test multi-item orders
./scripts/testing/test-multi-item-orders.ps1
```

### Automated Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- services/order-gateway
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project Lead**: [Your Name]
- **Backend Team**: [Team Members]
- **Frontend Team**: [Team Members]
- **DevOps Team**: [Team Members]

## 🙏 Acknowledgments

- Islamic University of Technology (IUT)
- All contributors and testers
- Open source community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/iut-cafeteria-system/issues)
- **Email**: support@example.com
- **Documentation**: [Wiki](https://github.com/yourusername/iut-cafeteria-system/wiki)

---

Made with ❤️ for IUT Cafeteria
