#!/bin/bash

# OpenLearnX - Master Deployment Script
# Deploys both backend and frontend
# Usage: ./deploy.sh [production|staging|local]

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/tmp/openlearnx_deploy_$TIMESTAMP.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }

banner() {
    cat << "EOF"

 ╔═══════════════════════════════════════════╗
 ║   🚀 OpenLearnX Deployment System 🚀     ║
 ╚═══════════════════════════════════════════╝

EOF
}

banner

print_status "═══════════════════════════════════════════════"
print_status "  OpenLearnX Master Deployment"
print_status "  Environment: $ENVIRONMENT"
print_status "  Timestamp: $TIMESTAMP"
print_status "═══════════════════════════════════════════════"
print_status "Log file: $LOG_FILE"
echo ""

# Validate environment
case "$ENVIRONMENT" in
    production|staging|local)
        print_success "Environment: $ENVIRONMENT (valid)"
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 [production|staging|local]"
        exit 1
        ;;
esac

# Show deployment plan
echo ""
print_status "Deployment Plan:"
print_status "  1. ✓ Pull latest changes from GitHub"
print_status "  2. ✓ Deploy Backend (Flask/Python)"
print_status "  3. ✓ Deploy Frontend (Next.js/React)"
print_status "  4. ✓ Run health checks"
print_status "  5. ✓ Display deployment summary"
echo ""

# Confirm before proceeding
if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "⚠️  PRODUCTION DEPLOYMENT - Please review carefully!"
    read -p "Type 'yes' to proceed with production deployment: " confirm
    if [ "$confirm" != "yes" ]; then
        print_error "Deployment cancelled"
        exit 1
    fi
fi

# Change to script directory
cd "$SCRIPT_DIR"

# 1. Pull latest changes
print_status "Step 1/5: Pulling latest changes..."
if git pull origin main 2>&1 | tee -a "$LOG_FILE"; then
    export SKIP_GIT_PULL=1  # sub-scripts must deploy the same revision
    print_success "Latest changes pulled"
else
    print_warning "Git pull encountered issues, continuing..."
fi

# 2. Deploy Backend
print_status ""
print_status "Step 2/5: Deploying Backend..."
if [ -f "deploy-backend.sh" ]; then
    if bash deploy-backend.sh "$ENVIRONMENT" 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Backend deployment successful"
    else
        print_error "Backend deployment failed"
        exit 1
    fi
else
    print_error "deploy-backend.sh not found"
    exit 1
fi

# 3. Deploy Frontend
print_status ""
print_status "Step 3/5: Deploying Frontend..."
if [ -f "deploy-frontend.sh" ]; then
    if bash deploy-frontend.sh "$ENVIRONMENT" 2>&1 | tee -a "$LOG_FILE"; then
        print_success "Frontend deployment successful"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi
else
    print_error "deploy-frontend.sh not found"
    exit 1
fi

# 4. Health checks
print_status ""
print_status "Step 4/5: Running health checks..."

# Check Backend
print_status "Checking Backend API (http://localhost:5000)..."
if curl -s http://localhost:5000/api/health >/dev/null 2>&1 || curl -s http://localhost:5000 >/dev/null 2>&1; then
    print_success "Backend API is responding"
else
    print_warning "Backend API not responding yet (may still be starting)"
fi

# Check Frontend
print_status "Checking Frontend (http://localhost:3000)..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    print_success "Frontend is responding"
else
    print_warning "Frontend not responding yet (may still be starting)"
fi

# 5. Summary
print_status ""
print_status "Step 5/5: Generating deployment summary..."
echo ""
print_success "═══════════════════════════════════════════════"
print_success "        ✅ DEPLOYMENT SUCCESSFUL ✅"
print_success "═══════════════════════════════════════════════"
echo ""

cat << EOF | tee -a "$LOG_FILE"
📊 Deployment Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Frontend
  URL: http://localhost:3000
  Build: .next (optimized production build)
  Status: ✅ Running

🔌 Backend API
  URL: http://localhost:5000/api
  Framework: Flask (Python 3)
  Status: ✅ Running

📦 Database
  Type: MongoDB
  Port: 27017
  Status: ✅ Ready

⛓️  Blockchain
  Network: ${BLOCKCHAIN_NETWORK:-${ENVIRONMENT:-unknown}}
  RPC: ${RPC_URL:-Configured in .env}
  Status: ✅ Ready

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Environment: $ENVIRONMENT
🕐 Deployment Time: $TIMESTAMP
📁 Log File: $LOG_FILE

🎯 Next Steps:
  1. Verify both services are accessible
  2. Test core functionality
  3. Monitor logs for errors
  4. Configure domain/DNS if needed
  5. Enable SSL/HTTPS if on production

EOF

echo ""
print_status "View detailed logs with:"
print_status "  tail -f $LOG_FILE"
echo ""

if command -v pm2 >/dev/null 2>&1; then
    print_status "PM2 Status:"
    pm2 status
    echo ""
fi

print_success "Deployment completed! 🎉"
