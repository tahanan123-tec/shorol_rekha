# Security Quick Reference

## 🚀 Quick Start

```bash
# Start the system with all security layers
docker-compose up -d

# Check security is active
curl -I http://localhost/api/order | grep -E "(X-Frame|X-Content|Strict-Transport)"
```

---

## 🔒 Security Layers

| Layer | Location | Status |
|-------|----------|--------|
| NGINX WAF | `infrastructure/nginx/nginx.conf` | ✅ Active |
| App WAF | `services/order-gateway/src/middleware/waf.middleware.js` | ✅ Active |
| Login Rate Limit | `services/identity-provider/src/middleware/advancedRateLimiter.js` | ✅ Active |
| Order Rate Limit | `services/order-gateway/src/middleware/rateLimiter.js` | ✅ Active |
| JWT Auth | `services/identity-provider/src/services/jwt.service.js` | ✅ Active |
| Service Auth | `services/order-gateway/src/middleware/serviceAuth.middleware.js` | ✅ Ready |

---

## 📊 Rate Limits

### Login Endpoint (`/auth/login`)
- **Per Student ID**: 3 attempts/minute
- **Per IP**: 10 attempts/minute
- **Account Lock**: After 5 failed attempts (10 min lock)

### Order Endpoint (`/api/order`)
- **Per Student ID**: 10 orders/minute
- **Per IP**: 50 orders/minute

### Global (NGINX)
- **All Endpoints**: 100 requests/second
- **Burst**: 20 requests (nodelay)

---

## 🛡️ WAF Protection

### Blocked Patterns

**SQL Injection**:
- `UNION SELECT`, `DROP TABLE`, `DELETE FROM`
- `' OR '1'='1`, `--`, `/* */`

**XSS**:
- `<script>`, `<iframe>`, `javascript:`
- `onerror=`, `onload=`, `eval()`

**Path Traversal**:
- `../`, `..\\`, `%2e%2e%2f`

**Command Injection**:
- `;`, `|`, `` ` ``, `$()`, `${}`

---

## 📈 Metrics

### View Metrics
```bash
# All security metrics
curl http://localhost:9090/metrics | grep -E "(waf|rate_limit|account_lock)"

# WAF blocked requests
curl http://localhost:9090/metrics | grep waf_blocked_requests_total

# Rate limit violations
curl http://localhost:9090/metrics | grep rate_limit_exceeded_total

# Account locks
curl http://localhost:9090/metrics | grep account_locks_total
```

### Metric Names
```
waf_blocked_requests_total{reason, endpoint}
waf_suspicious_activity_total{type, ip}
rate_limit_exceeded_total{type, identifier}
account_locks_total{reason}
order_rate_limit_exceeded_total{type, identifier}
```

---

## 🧪 Testing

### Test Login Rate Limiting
```bash
# Should block after 3 attempts
for i in {1..5}; do
  curl -X POST http://localhost/auth/login \
    -H "Content-Type: application/json" \
    -d '{"student_id":"test123","password":"wrong"}'
done
```

**Expected**: First 3 succeed (with 401), next 2 return 429

### Test Account Locking
```bash
# Should lock after 5 failed attempts
for i in {1..6}; do
  curl -X POST http://localhost/auth/login \
    -H "Content-Type: application/json" \
    -d '{"student_id":"test123","password":"wrong"}'
  sleep 15  # Wait for rate limit reset
done
```

**Expected**: After 5th attempt, account locked for 10 minutes

### Test Order Rate Limiting
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"student_id":"12345","password":"password123"}' | jq -r '.data.accessToken')

# Should block after 10 orders
for i in {1..12}; do
  curl -X POST http://localhost/api/order \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-Idempotency-Key: order-$i" \
    -d '{"items":[{"id":1,"quantity":1}]}'
done
```

**Expected**: First 10 succeed, next 2 return 429

### Test SQL Injection
```bash
curl "http://localhost/api/order?id=1' OR '1'='1"
```

**Expected**: 403 Forbidden

### Test XSS
```bash
curl -X POST http://localhost/api/order \
  -H "Content-Type: application/json" \
  -d '{"note":"<script>alert(1)</script>"}'
```

**Expected**: 403 Forbidden

---

## 🔍 Debugging

### Check Logs
```bash
# Identity Provider logs
docker-compose logs -f identity-provider | grep -E "(rate|lock|fail)"

# Order Gateway logs
docker-compose logs -f order-gateway | grep -E "(waf|block|rate)"

# NGINX logs
docker-compose logs -f nginx | grep -E "(limit|block)"
```

### Check Redis
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# View rate limit keys
KEYS ratelimit:*

# View locked accounts
KEYS account:locked:*

# View specific key
GET ratelimit:login:student:12345
```

### Check WAF Stats
```bash
# If WAF stats endpoint is exposed
curl http://localhost:3002/admin/waf/stats
```

---

## 🚨 Common Issues

### Issue: Rate limiting not working
**Solution**: Check Redis connection
```bash
docker-compose logs redis
docker-compose exec redis redis-cli PING
```

### Issue: Account stays locked
**Solution**: Manually unlock in Redis
```bash
docker-compose exec redis redis-cli
DEL account:locked:12345
```

### Issue: Too many false positives
**Solution**: Check WAF patterns and adjust if needed
- Edit `services/order-gateway/src/middleware/waf.middleware.js`
- Modify pattern arrays (SQL_INJECTION_PATTERNS, XSS_PATTERNS, etc.)

### Issue: Security headers not appearing
**Solution**: Check trust proxy setting
```javascript
// Must be BEFORE other middleware
app.set('trust proxy', true);
```

---

## 📝 Response Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 401 | Unauthorized | Invalid credentials, missing token |
| 403 | Forbidden | WAF blocked, malicious request |
| 413 | Payload Too Large | Request body > 1MB |
| 415 | Unsupported Media Type | Wrong Content-Type |
| 429 | Too Many Requests | Rate limit exceeded, account locked |

---

## 🔧 Configuration

### Environment Variables
```env
# Both services need these
REDIS_URL=redis://redis:6379/0
SERVICE_SECRET=change-me-in-production
```

### Adjust Rate Limits

**Login Rate Limit** (`advancedRateLimiter.js`):
```javascript
if (studentAttempts >= 3) {  // Change this number
if (ipAttempts >= 10) {      // Change this number
if (newFailures >= 5) {      // Change lock threshold
```

**Order Rate Limit** (`rateLimiter.js`):
```javascript
if (studentOrders >= 10) {   // Change this number
if (ipOrders >= 50) {        // Change this number
```

**NGINX Rate Limit** (`nginx.conf`):
```nginx
limit_req_zone $binary_remote_addr zone=global:10m rate=100r/s;  # Change rate
limit_req_zone $binary_remote_addr zone=login:10m rate=3r/m;     # Change rate
limit_req_zone $binary_remote_addr zone=order:10m rate=10r/m;    # Change rate
```

---

## 📚 Documentation

- **Architecture**: `SECURITY_ARCHITECTURE.md`
- **Implementation**: `SECURITY_IMPLEMENTATION_SUMMARY.md`
- **Integration Status**: `SECURITY_INTEGRATION_STATUS.md`
- **This Guide**: `SECURITY_QUICK_REFERENCE.md`

---

## ✅ Verification Checklist

Before deploying to production:

- [ ] All services start without errors
- [ ] Security headers present in responses
- [ ] Login rate limiting works (test with 5 attempts)
- [ ] Account locking works (test with 6 attempts)
- [ ] Order rate limiting works (test with 12 orders)
- [ ] WAF blocks SQL injection
- [ ] WAF blocks XSS
- [ ] Metrics are being collected
- [ ] Logs show security events
- [ ] Redis is connected and working
- [ ] NGINX is proxying requests
- [ ] SERVICE_SECRET changed from default
- [ ] SSL/TLS configured (production only)

---

## 🎯 Quick Commands

```bash
# Start system
docker-compose up -d

# Stop system
docker-compose down

# View all logs
docker-compose logs -f

# View security logs only
docker-compose logs -f | grep -E "(block|rate|lock|waf|403|429)"

# Restart security services
docker-compose restart identity-provider order-gateway nginx

# Check service health
curl http://localhost/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# View metrics
curl http://localhost:9090/metrics

# Clear Redis (reset all rate limits)
docker-compose exec redis redis-cli FLUSHDB
```
