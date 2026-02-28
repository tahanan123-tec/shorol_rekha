# Cloud Deployment Guide

Complete guide for deploying the Cafeteria Ordering System to AWS, GCP, or Azure using Kubernetes.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS EKS Deployment](#aws-eks-deployment)
3. [GCP GKE Deployment](#gcp-gke-deployment)
4. [Azure AKS Deployment](#azure-aks-deployment)
5. [Helm Chart Deployment](#helm-chart-deployment)
6. [Predictive Scaling Setup](#predictive-scaling-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Cost Optimization](#cost-optimization)

---

## Prerequisites

### Tools Required

```bash
# Kubernetes CLI
kubectl version --client

# Helm 3
helm version

# Cloud CLI tools
aws --version        # For AWS
gcloud version       # For GCP
az version           # For Azure

# Docker
docker --version
```

### Container Registry

Push images to your registry:

```bash
# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# GCP GCR
gcloud auth configure-docker

# Azure ACR
az acr login --name myregistry

# Build and push
docker build -t REGISTRY/identity-provider:1.0.0 ./services/identity-provider
docker push REGISTRY/identity-provider:1.0.0
```

---

## AWS EKS Deployment

### 1. Create EKS Cluster

```bash
# Using eksctl
eksctl create cluster -f k8s/cloud/aws/eks-cluster.yaml

# Or using AWS CLI
aws eks create-cluster \
  --name cafeteria-cluster \
  --region us-east-1 \
  --kubernetes-version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/eks-cluster-role \
  --resources-vpc-config subnetIds=subnet-xxx,subnet-yyy,securityGroupIds=sg-xxx
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name cafeteria-cluster --region us-east-1
```

### 3. Install AWS Load Balancer Controller

```bash
# Create IAM policy
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Install controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=cafeteria-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 4. Install EBS CSI Driver

```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=master"
```

### 5. Deploy Application

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic cafeteria-secrets \
  --from-literal=POSTGRES_PASSWORD=your-password \
  --from-literal=RABBITMQ_PASSWORD=your-password \
  --namespace=cafeteria-system

# Apply configurations
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/statefulsets/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/ingress.yaml
```

### 6. Configure Auto Scaling

```bash
# Install Cluster Autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 7. Setup RDS for PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier cafeteria-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password your-password \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxx \
  --db-subnet-group-name cafeteria-subnet-group \
  --backup-retention-period 7 \
  --multi-az
```

### 8. Setup ElastiCache for Redis

```bash
aws elasticache create-replication-group \
  --replication-group-id cafeteria-redis \
  --replication-group-description "Cafeteria Redis Cluster" \
  --engine redis \
  --cache-node-type cache.t3.medium \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --cache-subnet-group-name cafeteria-subnet-group \
  --security-group-ids sg-xxx
```

---

## GCP GKE Deployment

### 1. Create GKE Cluster

```bash
gcloud container clusters create cafeteria-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=n1-standard-4 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-stackdriver-kubernetes \
  --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --enable-shielded-nodes
```

### 2. Configure kubectl

```bash
gcloud container clusters get-credentials cafeteria-cluster --region=us-central1
```

### 3. Setup Workload Identity

```bash
# Create service account
gcloud iam service-accounts create cafeteria-sa \
  --display-name="Cafeteria Service Account"

# Bind IAM policy
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cafeteria-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Create Kubernetes service account
kubectl create serviceaccount cafeteria-ksa --namespace=cafeteria-system

# Bind workload identity
gcloud iam service-accounts add-iam-policy-binding \
  cafeteria-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[cafeteria-system/cafeteria-ksa]"
```

### 4. Setup Cloud SQL

```bash
gcloud sql instances create cafeteria-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04
```

### 5. Setup Memorystore for Redis

```bash
gcloud redis instances create cafeteria-redis \
  --size=5 \
  --region=us-central1 \
  --redis-version=redis_6_x \
  --tier=standard
```

### 6. Deploy Application

```bash
# Deploy using Helm
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace \
  --set global.imageRegistry=gcr.io/PROJECT_ID \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set-string postgresql.host=CLOUD_SQL_IP \
  --set-string redis.host=MEMORYSTORE_IP
```

---

## Azure AKS Deployment

### 1. Create Resource Group

```bash
az group create --name cafeteria-rg --location eastus
```

### 2. Create AKS Cluster

```bash
az aks create \
  --resource-group cafeteria-rg \
  --name cafeteria-cluster \
  --location eastus \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10 \
  --enable-addons monitoring \
  --enable-managed-identity \
  --network-plugin azure \
  --network-policy azure \
  --load-balancer-sku standard \
  --vm-set-type VirtualMachineScaleSets \
  --kubernetes-version 1.28.0
```

### 3. Configure kubectl

```bash
az aks get-credentials --resource-group cafeteria-rg --name cafeteria-cluster
```

### 4. Setup Azure Database for PostgreSQL

```bash
az postgres flexible-server create \
  --resource-group cafeteria-rg \
  --name cafeteria-db \
  --location eastus \
  --admin-user admin \
  --admin-password your-password \
  --sku-name Standard_D4s_v3 \
  --tier GeneralPurpose \
  --version 15 \
  --storage-size 128 \
  --high-availability Enabled \
  --zone 1
```

### 5. Setup Azure Cache for Redis

```bash
az redis create \
  --resource-group cafeteria-rg \
  --name cafeteria-redis \
  --location eastus \
  --sku Standard \
  --vm-size c1 \
  --enable-non-ssl-port
```

### 6. Install Application Gateway Ingress Controller

```bash
# Create Application Gateway
az network application-gateway create \
  --name cafeteria-appgw \
  --resource-group cafeteria-rg \
  --location eastus \
  --sku Standard_v2 \
  --capacity 2 \
  --vnet-name cafeteria-vnet \
  --subnet appgw-subnet \
  --public-ip-address cafeteria-pip

# Install AGIC
helm repo add application-gateway-kubernetes-ingress https://appgwingress.blob.core.windows.net/ingress-azure-helm-package/
helm install ingress-azure \
  application-gateway-kubernetes-ingress/ingress-azure \
  --namespace kube-system \
  --set appgw.name=cafeteria-appgw \
  --set appgw.resourceGroup=cafeteria-rg \
  --set appgw.subscriptionId=SUBSCRIPTION_ID \
  --set armAuth.type=servicePrincipal \
  --set armAuth.secretJSON=$(az ad sp create-for-rbac --sdk-auth | base64 -w0)
```

### 7. Deploy Application

```bash
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace \
  --set global.imageRegistry=cafeteriaacr.azurecr.io \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set-string postgresql.host=cafeteria-db.postgres.database.azure.com \
  --set-string redis.host=cafeteria-redis.redis.cache.windows.net
```

---

## Helm Chart Deployment

### 1. Add Helm Repositories

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### 2. Install Dependencies

```bash
cd helm/cafeteria-system
helm dependency update
```

### 3. Customize Values

Create `values-production.yaml`:

```yaml
global:
  imageRegistry: "your-registry.com"
  
orderGateway:
  replicaCount: 5
  autoscaling:
    maxReplicas: 30

postgresql:
  enabled: false
  external:
    host: "your-db-host"
    
redis:
  enabled: false
  external:
    host: "your-redis-host"
```

### 4. Install Chart

```bash
helm install cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --create-namespace \
  --values values-production.yaml
```

### 5. Upgrade Chart

```bash
helm upgrade cafeteria ./helm/cafeteria-system \
  --namespace cafeteria-system \
  --values values-production.yaml
```

---

## Predictive Scaling Setup

### 1. Deploy Predictive Scaler Service

```bash
kubectl apply -f k8s/deployments/predictive-scaler.yaml
```

### 2. Configure Historical Data Collection

```bash
# Create metrics history table
kubectl exec -it postgres-0 -n cafeteria-system -- psql -U cafeteria_user -d cafeteria_db

CREATE TABLE metrics_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  service_name VARCHAR(100),
  request_count INTEGER,
  cpu_usage DECIMAL(5,2),
  memory_usage DECIMAL(5,2),
  response_time_ms INTEGER
);

CREATE INDEX idx_metrics_timestamp ON metrics_history(timestamp);
CREATE INDEX idx_metrics_service ON metrics_history(service_name);
```

### 3. Configure Cron Schedules

The predictive scaler runs these schedules:

- **Every 5 minutes**: Collect current metrics
- **Every 15 minutes**: Update traffic predictions
- **5:00 PM daily**: Pre-warm caches (30 min before peak)
- **5:15 PM daily**: Pre-scale services (15 min before peak)
- **6:30 PM daily**: Scale down after peak
- **Midnight daily**: Evaluate prediction accuracy

### 4. Manual Operations

```bash
# Trigger cache warm-up
curl -X POST http://predictive-scaler:3007/warmup

# Get current predictions
curl http://predictive-scaler:3007/predictions

# Get scaling recommendations
curl http://predictive-scaler:3007/recommendations

# Manual scaling
curl -X POST http://predictive-scaler:3007/scale \
  -H "Content-Type: application/json" \
  -d '{"service": "order-gateway", "replicas": 10}'
```

---

## Monitoring & Observability

### 1. Install Prometheus Stack

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

### 2. Access Grafana

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Default credentials: admin / prom-operator
```

### 3. Import Dashboards

Import the pre-configured dashboards:
- `monitoring/grafana/dashboards/system-overview.json`
- `monitoring/grafana/dashboards/service-details.json`

---

## Cost Optimization

### 1. Use Spot/Preemptible Instances

**AWS**:
```bash
eksctl create nodegroup \
  --cluster=cafeteria-cluster \
  --spot \
  --instance-types=t3.large,t3a.large
```

**GCP**:
```bash
gcloud container node-pools create spot-pool \
  --cluster=cafeteria-cluster \
  --preemptible \
  --machine-type=n1-standard-4
```

**Azure**:
```bash
az aks nodepool add \
  --cluster-name cafeteria-cluster \
  --resource-group cafeteria-rg \
  --name spotpool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1
```

### 2. Right-Size Resources

Monitor and adjust resource requests/limits:

```bash
kubectl top pods -n cafeteria-system
kubectl top nodes
```

### 3. Use Managed Services

- Use managed databases (RDS, Cloud SQL, Azure Database)
- Use managed Redis (ElastiCache, Memorystore, Azure Cache)
- Use managed message queues (Amazon MQ, Cloud Pub/Sub, Azure Service Bus)

---

## Quick Start Commands

### AWS
```bash
eksctl create cluster -f k8s/cloud/aws/eks-cluster.yaml
aws eks update-kubeconfig --name cafeteria-cluster
helm install cafeteria ./helm/cafeteria-system -n cafeteria-system --create-namespace
```

### GCP
```bash
gcloud container clusters create cafeteria-cluster --region=us-central1 --num-nodes=3
gcloud container clusters get-credentials cafeteria-cluster
helm install cafeteria ./helm/cafeteria-system -n cafeteria-system --create-namespace
```

### Azure
```bash
az aks create --resource-group cafeteria-rg --name cafeteria-cluster
az aks get-credentials --resource-group cafeteria-rg --name cafeteria-cluster
helm install cafeteria ./helm/cafeteria-system -n cafeteria-system --create-namespace
```

---

## Support

For issues and questions:
- Check service logs: `kubectl logs -f <pod-name> -n cafeteria-system`
- Check events: `kubectl get events -n cafeteria-system`
- Describe resources: `kubectl describe <resource> <name> -n cafeteria-system`
