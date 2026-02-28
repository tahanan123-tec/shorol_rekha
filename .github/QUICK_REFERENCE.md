# CI/CD Quick Reference

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci-cd.yml` | Push to main, PRs | Main pipeline: test, build, deploy |
| `release.yml` | Version tags | Create releases and build images |
| `nightly.yml` | Daily at 2 AM | Full test suite, dependency checks |
| `pr-checks.yml` | Pull requests | Code quality and validation |

## Quick Commands

### Trigger Workflows

```bash
# Push to main (triggers CI/CD)
git push origin main

# Create release (triggers release workflow)
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Manual trigger
gh workflow run ci-cd.yml
```

### View Workflow Status

```bash
# List recent runs
gh run list

# View specific run
gh run view <run-id>

# Watch live
gh run watch
```

### Manage Secrets

```bash
# Add secret
gh secret set SECRET_NAME

# List secrets
gh secret list

# Delete secret
gh secret delete SECRET_NAME
```

### Cache Management

```bash
# List caches
gh cache list

# Delete cache
gh cache delete <cache-key>
```

## Pipeline Stages

```
┌─────────────────────────────────────────────┐
│  1. TEST (Parallel)                         │
│     ├─ identity-provider                    │
│     ├─ order-gateway                        │
│     ├─ stock-service                        │
│     ├─ kitchen-queue                        │
│     ├─ notification-hub                     │
│     ├─ client                               │
│     └─ admin-dashboard                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. INTEGRATION TEST                        │
│     └─ Test service interactions            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. BUILD (Parallel)                        │
│     └─ Build Docker images for all services │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  4. SECURITY                                │
│     └─ Vulnerability scanning               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  5. DEPLOY (Optional)                       │
│     └─ Deploy to staging/production         │
└─────────────────────────────────────────────┘
```

## Required Secrets

### Minimal Setup
- `GITHUB_TOKEN` (automatic)

### Full Setup
- `SSH_PRIVATE_KEY`
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_URL`
- `API_URL`
- `WS_URL`
- `PROMETHEUS_URL`
- `SLACK_WEBHOOK` (optional)

## Caching

- **Node modules**: Cached per service
- **Docker layers**: Cached with BuildKit
- **npm cache**: Automatic with setup-node

## Performance

- **Parallel tests**: ~5 minutes
- **Integration tests**: ~3 minutes
- **Docker builds**: ~8 minutes (cached)
- **Total**: ~15-20 minutes

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests fail | Check logs, run locally |
| Build fails | Verify Dockerfile, check context |
| Deploy fails | Check SSH, verify server status |
| Cache issues | Clear cache, rebuild |

## Best Practices

✅ Use conventional commits
✅ Write tests for new features
✅ Keep dependencies updated
✅ Review security scans
✅ Monitor workflow runs

## Documentation

- [Full README](.github/workflows/README.md)
- [Setup Guide](.github/CICD_SETUP.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
