#!/bin/bash

# OpenLearnX Frontend - Automated Deployment Script
# Usage: ./deploy-frontend.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/tmp/openlearnx_frontend_deploy_$TIMESTAMP.log"

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

print_status "Starting OpenLearnX Frontend Deployment"
print_status "Environment: $ENVIRONMENT"
print_status "Log file: $LOG_FILE"

# 1. Check prerequisites
print_status "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { print_error "Node.js not found"; exit 1; }
command -v git >/dev/null 2>&1 || { print_error "Git not found"; exit 1; }

# Check for pnpm or npm
if command -v pnpm >/dev/null 2>&1; then
    PACKAGE_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
    PACKAGE_MANAGER="npm"
else
    print_error "Neither pnpm nor npm found"
    exit 1
fi

print_success "Prerequisites verified (using $PACKAGE_MANAGER)"

# 2. Navigate to frontend directory
cd "$FRONTEND_DIR"
print_status "Working directory: $(pwd)"

# 3. Pull latest changes
print_status "Pulling latest changes from GitHub..."
git pull origin main 2>&1 | tee -a "$LOG_FILE" || { print_error "Git pull failed"; exit 1; }
print_success "Latest changes pulled"

# 4. Check .env.local file
if [ ! -f ".env.local" ]; then
    print_warning ".env.local file not found!"
    print_status "Creating .env.local template..."
    cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.openlearnx.com
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
EOF
    print_warning "Please update .env.local with your production values"
    exit 1
else
    print_status ".env.local file found"
fi

# 5. Clean previous build
print_status "Cleaning previous build..."
rm -rf .next node_modules 2>/dev/null || true
print_success "Previous build cleaned"

# 6. Install dependencies
print_status "Installing dependencies with $PACKAGE_MANAGER..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install --frozen-lockfile 2>&1 | tail -10 | tee -a "$LOG_FILE"
else
    npm ci 2>&1 | tail -10 | tee -a "$LOG_FILE"
fi
print_success "Dependencies installed"

# 7. Build application
print_status "Building Next.js application..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm build 2>&1 | tee -a "$LOG_FILE"
else
    npm run build 2>&1 | tee -a "$LOG_FILE"
fi
print_success "Build completed"

# 8. Create deployment backup
print_status "Creating deployment backup..."
BACKUP_DIR="/backups/openlearnx_frontend_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
cp .env.local "$BACKUP_DIR/.env.local.backup"
cp -r .next "$BACKUP_DIR/.next.backup" 2>/dev/null || true
print_success "Backup created at $BACKUP_DIR"

# 9. Stop existing process (if using PM2)
if command -v pm2 >/dev/null 2>&1; then
    print_status "Stopping existing PM2 process..."
    pm2 stop openlearnx-frontend 2>/dev/null || print_warning "PM2 process not running"
fi

# 10. Start/restart service
if command -v pm2 >/dev/null 2>&1; then
    print_status "Starting with PM2..."
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pm2 start "pnpm start" --name openlearnx-frontend 2>&1 | tee -a "$LOG_FILE"
    else
        pm2 start "npm start" --name openlearnx-frontend 2>&1 | tee -a "$LOG_FILE"
    fi
    pm2 save
    pm2 startup
    print_success "Frontend started with PM2"
else
    print_status "PM2 not found. Start manually:"
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        print_status "  cd $FRONTEND_DIR && pnpm start"
    else
        print_status "  cd $FRONTEND_DIR && npm start"
    fi
fi

# 11. Health check
print_status "Waiting 10 seconds for service to start..."
sleep 10

print_status "Running health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000 2>&1 | head -c 200)
if [[ "$HEALTH_RESPONSE" == *"<!DOCTYPE"* ]] || [[ "$HEALTH_RESPONSE" == *"<html"* ]]; then
    print_success "Health check passed"
else
    print_warning "Health check returned limited response"
fi

# 12. Generate sitemap and robots.txt (optional)
if [ -f "public/robots.txt" ]; then
    print_status "Robots.txt already exists"
else
    print_status "Creating robots.txt..."
    mkdir -p public
    cat > public/robots.txt << 'EOF'
User-agent: *
Allow: /
Sitemap: https://openlearnx.com/sitemap.xml
EOF
    print_success "Robots.txt created"
fi

# 13. Summary
print_success "=========================="
print_success "Frontend Deployment Complete!"
print_success "=========================="
print_status "Environment: $ENVIRONMENT"
print_status "Frontend URL: http://localhost:3000"
print_status "Build directory: .next"
print_status "Log file: $LOG_FILE"
print_status "Backup location: $BACKUP_DIR"

# 14. Display recent logs (if using PM2)
if command -v pm2 >/dev/null 2>&1; then
    print_status "Recent logs:"
    pm2 logs openlearnx-frontend --lines 10 --nostream 2>/dev/null || true
fi

print_success "Deployment successful!"
