# Scripts

Organized PowerShell and shell scripts for managing the cafeteria ordering system.

## Quick Reference

### Essential Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| [start-all.ps1](deployment/start-all.ps1) | Start all services | `./scripts/deployment/start-all.ps1` |
| [stop-all.ps1](deployment/stop-all.ps1) | Stop all services | `./scripts/deployment/stop-all.ps1` |
| [deploy-all.ps1](deployment/deploy-all.ps1) | Full deployment | `./scripts/deployment/deploy-all.ps1` |
| [check-status.ps1](deployment/check-status.ps1) | Check service status | `./scripts/deployment/check-status.ps1` |

## Directory Structure

```
scripts/
├── deployment/          # Deployment and operations scripts
│   ├── start-all.ps1           # Start all services
│   ├── stop-all.ps1            # Stop all services
│   ├── deploy-all.ps1          # Full deployment
│   ├── deploy-local.ps1        # Local deployment
│   ├── check-status.ps1        # Service health check
│   ├── setup-env-files.ps1     # Environment setup
│   ├── prepare-git-push.ps1    # Git preparation
│   └── push-to-github.ps1      # GitHub push helper
│
├── development/         # Development utilities
│   ├── install-dependencies.ps1  # Install all dependencies
│   ├── start-essential.ps1       # Start essential services only
│   └── start-dashboard.ps1       # Start admin dashboard
│
├── testing/             # Testing scripts
│   └── test-performance.ps1      # Performance testing
│
└── legacy/              # Historical/deprecated scripts
    ├── fix-*.ps1                 # Old fix scripts
    ├── restart-*.ps1             # Old restart scripts
    └── test-login.ps1            # Old login tests
```

## Deployment Scripts

### start-all.ps1
Starts all services in the correct order with health checks.

```powershell
./scripts/deployment/start-all.ps1
```

**What it does:**
- Starts infrastructure (PostgreSQL, Redis, RabbitMQ)
- Starts backend services
- Starts frontend applications
- Performs health checks

### stop-all.ps1
Gracefully stops all running services.

```powershell
./scripts/deployment/stop-all.ps1
```

### deploy-all.ps1
Complete deployment including build and start.

```powershell
./scripts/deployment/deploy-all.ps1
```

**What it does:**
- Builds Docker images
- Sets up environment files
- Starts all services
- Runs health checks

### deploy-local.ps1
Quick local deployment for development.

```powershell
./scripts/deployment/deploy-local.ps1
```

### check-status.ps1
Comprehensive health check for all services.

```powershell
./scripts/deployment/check-status.ps1
```

**Checks:**
- Service availability
- Database connections
- Message queue status
- API endpoints

### setup-env-files.ps1
Creates all necessary environment files from examples.

```powershell
./scripts/deployment/setup-env-files.ps1
```

### prepare-git-push.ps1
Prepares repository for pushing to Git.

```powershell
./scripts/deployment/prepare-git-push.ps1
```

### push-to-github.ps1
Interactive GitHub push helper.

```powershell
./scripts/deployment/push-to-github.ps1
```

## Development Scripts

### install-dependencies.ps1
Installs dependencies for all services.

```powershell
./scripts/development/install-dependencies.ps1
```

**Installs:**
- Node.js dependencies for all services
- Frontend dependencies
- Development tools

### start-essential.ps1
Starts only essential services for development.

```powershell
./scripts/development/start-essential.ps1
```

**Starts:**
- PostgreSQL
- Redis
- RabbitMQ
- Identity Provider
- Order Gateway

### start-dashboard.ps1
Starts the admin dashboard in development mode.

```powershell
./scripts/development/start-dashboard.ps1
```

## Testing Scripts

### test-performance.ps1
Runs performance tests and load testing.

```powershell
./scripts/testing/test-performance.ps1
```

**Tests:**
- API response times
- Concurrent request handling
- Database performance
- Cache effectiveness

## Legacy Scripts

Historical scripts kept for reference. These are deprecated and should not be used in production.

Located in `scripts/legacy/`:
- `fix-*.ps1` - Old bug fix scripts
- `restart-*.ps1` - Old restart scripts
- `test-login.ps1` - Old login testing
- `seed-menu.ps1` - Old menu seeding

## Common Workflows

### First Time Setup

```powershell
# 1. Setup environment files
./scripts/deployment/setup-env-files.ps1

# 2. Install dependencies
./scripts/development/install-dependencies.ps1

# 3. Deploy everything
./scripts/deployment/deploy-all.ps1

# 4. Check status
./scripts/deployment/check-status.ps1
```

### Daily Development

```powershell
# Start essential services
./scripts/development/start-essential.ps1

# Start dashboard for monitoring
./scripts/development/start-dashboard.ps1
```

### Testing

```powershell
# Run performance tests
./scripts/testing/test-performance.ps1

# Check service health
./scripts/deployment/check-status.ps1
```

### Deployment

```powershell
# Full deployment
./scripts/deployment/deploy-all.ps1

# Or local deployment
./scripts/deployment/deploy-local.ps1

# Check everything is running
./scripts/deployment/check-status.ps1
```

### Shutdown

```powershell
# Stop all services
./scripts/deployment/stop-all.ps1
```

## Script Conventions

### Naming
- Use kebab-case: `start-all.ps1`
- Be descriptive: `check-status.ps1` not `check.ps1`
- Prefix by action: `start-`, `stop-`, `deploy-`, `test-`

### Structure
- Include help comments at the top
- Use Write-Host for user feedback
- Include error handling
- Exit with appropriate codes

### Error Handling
```powershell
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error occurred" -ForegroundColor Red
    exit 1
}
```

## Troubleshooting

### Script Won't Run
```powershell
# Check execution policy
Get-ExecutionPolicy

# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Permission Denied
```powershell
# Run PowerShell as Administrator
```

### Docker Not Found
```powershell
# Ensure Docker Desktop is running
docker --version
```

## Contributing

When adding new scripts:
1. Place in appropriate directory
2. Follow naming conventions
3. Add documentation to this README
4. Include inline comments
5. Test thoroughly

## See Also

- [Deployment Guide](../docs/deployment/DOCKER_QUICK_START.md)
- [Development Guide](../docs/guides/GET_STARTED.md)
- [Troubleshooting](../docs/troubleshooting/TROUBLESHOOTING.md)

---

**Last Updated**: March 1, 2026
