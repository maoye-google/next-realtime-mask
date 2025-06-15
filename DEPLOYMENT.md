# Deployment Guide: GCP Cloud Build CI/CD Pipeline

This guide covers setting up automated CI/CD for the media understanding applications using GCP Cloud Build and GKE.

## 🏗️ **Architecture Overview**

**Production Strategy:**
- **React Applications**: Optimized builds with Vite, served by Node.js BFF servers
- **Containerization**: Multi-stage Docker builds with security hardening
- **Orchestration**: Kubernetes on GKE with Workload Identity
- **CI/CD**: Cloud Build with automated testing, security scanning, and deployment

## 📋 **Prerequisites**

1. **GCP Project** with billing enabled
2. **APIs Enabled**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable container.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```
3. **GKE Cluster** with Workload Identity enabled:
   ```bash
   gcloud container clusters create media-understanding-cluster \
     --workload-pool=$PROJECT_ID.svc.id.goog \
     --zone=us-central1-a \
     --num-nodes=3
   ```

## 🚀 **Cloud Build Setup**

### 1. Configure Cloud Build Triggers

Create automated triggers for each service:

```bash
# Trigger for both services (main pipeline)
gcloud builds triggers create github \
  --repo-name=next-realtime-mask \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --name=media-understanding-main

# Individual service triggers for development
gcloud builds triggers create github \
  --repo-name=next-realtime-mask \
  --repo-owner=your-github-username \
  --branch-pattern="^develop$" \
  --build-config=image-understanding/cloudbuild.yaml \
  --included-files="image-understanding/**" \
  --name=image-understanding-develop

gcloud builds triggers create github \
  --repo-name=next-realtime-mask \
  --repo-owner=your-github-username \
  --branch-pattern="^develop$" \
  --build-config=video-understanding/cloudbuild.yaml \
  --included-files="video-understanding/**" \
  --name=video-understanding-develop
```

### 2. Grant Cloud Build Permissions

```bash
# Get Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

## 🔒 **Security Configuration**

### 1. Set up Workload Identity

```bash
# Create GCP Service Account
gcloud iam service-accounts create media-understanding-sa \
  --display-name="Media Understanding Service Account"

# Grant Gemini AI permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:media-understanding-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Bind to Kubernetes Service Account
gcloud iam service-accounts add-iam-policy-binding \
  media-understanding-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[media-understanding/workload-identity-sa]"
```

### 2. Create Secrets

```bash
# Copy the template and add your API key
cp k8s/01-secrets.yaml.template k8s/01-secrets.yaml

# Edit the file to add your actual GEMINI_API_KEY
# IMPORTANT: Never commit this file to Git!

# Apply the secret
kubectl apply -f k8s/01-secrets.yaml
```

## 📦 **Deployment Process**

### Automated Deployment (Recommended)

1. **Push to main branch** - Triggers full deployment pipeline
2. **Push to develop branch** - Triggers individual service builds
3. **Monitor in Cloud Build console**

### Manual Deployment

```bash
# Build and deploy specific service
gcloud builds submit --config=image-understanding/cloudbuild.yaml ./image-understanding

# Build and deploy both services
gcloud builds submit --config=cloudbuild.yaml .
```

### Rollback Process

```bash
# List recent deployments
kubectl rollout history deployment/image-understanding -n media-understanding

# Rollback to previous version
kubectl rollout undo deployment/image-understanding -n media-understanding

# Rollback to specific revision
kubectl rollout undo deployment/image-understanding --to-revision=2 -n media-understanding
```

## 🔍 **Monitoring & Troubleshooting**

### Health Checks

```bash
# Check pod status
kubectl get pods -n media-understanding

# Check service endpoints
kubectl get services -n media-understanding

# View logs
kubectl logs -f deployment/image-understanding -n media-understanding
kubectl logs -f deployment/video-understanding -n media-understanding
```

### Common Issues

**1. Image Pull Errors**
- Verify image exists in Container Registry
- Check Cloud Build logs for build failures

**2. Authentication Errors**
- Verify Workload Identity configuration
- Check secret values and ConfigMap data

**3. Resource Issues**
- Monitor resource usage: `kubectl top pods -n media-understanding`
- Adjust resource limits in deployment manifests

## 🎛️ **Environment Management**

### Configuration Variables

Update these files for environment-specific configurations:

- `k8s/02-configmap.yaml` - Non-sensitive configuration
- `k8s/01-secrets.yaml` - API keys and sensitive data
- `k8s/05-ingress.yaml` - Domain and routing configuration

### Scaling

```bash
# Manual scaling
kubectl scale deployment image-understanding --replicas=5 -n media-understanding

# Update HPA targets
kubectl patch hpa image-understanding-hpa -n media-understanding -p '{"spec":{"maxReplicas":20}}'
```

## 🚦 **Production Checklist**

- [ ] Workload Identity configured
- [ ] Secrets properly managed (not in Git)
- [ ] Resource limits set appropriately
- [ ] Health checks responding
- [ ] Ingress configured with SSL
- [ ] Monitoring and alerting set up
- [ ] Backup and disaster recovery plan
- [ ] Security scanning enabled in CI/CD

## 📊 **Performance Optimization**

### React Application Optimizations

The applications are configured with:
- **Code Splitting**: Automatic with Vite
- **Asset Caching**: Long-term caching for static assets
- **Compression**: Gzip enabled for text assets
- **Security Headers**: XSS protection, content type validation

### Kubernetes Optimizations

- **Resource Requests/Limits**: Defined for proper scheduling
- **Horizontal Pod Autoscaling**: Automatic scaling based on CPU/memory
- **Node Affinity**: Can be configured for optimal pod placement
- **Pod Disruption Budgets**: Maintain availability during updates

This deployment strategy provides a robust, scalable, and secure foundation for production workloads.