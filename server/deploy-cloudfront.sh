#!/bin/bash

# CloudFront Deployment Script for Elastic Beanstalk
# This script creates a CloudFront distribution in front of your EB app

set -e  # Exit on error

# Configuration
STACK_NAME="backend-35l-cloudfront"
TEMPLATE_FILE="cloudfront-setup.yml"
REGION="us-west-2"
EB_CNAME="35Lbackend-dev.us-west-2.elasticbeanstalk.com"
AWS_PROFILE="eb-cli"

echo "🚀 Deploying CloudFront for Elastic Beanstalk..."
echo "Stack Name: $STACK_NAME"
echo "EB Environment: $EB_CNAME"
echo "Region: $REGION"
echo "AWS Profile: $AWS_PROFILE"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or credentials invalid for profile: $AWS_PROFILE"
    echo "Please run: aws configure --profile $AWS_PROFILE"
    exit 1
fi

echo "✅ AWS CLI configured with profile: $AWS_PROFILE"

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ CloudFormation template not found: $TEMPLATE_FILE"
    exit 1
fi

echo "✅ CloudFormation template found"

# Deploy the stack
echo "📦 Deploying CloudFormation stack..."

aws cloudformation deploy \
    --template-file "$TEMPLATE_FILE" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        ElasticBeanstalkCNAME="$EB_CNAME" \
    --region "$REGION" \
    --profile "$AWS_PROFILE" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack deployed successfully!"
    
    # Get the CloudFront URL
    echo ""
    echo "📋 Getting CloudFront details..."
    
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
        --output text)
    
    CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
        --output text)
    
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --profile "$AWS_PROFILE" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    echo ""
    echo "🎉 CloudFront Distribution Created Successfully!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 CloudFront URL: $CLOUDFRONT_URL"
    echo "🌐 CloudFront Domain: $CLOUDFRONT_DOMAIN"
    echo "🆔 Distribution ID: $DISTRIBUTION_ID"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⏳ Note: CloudFront deployment takes 15-20 minutes to complete."
    echo "📝 You can check status at: https://console.aws.amazon.com/cloudfront/"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Wait for CloudFront distribution to deploy (Status: Deployed)"
    echo "2. Update your frontend to use the CloudFront URL above"
    echo "3. Update CORS settings in your FastAPI app if needed"
    echo "4. Test your HTTPS endpoint"
    
else
    echo "❌ Failed to deploy CloudFormation stack"
    exit 1
fi 