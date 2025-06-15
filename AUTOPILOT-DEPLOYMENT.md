# Regional Autopilot GKE Deployment Guide

This guide covers the improved CI/CD pipeline and Kubernetes configuration for deploying to a regional GKE Autopilot cluster with minimal manual setup.

## 🎯 **Key Improvements**

### 1. **Regional Autopilot Support**
- ✅ Regional cluster connectivity (`--region` instead of `--zone`)
- ✅ Autopilot-optimized resource requests/limits
- ✅ Enhanced health checks and scaling policies
- ✅ Security contexts for non-root execution

### 2. **Flexible Authentication**
- ✅ **Workload Identity** (recommended, secure)
- ✅ **Service Account JSON Key** (traditional, requested option)
- ✅ Automatic configuration based on `_USE_SA_KEY` setting

### 3. **Automated Infrastructure Setup**
- ✅ Idempotent service account creation
- ✅ IAM policy binding automation
- ✅ Kubernetes secret management
- ✅ Minimal manual preparation required

### 4. **Enhanced CI/CD Pipeline**
- ✅ Robust change detection (handles merge commits)
- ✅ Blocking security vulnerability scans
- ✅ Parameterized configuration via substitutions
- ✅ Environment variable substitution for manifests

## 🚀 **Quick Start**

### Option 1: Workload Identity (Recommended)
```bash
# 1. Create regional Autopilot cluster
gcloud container clusters create-auto media-understanding-cluster \
  --region=us-central1 \
  --workload-pool=PROJECT_ID.svc.id.goog

# 2. Submit build with Workload Identity
gcloud builds submit \
  --config=cloudbuild-autopilot.yaml \
  --substitutions=_USE_SA_KEY=false,_GKE_CLUSTER=media-understanding-cluster,_GKE_REGION=us-central1
```

### Option 2: Service Account JSON Key
```bash
# 1. Create regional Autopilot cluster
gcloud container clusters create-auto media-understanding-cluster \
  --region=us-central1

# 2. Submit build with SA key authentication
gcloud builds submit \
  --config=cloudbuild-autopilot.yaml \
  --substitutions=_USE_SA_KEY=true,_GKE_CLUSTER=media-understanding-cluster,_GKE_REGION=us-central1
```

## ⚙️ **Configuration Options**

### Cloud Build Substitutions

| Variable | Default | Description |
|----------|---------|-------------|
| `_GKE_CLUSTER` | `media-understanding-cluster` | GKE cluster name |
| `_GKE_REGION` | `us-central1` | GKE cluster region |
| `_USE_SA_KEY` | `false` | Authentication method (`true`=SA key, `false`=Workload Identity) |
| `_K8S_NAMESPACE` | `media-understanding` | Kubernetes namespace |
| `_SERVICE_ACCOUNT_NAME` | `media-understanding-sa` | GCP service account name |
| `_CONTAINER_REGISTRY` | `gcr.io` | Container registry URL |
| `_MAIN_BRANCH` | `main` | Main git branch for change detection |

### Example: Custom Configuration
```bash
gcloud builds submit \
  --config=cloudbuild-autopilot.yaml \
  --substitutions=\
_GKE_CLUSTER=my-cluster,\
_GKE_REGION=europe-west1,\
_K8S_NAMESPACE=production,\
_USE_SA_KEY=false,\
_CONTAINER_REGISTRY=europe-west1-docker.pkg.dev
```

## 🔒 **Authentication Methods Comparison**

### Workload Identity (Recommended) ✅
```yaml
_USE_SA_KEY: 'false'
```

**Pros:**
- 🔐 **Most Secure**: No long-lived credentials
- 🔄 **Automatic Rotation**: Google manages credential lifecycle
- 🎯 **Fine-grained Access**: Scoped to specific K8s service account
- 📈 **Best Practice**: Google's recommended approach

**Cons:**
- 🏗️ **GKE-specific**: Requires Workload Identity-enabled cluster

### Service Account JSON Key ⚠️
```yaml
_USE_SA_KEY: 'true'
```

**Pros:**
- 🔄 **Portable**: Works across different K8s environments
- 📋 **Simple**: Traditional authentication method

**Cons:**
- ⚠️ **Security Risk**: Long-lived credentials in cluster
- 🔄 **Manual Rotation**: Requires manual key rotation process
- 📊 **Audit Complexity**: Harder to track credential usage

## 📊 **Autopilot Resource Optimization**

### Resource Allocation Strategy
```yaml
# Image Understanding (light workload)
resources:
  requests:
    cpu: 250m      # $6.73/month
    memory: 512Mi  # $2.19/month
  limits:
    cpu: 250m      # Same as requests
    memory: 512Mi  # Same as requests

# Video Understanding (heavy workload) 
resources:
  requests:
    cpu: 500m      # $13.46/month
    memory: 1Gi    # $4.37/month
  limits:
    cpu: 500m      # Same as requests
    memory: 1Gi    # Same as requests
```

**Cost Calculation (per replica):**
- **Image Understanding**: ~$8.92/month
- **Video Understanding**: ~$17.83/month
- **Total (2 replicas each)**: ~$53.50/month

## 🔧 **Manual Setup (One-time)**

### 1. Create GKE Autopilot Cluster
```bash
# Regional Autopilot cluster
gcloud container clusters create-auto ${CLUSTER_NAME} \
  --region=${REGION} \
  --workload-pool=${PROJECT_ID}.svc.id.goog \
  --enable-autorepair \
  --enable-autoupgrade
```

### 2. Grant Cloud Build Permissions
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountAdmin"

# For SA key method only
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/secretmanager.admin"
```

### 3. Setup Cloud Build Triggers
```bash
# Main pipeline trigger
gcloud builds triggers create github \
  --repo-name=next-realtime-mask \
  --repo-owner=your-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-autopilot.yaml \
  --substitutions=_USE_SA_KEY=false,_GKE_CLUSTER=media-understanding-cluster
```

## 🔍 **Monitoring & Troubleshooting**

### Health Check Endpoints
```bash
# Check application health
kubectl get pods -n media-understanding
kubectl logs -f deployment/image-understanding -n media-understanding

# Test health endpoints
kubectl port-forward svc/image-understanding-svc 8080:80 -n media-understanding
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

### Scaling Monitoring
```bash
# Monitor HPA status
kubectl get hpa -n media-understanding

# Check resource usage
kubectl top pods -n media-understanding

# View scaling events
kubectl describe hpa image-understanding-hpa -n media-understanding
```

### Common Issues

**1. Authentication Failures**
```bash
# For Workload Identity
kubectl describe serviceaccount workload-identity-sa -n media-understanding

# For SA Key
kubectl get secret gcp-service-account-key -n media-understanding
```

**2. Resource Issues**
```bash
# Check if pods are being scheduled
kubectl describe pods -n media-understanding

# View Autopilot node provisioning
kubectl get nodes -o wide
```

**3. Ingress Issues**
```bash
# Check ingress status
kubectl describe ingress media-understanding-ingress -n media-understanding

# View backend health
gcloud compute backend-services list
```

## 🔄 **Migration from Existing Setup**

### From Original cloudbuild.yaml
1. **Backup current configuration**
2. **Update cluster to regional Autopilot**
3. **Switch to new pipeline**: `cloudbuild-autopilot.yaml`
4. **Choose authentication method**
5. **Update DNS/domain configuration**

### From Workload Identity to SA Key
```bash
# Build with SA key enabled
gcloud builds submit \
  --config=cloudbuild-autopilot.yaml \
  --substitutions=_USE_SA_KEY=true
```

### From SA Key to Workload Identity
```bash
# Clean up SA key secrets
kubectl delete secret gcp-service-account-key -n media-understanding

# Build with Workload Identity
gcloud builds submit \
  --config=cloudbuild-autopilot.yaml \
  --substitutions=_USE_SA_KEY=false
```

## 📈 **Production Considerations**

### Security
- ✅ Use Workload Identity for production
- ✅ Enable Pod Security Standards
- ✅ Regular vulnerability scanning
- ✅ Network policies for traffic isolation

### Performance
- 📊 Monitor resource utilization and adjust requests
- 🔄 Tune HPA settings based on traffic patterns
- 🌐 Use CDN for static assets
- 📈 Consider regional load balancing

### Cost Optimization
- 💰 Right-size resource requests based on actual usage
- 📉 Use preemptible instances for non-critical workloads
- 🕒 Implement time-based scaling for predictable traffic
- 📊 Regular cost analysis and optimization

This improved deployment strategy provides a production-ready, secure, and cost-effective solution for running media understanding workloads on GKE Autopilot.