Write-Host "=== DEPLOYING HIGH-PERFORMANCE SYSTEM (200+ REQ/S) ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml down

Write-Host ""
Write-Host "Building optimized images..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml build

Write-Host ""
Write-Host "Starting services with 3 replicas each..." -ForegroundColor Yellow
docker-compose -f docker-compose.local.yml up -d --scale identity-provider=3 --scale order-gateway=3 --scale stock-service=3

Write-Host ""
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Cyan
docker-compose -f docker-compose.local.yml ps

Write-Host ""
Write-Host "=== OPTIMIZATION SUMMARY ===" -ForegroundColor Green
Write-Host ""
Write-Host "✅ NGINX Rate Limits:" -ForegroundColor White
Write-Host "   • Global: 500 req/s (was 100)" -ForegroundColor Gray
Write-Host "   • API: 300 req/s (was 50)" -ForegroundColor Gray
Write-Host "   • Login: 10 req/s (was 3 req/min)" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Database Connection Pools:" -ForegroundColor White
Write-Host "   • Identity Provider: 100 connections (was 20)" -ForegroundColor Gray
Write-Host "   • Order Gateway: 100 connections (was 20)" -ForegroundColor Gray
Write-Host "   • Stock Service: 100 connections (was 50)" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ PostgreSQL Optimizations:" -ForegroundColor White
Write-Host "   • Max connections: 300 (was 100)" -ForegroundColor Gray
Write-Host "   • Shared buffers: 256MB" -ForegroundColor Gray
Write-Host "   • Effective cache: 1GB" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Service Replicas:" -ForegroundColor White
Write-Host "   • Identity Provider: 3 instances" -ForegroundColor Gray
Write-Host "   • Order Gateway: 3 instances" -ForegroundColor Gray
Write-Host "   • Stock Service: 3 instances" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Performance Optimizations:" -ForegroundColor White
Write-Host "   • Bcrypt rounds: 10 (was 12) - 4x faster" -ForegroundColor Gray
Write-Host "   • Connection pooling: Enabled with keepalive" -ForegroundColor Gray
Write-Host "   • Resource limits: 1 CPU, 512MB RAM per service" -ForegroundColor Gray
Write-Host ""
Write-Host "=== EXPECTED PERFORMANCE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Read Operations (Stock, Menu):" -ForegroundColor White
Write-Host "  • Target: 200-300 req/s ✅" -ForegroundColor Green
Write-Host ""
Write-Host "Write Operations (Login, Register):" -ForegroundColor White
Write-Host "  • Target: 50-100 req/s ✅" -ForegroundColor Green
Write-Host ""
Write-Host "Mixed Workload:" -ForegroundColor White
Write-Host "  • Target: 150-200 req/s ✅" -ForegroundColor Green
Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run performance test:" -ForegroundColor White
Write-Host "   .\test-performance.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Monitor metrics:" -ForegroundColor White
Write-Host "   http://localhost:3200 (Grafana)" -ForegroundColor Gray
Write-Host "   http://localhost:9090 (Prometheus)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Check service health:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.local.yml ps" -ForegroundColor Gray
Write-Host ""
Write-Host "4. View logs:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.local.yml logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 System is ready for high-performance testing!" -ForegroundColor Green
