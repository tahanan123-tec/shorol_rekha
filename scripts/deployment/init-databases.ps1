#!/usr/bin/env pwsh

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Initializing Databases" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Wait for postgres to be ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Drop and recreate databases with proper permissions
Write-Host "`nSetting up inventory_db..." -ForegroundColor Yellow
docker exec shorol_rekha-postgres-1 psql -U admin -c "DROP DATABASE IF EXISTS inventory_db;" 2>&1 | Out-Null
docker exec shorol_rekha-postgres-1 psql -U admin -c "DROP USER IF EXISTS inventory_user;" 2>&1 | Out-Null
docker exec shorol_rekha-postgres-1 psql -U admin -c "CREATE USER inventory_user WITH PASSWORD 'inventory_pass';"
docker exec shorol_rekha-postgres-1 psql -U admin -c "CREATE DATABASE inventory_db OWNER inventory_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d inventory_db -c "GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d inventory_db -c "GRANT ALL ON SCHEMA public TO inventory_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d inventory_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO inventory_user;"

Write-Host "`nSetting up identity_db..." -ForegroundColor Yellow
docker exec shorol_rekha-postgres-1 psql -U admin -c "DROP DATABASE IF EXISTS identity_db;" 2>&1 | Out-Null
docker exec shorol_rekha-postgres-1 psql -U admin -c "DROP USER IF EXISTS identity_user;" 2>&1 | Out-Null
docker exec shorol_rekha-postgres-1 psql -U admin -c "CREATE USER identity_user WITH PASSWORD 'identity_pass';"
docker exec shorol_rekha-postgres-1 psql -U admin -c "CREATE DATABASE identity_db OWNER identity_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d identity_db -c "GRANT ALL PRIVILEGES ON DATABASE identity_db TO identity_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d identity_db -c "GRANT ALL ON SCHEMA public TO identity_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d identity_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO identity_user;"

Write-Host "`nSetting up orders_db..." -ForegroundColor Yellow
docker exec shorol_rekha-postgres-1 psql -U admin -c "DROP DATABASE IF EXISTS orders_db;" 2>&1 | Out-Null
docker exec shorol_rekha-postgres-1 psql -U admin -c "DROP USER IF EXISTS orders_user;" 2>&1 | Out-Null
docker exec shorol_rekha-postgres-1 psql -U admin -c "CREATE USER orders_user WITH PASSWORD 'orders_pass';"
docker exec shorol_rekha-postgres-1 psql -U admin -c "CREATE DATABASE orders_db OWNER orders_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d orders_db -c "GRANT ALL PRIVILEGES ON DATABASE orders_db TO orders_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d orders_db -c "GRANT ALL ON SCHEMA public TO orders_user;"
docker exec shorol_rekha-postgres-1 psql -U admin -d orders_db -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO orders_user;"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Databases Initialized Successfully!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
