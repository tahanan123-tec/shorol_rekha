# CI/CD Setup Guide

Step-by-step guide to configure GitHub Actions for the Cafeteria Ordering System.

## Prerequisites

- GitHub repository
- GitHub Actions enabled
- Docker Hub or GitHub Container Registry account
- Deployment server (optional)

---

## Step 1: Enable GitHub Actions

1. Go to repository Settings
2. Navigate to Actions → General
3. Select "Allow all actions and reusable workflows"
4. Click "Save"

---

## Step 2: Configure Secrets

### Required Secrets

Navigate to Settings → Secrets and variables → Actions

#### For Docker Registry (GitHub Container Registry)

No additional secrets needed - `GITHUB_TOKEN` is automatically provided.

#### For Deployment (Optional)

Add these secrets:

```
SSH_PRIVATE_KEY=<your-ssh-private-key>
DEPLOY_HOST=your-server.example.com
DEPLOY_USER=deploy
DEPLOY_URL=https://your-app.example.com
```

#### For Client/Dashboard Build

```
API_URL=https://api.your-domain.com
WS_URL=https://ws.your-domain.com
PROMETHEUS_URL=https://prometheus.your-domain.com
```

#### For Notifications (Optional)

```
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### How to Add Secrets

```bash
# Using GitHub CLI
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_rsa
gh secret set DEPLOY_HOST --body "your-server.example.com"
gh secret set DEPLOY_USER --body "deploy"

# Or via GitHub UI
# Settings → Secrets → New repository secret
```

---

## Step 3: Configure Environments

### Create Staging Environment

1. Go to Settings → Environments
2. Click "New environment"
3. Name: `staging`
4. Add environment-specific secrets
5. Configure protection rules (optional)

### Create Production Environment

1. Click "New environment"
2. Name: `production`
3. Enable "Required reviewers"
4. Add reviewers (team members)
5. Add environment-specific secrets

### Environment Secrets

For each environment, add:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `API_URL`
- `WS_URL`

---

## Step 4: Setup SSH for Deployment

### Generate SSH Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions" -f github-actions-key

# This creates:
# - github-actions-key (private key)
# - github-actions-key.pub (public key)
```

### Add Public Key to Server

```bash
# Copy public key to server
ssh-copy-id -i github-actions-key.pub user@your-server.com

# Or manually
cat github-actions-key.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Add Private Key to GitHub

```bash
# Add as secret
gh secret set SSH_PRIVATE_KEY < github-actions-key

# Or copy content and paste in GitHub UI
cat github-actions-key
```

---

## Step 5: Configure Docker Registry

### Option A: GitHub Container Registry (Recommended)

**No additional setup needed!**

Images will be pushed to:
```
ghcr.io/your-username/your-repo/service-name:tag
```

### Option B: Docker Hub

1. Create Docker Hub account
2. Create access token
3. Add secrets:

```bash
gh secret set DOCKER_USERNAME --body "your-dockerhub-username"
gh secret set DOCKER_PASSWORD --body "your-access-token"
```

4. Update workflow file:

```yaml
- name: Log in to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}
```

---

## Step 6: Prepare Deployment Server

### Install Docker

```bash
# On deployment server
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Setup Application Directory

```bash
# Create directory
sudo mkdir -p /opt/cafeteria-system
sudo chown $USER:$USER /opt/cafeteria-system

# Clone repository
cd /opt/cafeteria-system
git clone https://github.com/your-username/your-repo.git .

# Create environment file
cp .env.example .env
# Edit .env with production values
```

### Configure Firewall

```bash
# Allow necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## Step 7: Test the Pipeline

### Trigger First Build

```bash
# Make a small change
echo "# CI/CD Test" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

### Monitor Build

1. Go to repository → Actions tab
2. Click on the running workflow
3. Watch jobs execute
4. Check for any errors

### Verify Docker Images

```bash
# List images in registry
gh api /user/packages/container/your-repo/versions

# Or check GitHub Packages page
# https://github.com/your-username?tab=packages
```

---

## Step 8: Configure Branch Protection

### Protect Main Branch

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Require pull request reviews
4. Select required status checks:
   - Test - identity-provider
   - Test - order-gateway
   - Test - stock-service
   - Test - kitchen-queue
   - Test - notification-hub
   - Test - client
   - Test - admin-dashboard
   - Integration Tests
5. Save changes

---

## Step 9: Setup Notifications

### Slack Integration

1. Create Slack webhook:
   - Go to https://api.slack.com/apps
   - Create new app
   - Enable Incoming Webhooks
   - Add webhook to workspace
   - Copy webhook URL

2. Add to GitHub secrets:
```bash
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

3. Enable in workflow:
```yaml
- name: Send Slack notification
  if: true  # Change from false to true
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Step 10: Verify Everything Works

### Checklist

- [ ] Workflows appear in Actions tab
- [ ] Tests run on push to main
- [ ] Tests run on pull requests
- [ ] Docker images build successfully
- [ ] Images pushed to registry
- [ ] Deployment works (if configured)
- [ ] Notifications sent (if configured)
- [ ] Branch protection active

### Test Scenarios

#### 1. Test Failure

```bash
# Break a test intentionally
# Push and verify build fails
```

#### 2. Successful Build

```bash
# Fix the test
# Push and verify build succeeds
```

#### 3. Pull Request

```bash
# Create feature branch
git checkout -b feature/test
# Make changes
git commit -m "feat: add feature"
git push origin feature/test
# Create PR and verify checks run
```

#### 4. Release

```bash
# Create version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# Verify release workflow runs
```

---

## Troubleshooting

### Workflow Not Triggering

**Check:**
- Workflow file syntax (use YAML validator)
- Branch name matches trigger
- GitHub Actions enabled
- Workflow file in `.github/workflows/`

### Tests Failing

**Check:**
- Run tests locally first
- Check test logs in workflow
- Verify dependencies installed
- Check environment variables

### Docker Build Failing

**Check:**
- Dockerfile syntax
- Build context path
- Required files exist
- Build arguments correct

### Deployment Failing

**Check:**
- SSH connectivity: `ssh user@host`
- Server has Docker installed
- Sufficient disk space
- Correct file permissions

### Secrets Not Working

**Check:**
- Secret name matches workflow
- Secret value is correct
- No extra spaces in secret
- Secret scope (repo vs environment)

---

## Maintenance

### Regular Tasks

#### Weekly
- Review failed builds
- Check security scan results
- Update dependencies if needed

#### Monthly
- Review and update secrets
- Check disk space on servers
- Review workflow performance
- Update GitHub Actions versions

#### Quarterly
- Review and optimize workflows
- Update documentation
- Audit access and permissions
- Review deployment strategy

---

## Advanced Configuration

### Custom Runners

For better performance, use self-hosted runners:

```yaml
runs-on: self-hosted
```

Setup:
1. Go to Settings → Actions → Runners
2. Click "New self-hosted runner"
3. Follow setup instructions
4. Configure runner on your server

### Matrix Build Optimization

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
```

### Conditional Deployments

```yaml
if: |
  github.event_name == 'push' &&
  github.ref == 'refs/heads/main' &&
  !contains(github.event.head_commit.message, '[skip ci]')
```

---

## Security Best Practices

1. **Use Secrets for Sensitive Data**
   - Never commit credentials
   - Use environment-specific secrets
   - Rotate secrets regularly

2. **Limit Permissions**
   - Use least privilege principle
   - Restrict workflow permissions
   - Review third-party actions

3. **Scan Dependencies**
   - Enable Dependabot
   - Review security alerts
   - Update dependencies regularly

4. **Audit Logs**
   - Review workflow runs
   - Monitor failed builds
   - Check deployment logs

---

## Cost Optimization

### GitHub Actions Minutes

- Public repos: Unlimited
- Private repos: 2,000 minutes/month (free tier)

### Tips to Reduce Usage

1. Use caching effectively
2. Run tests in parallel
3. Skip unnecessary jobs
4. Use self-hosted runners
5. Optimize Docker builds

### Monitor Usage

```bash
# Check usage
gh api /repos/OWNER/REPO/actions/cache/usage

# View workflow runs
gh run list --limit 50
```

---

## Support Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [GitHub Community](https://github.community/)

---

## Next Steps

1. ✅ Complete this setup guide
2. ✅ Test all workflows
3. ✅ Configure monitoring
4. ✅ Document custom changes
5. ✅ Train team on CI/CD process
