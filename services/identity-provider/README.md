# Identity Provider Microservice

Secure authentication service for the university cafeteria ordering system with JWT token generation, validation, and rate limiting.

## Features

- ✅ Student login using ID and password
- ✅ JWT token generation (RS256 asymmetric encryption)
- ✅ Token validation endpoint
- ✅ Rate limiting: max 3 login attempts per minute per student ID
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Refresh tokens with revocation support
- ✅ Health and readiness checks
- ✅ Prometheus metrics
- ✅ Clean architecture structure
- ✅ Comprehensive unit and integration tests

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Joi
- **Logging**: Winston
- **Metrics**: Prometheus (prom-client)
- **Testing**: Jest + Supertest

## API Endpoints

### Authentication

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "student_id": "STU12345",
  "email": "student@university.edu",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "student_id": "STU12345",
    "email": "student@university.edu",
    "full_name": "John Doe",
    "created_at": "2026-02-23T10:00:00Z"
  }
}
```

#### POST /auth/login
Login and receive tokens. Rate limited to 3 attempts per minute per student ID.

**Request:**
```json
{
  "student_id": "STU12345",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "user_id": 1,
      "student_id": "STU12345",
      "email": "student@university.edu",
      "full_name": "John Doe"
    }
  }
}
```

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again later.",
  "retry_after": 45
}
```

#### GET /auth/validate
Validate an access token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "user": {
      "user_id": 1,
      "student_id": "STU12345",
      "email": "student@university.edu"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

#### POST /auth/logout
Revoke refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /auth/me
Get current user information from token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "student_id": "STU12345",
    "email": "student@university.edu"
  }
}
```

### Health & Monitoring

#### GET /health
Basic health check.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "identity-provider",
  "timestamp": "2026-02-23T10:00:00Z"
}
```

#### GET /ready
Readiness check with dependency status.

**Response (200):**
```json
{
  "ready": true,
  "service": "identity-provider",
  "dependencies": {
    "database": "connected",
    "redis": "connected"
  },
  "timestamp": "2026-02-23T10:00:00Z"
}
```

#### GET /metrics
Prometheus metrics in text format.

**Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `login_attempts_total` - Login attempts counter
- `rate_limit_hits_total` - Rate limit hits counter
- `active_tokens_gauge` - Active tokens gauge
- `token_generation_duration_seconds` - Token generation duration

## Architecture

```
src/
├── config/           # Configuration files
│   ├── database.js   # PostgreSQL connection
│   ├── redis.js      # Redis connection
│   └── jwt.js        # JWT configuration
├── controllers/      # Request handlers
│   └── auth.controller.js
├── middleware/       # Express middleware
│   ├── rateLimiter.js
│   ├── validator.js
│   └── errorHandler.js
├── models/           # Database models (via SQL)
├── routes/           # Route definitions
│   ├── auth.routes.js
│   └── health.routes.js
├── services/         # Business logic
│   ├── auth.service.js
│   ├── jwt.service.js
│   └── password.service.js
├── utils/            # Utilities
│   ├── logger.js
│   └── metrics.js
└── index.js          # Application entry point
```

## Security Features

1. **Password Security**
   - bcrypt hashing with 12 salt rounds
   - Minimum 8 characters
   - Must contain uppercase, lowercase, number, and special character

2. **JWT Security**
   - RS256 asymmetric encryption
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Token revocation support

3. **Rate Limiting**
   - Login: 3 attempts per minute per student ID
   - API: 100 requests per minute per IP
   - Redis-based distributed rate limiting

4. **Input Validation**
   - Joi schema validation
   - SQL injection prevention (parameterized queries)
   - XSS protection

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate JWT keys
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

# Start service
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Docker

```bash
# Build image
docker build -t identity-provider .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  identity-provider
```

## Performance

- Token generation: < 50ms (p95)
- Token validation: < 10ms (p95)
- Login endpoint: < 200ms (p95)
- Rate limiting overhead: < 5ms

## Monitoring

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Login success rate
rate(login_attempts_total{status="success"}[5m]) / rate(login_attempts_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Troubleshooting

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
psql postgresql://identity_user:identity_pass@localhost:5432/identity_db
```

### Redis connection issues
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -h localhost -p 6379 ping
```

### Rate limiting not working
- Verify Redis is connected
- Check Redis keys: `redis-cli KEYS "rate_limit:*"`
- Review logs for rate limiter errors

## License

MIT
