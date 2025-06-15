#!/bin/bash
# Post-processing script to apply authentication method to Kubernetes manifests
# Usage: ./apply-auth-method.sh <USE_SA_KEY> <processed_k8s_dir>

set -e

USE_SA_KEY=${1:-false}
PROCESSED_DIR=${2:-/workspace/processed_k8s}

echo "Applying authentication method: USE_SA_KEY=${USE_SA_KEY}"

if [ "${USE_SA_KEY}" = "true" ]; then
    echo "Configuring for Service Account JSON key authentication..."
    
    # Add environment variable and volume mounts for SA key
    for deployment_file in "${PROCESSED_DIR}"/03-*.yaml "${PROCESSED_DIR}"/04-*.yaml; do
        if [ -f "$deployment_file" ]; then
            echo "Processing $deployment_file for SA key authentication..."
            
            # Add GOOGLE_APPLICATION_CREDENTIALS environment variable
            sed -i '/- name: NODE_ENV/a \        - name: GOOGLE_APPLICATION_CREDENTIALS\n          value: "/var/secrets/google/key.json"' "$deployment_file"
            
            # Uncomment and add volume mounts
            sed -i 's/        # volumeMounts:/        volumeMounts:/' "$deployment_file"
            sed -i 's/        # - name: gcp-sa-key-volume/        - name: gcp-sa-key-volume/' "$deployment_file"
            sed -i 's/        #   mountPath: \/var\/secrets\/google/          mountPath: \/var\/secrets\/google/' "$deployment_file"
            sed -i 's/        #   readOnly: true/          readOnly: true/' "$deployment_file"
            
            # Uncomment and add volumes
            sed -i 's/      # volumes:/      volumes:/' "$deployment_file"
            sed -i 's/      # - name: gcp-sa-key-volume/      - name: gcp-sa-key-volume/' "$deployment_file"
            sed -i 's/      #   secret:/        secret:/' "$deployment_file"
            sed -i 's/      #     secretName: gcp-service-account-key/          secretName: gcp-service-account-key/' "$deployment_file"
            sed -i 's/      #     defaultMode: 0400/          defaultMode: 0400/' "$deployment_file"
            
            # Remove serviceAccountName since we're not using Workload Identity
            sed -i '/serviceAccountName: workload-identity-sa/d' "$deployment_file"
        fi
    done
    
    # Remove Workload Identity service account since it's not needed
    rm -f "${PROCESSED_DIR}/02-service-account.yaml" 2>/dev/null || true
    
else
    echo "Configuring for Workload Identity authentication..."
    
    # Remove commented volume mounts and volumes (they're not needed)
    for deployment_file in "${PROCESSED_DIR}"/03-*.yaml "${PROCESSED_DIR}"/04-*.yaml; do
        if [ -f "$deployment_file" ]; then
            echo "Processing $deployment_file for Workload Identity..."
            
            # Remove all commented volume-related lines
            sed -i '/# volumeMounts:/d' "$deployment_file"
            sed -i '/# - name: gcp-sa-key-volume/d' "$deployment_file"
            sed -i '/# volumes:/d' "$deployment_file"
            sed -i '/#   mountPath: \/var\/secrets\/google/d' "$deployment_file"
            sed -i '/#   readOnly: true/d' "$deployment_file"
            sed -i '/#   secret:/d' "$deployment_file"
            sed -i '/#     secretName: gcp-service-account-key/d' "$deployment_file"
            sed -i '/#     defaultMode: 0400/d' "$deployment_file"
        fi
    done
fi

echo "✓ Authentication method applied successfully"