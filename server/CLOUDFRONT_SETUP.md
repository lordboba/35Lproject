# CloudFront Setup for Elastic Beanstalk

This guide will help you set up CloudFront in front of your Elastic Beanstalk application to enable HTTPS.

## Overview

- **Current Setup**: FastAPI app on Elastic Beanstalk (HTTP only)
- **Goal**: Add CloudFront for HTTPS termination
- **EB Environment**: `35Lbackend-dev.us-west-2.elasticbeanstalk.com`

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Elastic Beanstalk app deployed** (✅ already done)
3. **Permissions needed**:
   - CloudFormation: Create/Update/Delete stacks
   - CloudFront: Create/Update distributions
   - IAM: Pass role (for CloudFormation)

## Quick Setup (Automated)

### Option 1: Using the Deployment Script

1. **Make the script executable**:
   ```bash
   chmod +x deploy-cloudfront.sh
   ```

2. **Run the deployment**:
   ```bash
   ./deploy-cloudfront.sh
   ```

3. **Wait for deployment** (15-20 minutes)

4. **Update your frontend** to use the new CloudFront URL

### Option 2: Manual AWS CLI Deployment

```bash
# Deploy the CloudFormation stack
aws cloudformation deploy \
    --template-file cloudfront-setup.yml \
    --stack-name 35l-backend-cloudfront \
    --parameter-overrides ElasticBeanstalkCNAME=35Lbackend-dev.us-west-2.elasticbeanstalk.com \
    --region us-west-2 \
    --capabilities CAPABILITY_IAM

# Get the CloudFront URL
aws cloudformation describe-stacks \
    --stack-name 35l-backend-cloudfront \
    --region us-west-2 \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
    --output text
```

## Manual Setup (AWS Console)

If you prefer using the AWS Console:

### Step 1: Create CloudFront Distribution

1. **Go to CloudFront Console**: https://console.aws.amazon.com/cloudfront/
2. **Click "Create Distribution"**
3. **Configure Origin**:
   - **Origin Domain**: `35Lbackend-dev.us-west-2.elasticbeanstalk.com`
   - **Protocol**: HTTP Only
   - **HTTP Port**: 80
   - **Add custom header**: `X-Forwarded-Proto: https`

### Step 2: Configure Behaviors

1. **Default Behavior**:
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache Policy**: CachingDisabled (for API)
   - **Origin Request Policy**: CORS-S3Origin
   - **Compress Objects**: Yes

2. **Static Assets Behavior** (optional):
   - **Path Pattern**: `/static/*`
   - **Cache Policy**: CachingOptimized
   - **TTL**: 1 day

### Step 3: Configure SSL

1. **SSL Certificate**: Use CloudFront default certificate
2. **Security Policy**: TLSv1.2_2021

## Post-Deployment Steps

### 1. Deploy Updated FastAPI Code

After updating `main.py` with CloudFront support:

```bash
eb deploy
```

### 2. Test Your Setup

```bash
# Test health endpoint
curl https://YOUR_CLOUDFRONT_DOMAIN/health

# Test API endpoint
curl https://YOUR_CLOUDFRONT_DOMAIN/your-api-endpoint
```

### 3. Update Frontend Configuration

Update your frontend application to use the CloudFront URL instead of the direct EB URL.

**Before**:
```javascript
const API_URL = 'http://35Lbackend-dev.us-west-2.elasticbeanstalk.com';
```

**After**:
```javascript
const API_URL = 'https://YOUR_CLOUDFRONT_DOMAIN';
```

## Configuration Details

### CloudFront Features Enabled

- ✅ **HTTPS Termination**: CloudFront handles SSL/TLS
- ✅ **HTTP to HTTPS Redirect**: All HTTP requests redirect to HTTPS
- ✅ **CORS Support**: Headers forwarded correctly
- ✅ **API Optimization**: No caching for API responses
- ✅ **Compression**: Gzip compression enabled
- ✅ **Security Headers**: Added via FastAPI middleware

### FastAPI Updates Made

- ✅ **CORS Configuration**: Added CloudFront domains
- ✅ **X-Forwarded-Proto**: Middleware to handle HTTPS detection
- ✅ **Security Headers**: HSTS, X-Frame-Options, etc.
- ✅ **Health Check**: `/health` endpoint for monitoring

## Troubleshooting

### Common Issues

1. **CloudFront returns 504 errors**:
   - Check EB environment is healthy: `eb health`
   - Verify origin domain is correct

2. **CORS errors from frontend**:
   - Ensure CloudFront domain is in CORS `allow_origins`
   - Check browser dev tools for exact error

3. **SSL certificate issues**:
   - Default CloudFront certificate should work
   - For custom domains, certificate must be in us-east-1

### Useful Commands

```bash
# Check EB status
eb status

# Check CloudFront distribution status
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# Invalidate CloudFront cache (if needed)
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"

# Delete the CloudFormation stack (cleanup)
aws cloudformation delete-stack --stack-name 35l-backend-cloudfront --region us-west-2
```

## Cost Considerations

- **CloudFront**: ~$0.085 per GB (first 10TB/month)
- **SSL Certificate**: Free with CloudFront default certificate
- **Requests**: ~$0.0075 per 10,000 requests
- **Estimated monthly cost**: $5-50 depending on traffic

## Security Features

- **TLS 1.2+**: Modern encryption
- **HSTS**: HTTP Strict Transport Security
- **Security Headers**: XSS protection, content type sniffing protection
- **Origin Protection**: Direct EB access still possible (consider restricting)

## Next Steps (Optional)

1. **Custom Domain**: Add your own domain with Route 53
2. **WAF**: Add Web Application Firewall for additional security
3. **Origin Restriction**: Restrict EB to only accept CloudFront traffic
4. **Monitoring**: Set up CloudWatch alarms for distribution metrics 