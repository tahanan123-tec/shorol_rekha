# Quick Deploy Commands

One-page reference for deploying to AWS, GCP, or Azure.

## 🚀 AWS EKS - Complete Deployment

```bash
# 1. Create cluster (15-20 minutes)
eksctl create cluster -f k8s/cloud/aws/eks-cluster.yaml

# 2. Configure kubectl
aws eks update-kubeconfig --name cafeteria-cluster --region us-east-1

# 3. Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=cafeteria-cluster

# 4. Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# 5. Deploy application
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace \
  --set global.imageRegistry=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# 6. Get load balancer URL
kubectl get ingress -n cafeteria-system

# 7. Verify deployment
kubectl get pods -n cafeteria-system
kubectl get hpa -n cafeteria-system
```

---

## 🚀 GCP GKE - Complete Deployment

```bash
# 1. Create cluster (10-15 minutes)
gcloud container clusters create cafeteria-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=n1-standard-4 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade

# 2. Configure kubectl
gcloud container clusters get-credentials cafeteria-cluster --region=us-central1

# 3. Deploy application
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace \
  --set global.imageRegistry=gcr.io/PROJECT_ID

# 4. Get load balancer IP
kubectl get ingress -n cafeteria-system

# 5. Verify deployment
kubectl get pods -n cafeteria-system
kubectl get hpa -n cafeteria-system
```

---

## 🚀 Azure AKS - Complete Deployment

```bash
# 1. Create resource group
az group create --name cafeteria-rg --location eastus

# 2. Create cluster (10-15 minutes)
az aks create \
  --resource-group cafeteria-rg \
  --name cafeteria-cluster \
  --node-count 3 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10 \
  --enable-addons monitoring

# 3. Configure kubectl
az aks get-credentials --resource-group cafeteria-rg --name cafeteria-cluster

# 4. Deploy application
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace \
  --set global.imageRegistry=cafeteriaacr.azurecr.io

# 5. Get load balancer IP
kubectl get ingress -n cafeteria-system

# 6. Verify deployment
kubectl get pods -n cafeteria-system
kubectl get hpa -n cafeteria-system
```

---

## 📦 Build & Push Images

```bash
# Set variables
export REGISTRY="your-registry.com"
export VERSION="1.0.0"

# Build all images
docker build -t $REGISTRY/identity-provider:$VERSION ./services/identity-provider
docker build -t $REGISTRY/order-gateway:$VERSION ./services/order-gateway
docker build -t $REGISTRY/stock-service:$VERSION ./services/stock-service
docker build -t $REGISTRY/kitchen-queue:$VERSION ./services/kitchen-queue
docker build -t $REGISTRY/notification-hub:$VERSION ./services/notification-hub
docker build -t $REGISTRY/client:$VERSION ./client
docker build -t $REGISTRY/admin-dashboard:$VERSION ./admin-dashboard
docker build -t $REGISTRY/predictive-scaler:$VERSION ./services/predictive-scaler

# Push all images
docker push $REGISTRY/identity-provider:$VERSION
docker push $REGISTRY/order-gateway:$VERSION
docker push $REGISTRY/stock-service:$VERSION
docker push $REGISTRY/kitchen-queue:$VERSION
docker push $REGISTRY/notification-hub:$VERSION
docker push $REGISTRY/client:$VERSION
docker push $REGISTRY/admin-dashboard:$VERSION
docker push $REGISTRY/predictive-scaler:$VERSION
```

---

## 🔧 Common Operations

### Scale Service Manually
```bash
kubectl scale deployment order-gateway --replicas=10 -n cafeteria-system
```

### Update Image
```bash
kubectl set image deployment/order-gateway \
  order-gateway=$REGISTRY/order-gateway:$NEW_VERSION \
  -n cafeteria-system
```

### Restart Service
```bash
kubectl rollout restart deployment/order-gateway -n cafeteria-system
```

### View Logs
```bash
kubectl logs -f deployment/order-gateway -n cafeteria-system
```

### Execute Command in Pod
```bash
kubectl exec -it <pod-name> -n cafeteria-system -- /bin/sh
```

### Port Forward
```bash
kubectl port-forward svc/order-gateway-service 3002:3002 -n cafeteria-system
```

---

## 📊 Monitoring Commands

### Check Pod Status
```bash
kubectl get pods -n cafeteria-system
kubectl get pods -n cafeteria-system -o wide
kubectl describe pod <pod-name> -n cafeteria-system
```

### Check HPA Status
```bash
kubectl get hpa -n cafeteria-system
kubectl describe hpa order-gateway-hpa -n cafeteria-system
```

### Check Resource Usage
```bash
kubectl top pods -n cafeteria-system
kubectl top nodes
```

### Check Events
```bash
kubectl get events -n cafeteria-system --sort-by='.lastTimestamp'
```

### Access Prometheus
```bash
kubectl port-forward -n monitoring svc/prometheus-server 9090:80
# Open http://localhost:9090
```

### Access Grafana
```bash
kubectl port-forward -n monitoring svc/grafana 3000:80
# Open http://localhost:3000
```

---

## 🧪 Testing Commands

### Load Test
```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run load test
k6 run load-test.js
```

### Chaos Test
```bash
# Kill service
curl -X POST http://chaos-monkey:3006/chaos/kill-service \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "order-gateway", "duration": 30000}'

# Inject latency
curl -X POST http://chaos-monkey:3006/chaos/inject-latency \
  -H "Content-Type: application/json" \
  -d '{"serviceName": "stock-service", "latencyMs": 1000, "duration": 60000}'
```

### Predictive Scaling Test
```bash
# Get predictions
curl http://predictive-scaler:3007/predictions

# Trigger cache warm-up
curl -X POST http://predictive-scaler:3007/warmup

# Manual scale
curl -X POST http://predictive-scaler:3007/scale \
  -H "Content-Type: application/json" \
  -d '{"service": "order-gateway", "replicas": 15}'
```

---

## 🗑️ Cleanup Commands

### Delete Application
```bash
helm uninstall cafeteria -n cafeteria-system
kubectl delete namespace cafeteria-system
```

### Delete Cluster

**AWS**:
```bash
eksctl delete cluster --name cafeteria-cluster
```

**GCP**:
```bash
gcloud container clusters delete cafeteria-cluster --region=us-central1
```

**Azure**:
```bash
az aks delete --resource-group cafeteria-rg --name cafeteria-cluster
az group delete --name cafeteria-rg
```

---

## 🔐 Secrets Management

### Create Secrets
```bash
kubectl create secret generic cafeteria-secrets \
  --from-literal=POSTGRES_PASSWORD=your-password \
  --from-literal=RABBITMQ_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-password \
  --namespace=cafeteria-system
```

### Update Secret
```bash
kubectl delete secret cafeteria-secrets -n cafeteria-system
kubectl create secret generic cafeteria-secrets \
  --from-literal=POSTGRES_PASSWORD=new-password \
  --namespace=cafeteria-system
```

### View Secret
```bash
kubectl get secret cafeteria-secrets -n cafeteria-system -o yaml
```

---

## 🔄 Helm Operations

### Install
```bash
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace
```

### Upgrade
```bash
helm upgrade cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system
```

### Rollback
```bash
helm rollback cafeteria 1 -n cafeteria-system
```

### List Releases
```bash
helm list -n cafeteria-system
```

### Get Values
```bash
helm get values cafeteria -n cafeteria-system
```

---

## 📝 Configuration

### Update ConfigMap
```bash
kubectl edit configmap cafeteria-config -n cafeteria-system
```

### Restart After Config Change
```bash
kubectl rollout restart deployment -n cafeteria-system
```

---

## 🚨 Emergency Commands

### Scale Down Everything
```bash
kubectl scale deployment --all --replicas=0 -n cafeteria-system
```

### Scale Up Everything
```bash
kubectl scale deployment --all --replicas=2 -n cafeteria-system
```

### Delete Failing Pods
```bash
kubectl delete pod --field-selector=status.phase=Failed -n cafeteria-system
```

### Force Delete Pod
```bash
kubectl delete pod <pod-name> --grace-period=0 --force -n cafeteria-system
```

---

## 📞 Support & Debugging

### Get All Resources
```bash
kubectl get all -n cafeteria-system
```

### Describe All Pods
```bash
kubectl describe pods -n cafeteria-system
```

### Get Logs from All Pods
```bash
kubectl logs -l app=order-gateway -n cafeteria-system --tail=100
```

### Check Network Policies
```bash
kubectl get networkpolicies -n cafeteria-system
```

### Check Service Endpoints
```bash
kubectl get endpoints -n cafeteria-system
```

---

**Quick Reference Complete!**

Save this file for fast access to common deployment and operations commands.
