# Kubernetes Deployment Guide

This directory contains Kubernetes manifests for deploying the spatial understanding applications to GKE.

## Prerequisites

1. **GKE Cluster**: Create a GKE cluster with Workload Identity enabled
2. **Container Registry**: Ensure you have access to Google Container Registry (gcr.io)
3. **Domain**: Optional - configure your domain for the ingress

## Setup Instructions

### 1. Build and Push Images

```bash
# Set your project ID
export PROJECT_ID=your-gcp-project-id

# Build images
docker build -t gcr.io/$PROJECT_ID/image-understanding:v1.0.0 ./image-understanding
docker build -t gcr.io/$PROJECT_ID/video-understanding:v1.0.0 ./video-understanding

# Push images
docker push gcr.io/$PROJECT_ID/image-understanding:v1.0.0
docker push gcr.io/$PROJECT_ID/video-understanding:v1.0.0
```

### 2. Setup Workload Identity

```bash
# Create GCP Service Account
gcloud iam service-accounts create spatial-understanding-sa \
  --display-name="Spatial Understanding Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:spatial-understanding-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create Kubernetes Service Account binding
gcloud iam service-accounts add-iam-policy-binding \
  spatial-understanding-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[spatial-understanding/workload-identity-sa]"
```

### 3. Update Configuration

Edit the following files with your project-specific values:

- Copy `01-secrets.yaml.template` to `01-secrets.yaml` and add your actual Gemini API key
- `02-configmap.yaml`: Update PROJECT_ID
- `03-image-understanding.yaml`: Replace PROJECT_ID in image name
- `04-video-understanding.yaml`: Replace PROJECT_ID in image name
- `05-ingress.yaml`: Update domain name
- `07-workload-identity.yaml`: Replace PROJECT_ID

**IMPORTANT**: Never commit `01-secrets.yaml` to version control. Add it to `.gitignore`.

### 4. Deploy to GKE

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n spatial-understanding
kubectl get services -n spatial-understanding
kubectl get ingress -n spatial-understanding
```

### 5. Setup SSL Certificate (Optional)

```bash
# Create managed SSL certificate
gcloud compute ssl-certificates create spatial-understanding-ssl \
  --domains=your-domain.com

# Reserve static IP
gcloud compute addresses create spatial-understanding-ip --global
```

## Architecture

- **Namespace**: `spatial-understanding`
- **Services**: 
  - `image-understanding`: Port 8080 (Node.js + Express)
  - `video-understanding`: Port 8080 (Node.js + Express)
- **Ingress**: Routes `/image/*` and `/video/*` paths
- **Autoscaling**: HPA configured for both services (2-10 replicas)
- **Security**: Workload Identity for GCP authentication

## Monitoring

```bash
# View logs
kubectl logs -f deployment/image-understanding -n spatial-understanding
kubectl logs -f deployment/video-understanding -n spatial-understanding

# Check resource usage
kubectl top pods -n spatial-understanding

# View HPA status
kubectl get hpa -n spatial-understanding
```

## Troubleshooting

1. **Pod not starting**: Check logs and ensure images are accessible
2. **Authentication errors**: Verify Workload Identity setup and API keys
3. **Ingress not working**: Check SSL certificate and DNS configuration
4. **High resource usage**: Adjust resource limits in deployment manifests