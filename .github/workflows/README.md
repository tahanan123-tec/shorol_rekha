# CI/CD Pipeline Documentation

Comprehensive GitHub Actions workflows for the Cafeteria Ordering System.

## Workflows Overview

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`

**Jobs:**

#### Test (Parallel Execution)
- Runs tests for all 7 services in parallel
- Uses matrix strategy for efficiency
- Caches node_modules for faster builds
- Uploads test coverage artifacts
- **Fails build if any test fails**

#### Integration Test
- Runs after unit tests pass
- Uses Docker services (PostgreSQL, Redis, RabbitMQ)
- Tests service interactions
- Validates database operations

#### Build
- Only runs on push to `main`
- Builds Docker images for all services
- Pushes to GitHub Container Registry
- Uses BuildKit cache for faster builds
- Tags images with branch, SHA, and latest

#### Security
- Runs Trivy vulnerability scanner
- Performs npm audit on all services
- Uploads results to GitHub Security tab

#### Deploy (Optional)
- Only runs on `main` branch
- Supports multiple environments (staging/production)
- Includes health checks
- Automatic rollback on failure

#### Notify
- Sends notifications on completion
- Creates deployment status

---

### 2. Release Pipeline (`release.yml`)

**Triggers:**
- Push of version tags (v*.*.*)

**Jobs:**

#### Create Release
- Generates changelog from commits
- Creates GitHub release
- Lists Docker image tags

#### Build Release
- Builds production images
- Tags with version number and latest
- Pushes to container registry

---

### 3. Nightly Build (`nightly.yml`)

**Triggers:**
- Scheduled: 2 AM UTC daily
- Manual trigger via workflow_dispatch

**Jobs:**

#### Full Test Suite
- Runs comprehensive tests
- Includes load tests
- Concurrency tests
- Performance benchmarks

#### Dependency Update
- Checks for outdated dependencies
- Creates GitHub issue if updates available

#### Security Scan
- Daily security vulnerability scan
- Stores results for 30 days

---

### 4. PR Checks (`pr-checks.yml`)

**Triggers:**
- Pull requests to `main` or `develop`

**Jobs:**

#### Validate
- Checks commit message format (conventional commits)
- Detects merge conflicts
- Validates file sizes (<5MB)

#### Quality
- Runs ESLint
- Checks code formatting with Prettier
- Ensures code standards

#### Dependencies
- Checks for outdated dependencies
- Security vulnerability scan

#### Performance
- Builds and checks bundle size
- Comments on PR with results

---

## Caching Strategy

### Node Modules Cache

```yaml
- uses: actions/cache@v3
  with:
    path: services/${{ matrix.service }}/node_modules
    key: ${{ runner.os }}-node-${{ matrix.service }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-${{ matrix.service }}-
```

**Benefits:**
- Reduces build time by 50-70%
- Caches per service
- Invalidates on package-lock.json changes

### Docker Build Cache

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Benefits:**
- Caches Docker layers
- Speeds up image builds
- Shared across workflow runs

### Setup Node Cache

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
```

**Benefits:**
- Built-in npm cache
- Automatic cache management
- Works with monorepo structure

---

## Parallel Test Execution

### Matrix Strategy

```yaml
strategy:
  fail-fast: false
  matrix:
    service:
      - identity-provider
      - order-gateway
      - stock-service
      - kitchen-queue
      - notification-hub
      - client
      - admin-dashboard
```

**Benefits:**
- Tests run in parallel (7 jobs simultaneously)
- Reduces total test time from ~35 minutes to ~5 minutes
- `fail-fast: false` ensures all tests run even if one fails

### Resource Optimization

- Each job runs on separate runner
- Efficient use of GitHub Actions minutes
- Parallel execution without conflicts

---

## Required Secrets

Configure these in GitHub repository settings:

### Docker Registry
- `GITHUB_TOKEN` - Automatically provided

### Deployment (Optional)
- `SSH_PRIVATE_KEY` - SSH key for deployment server
- `DEPLOY_HOST` - Deployment server hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_URL` - Application URL for health checks

### AWS (Optional)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Notifications (Optional)
- `SLACK_WEBHOOK` - Slack webhook URL

### Environment Variables
- `API_URL` - API base URL
- `WS_URL` - WebSocket URL
- `PROMETHEUS_URL` - Prometheus URL

---

## Environment Configuration

### Staging Environment

```yaml
environment:
  name: staging
  url: https://staging.cafeteria.example.com
```

### Production Environment

```yaml
environment:
  name: production
  url: https://cafeteria.example.com
```

**Features:**
- Manual approval required (configure in GitHub)
- Environment-specific secrets
- Deployment history tracking

---

## Workflow Triggers

### Push to Main
```yaml
on:
  push:
    branches:
      - main
```
Triggers: Test → Build → Deploy

### Pull Request
```yaml
on:
  pull_request:
    branches:
      - main
```
Triggers: Test → Quality Checks

### Tag Push
```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```
Triggers: Release Build

### Schedule
```yaml
on:
  schedule:
    - cron: '0 2 * * *'
```
Triggers: Nightly Tests

### Manual
```yaml
on:
  workflow_dispatch:
```
Triggers: Manual execution from GitHub UI

---

## Build Optimization

### Multi-stage Docker Builds

```dockerfile
FROM node:20-alpine AS deps
# Install dependencies

FROM node:20-alpine AS builder
# Build application

FROM node:20-alpine AS runner
# Run application
```

**Benefits:**
- Smaller final images
- Faster builds with layer caching
- Secure production images

### Conditional Job Execution

```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

**Benefits:**
- Saves CI minutes
- Runs builds only when needed
- Prevents unnecessary deployments

---

## Monitoring and Debugging

### View Workflow Runs

1. Go to repository → Actions tab
2. Select workflow
3. View run details

### Check Logs

```bash
# Download logs
gh run download <run-id>

# View specific job
gh run view <run-id> --job=<job-id>
```

### Debug Failed Builds

1. Check job logs in GitHub Actions
2. Review test output
3. Check artifact uploads
4. Verify secrets are configured

### Re-run Failed Jobs

```bash
# Re-run failed jobs only
gh run rerun <run-id> --failed

# Re-run entire workflow
gh run rerun <run-id>
```

---

## Best Practices

### 1. Commit Message Format

Use conventional commits:
```
feat(service): add new feature
fix(service): fix bug
docs: update documentation
test: add tests
chore: update dependencies
```

### 2. Branch Strategy

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `hotfix/*` - Urgent fixes

### 3. Version Tags

```bash
# Create version tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### 4. Test Coverage

- Maintain >80% code coverage
- Write unit tests for all services
- Include integration tests
- Add load tests for critical paths

### 5. Security

- Run security scans regularly
- Keep dependencies updated
- Review vulnerability reports
- Use secrets for sensitive data

---

## Troubleshooting

### Tests Failing

**Check:**
- Test logs in workflow run
- Local test execution
- Dependencies are up to date
- Environment variables are set

### Build Failing

**Check:**
- Dockerfile syntax
- Build context
- Docker cache
- Build arguments

### Deploy Failing

**Check:**
- SSH connectivity
- Server disk space
- Docker daemon running
- Health check endpoints

### Cache Issues

**Clear cache:**
```bash
# Delete cache via GitHub CLI
gh cache delete <cache-key>

# Or clear all caches
gh cache list | awk '{print $1}' | xargs -I {} gh cache delete {}
```

---

## Performance Metrics

### Typical Build Times

- **Unit Tests**: ~5 minutes (parallel)
- **Integration Tests**: ~3 minutes
- **Docker Builds**: ~8 minutes (with cache)
- **Total Pipeline**: ~15-20 minutes

### Optimization Tips

1. Use caching effectively
2. Run tests in parallel
3. Optimize Docker layers
4. Use BuildKit
5. Minimize dependencies

---

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Implement blue-green deployments
- [ ] Add performance regression tests
- [ ] Integrate with monitoring tools
- [ ] Add automatic dependency updates (Dependabot)
- [ ] Implement canary deployments
- [ ] Add smoke tests post-deployment

---

## Support

For issues with CI/CD:
1. Check workflow logs
2. Review this documentation
3. Check GitHub Actions status page
4. Create issue with workflow run link
