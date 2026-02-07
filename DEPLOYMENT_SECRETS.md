# GitHub Secrets for AWS EKS Deployment

This document provides comprehensive guidelines on the required GitHub Secrets for deploying to AWS EKS (Elastic Kubernetes Service). Each secret must be set in the GitHub repository settings under Secrets & Variables.

## 1. AWS Credentials
These credentials are required to authenticate with AWS services:
- **AWS_ACCESS_KEY_ID**: Your AWS access key ID.
- **AWS_SECRET_ACCESS_KEY**: Your AWS secret access key.

## 2. ECR Registry
This secret allows the GitHub Actions workflow to push and pull Docker images from your Amazon ECR (Elastic Container Registry):
- **ECR_REGISTRY**: The URI of your ECR registry (e.g., `123456789012.dkr.ecr.us-west-2.amazonaws.com`).

## 3. EKS Cluster Configuration
To access your EKS cluster, set the following:
- **EKS_CLUSTER_NAME**: Name of your EKS cluster.
- **EKS_REGION**: The AWS region where your EKS cluster is located (e.g., `us-west-2`).

## 4. Aurora Database URL
If using Amazon Aurora, configure the URL as follows:
- **AURORA_DATABASE_URL**: The connection string for your Aurora database.

## 5. Manus OAuth Settings
For integrating with Manus, the OAuth settings must be established:
- **MANUS_CLIENT_ID**: Your Manus application client ID.
- **MANUS_CLIENT_SECRET**: Your Manus application client secret.

## 6. SMTP Email Configuration
To send emails via SMTP:
- **SMTP_HOST**: The SMTP server address.
- **SMTP_PORT**: The port number of the SMTP server (e.g., `587` for TLS).
- **SMTP_USER**: Username for SMTP authentication.
- **SMTP_PASSWORD**: Password for SMTP authentication.

## 7. IAM Policy Requirements
Ensure that the IAM roles used in your deployment have the necessary permissions to:
- Access EKS and manage resources.
- Push and pull to/from ECR.
- Manage Aurora databases.

This documentation should assist in setting up the necessary GitHub secrets for a successful deployment to AWS EKS.