#!/bin/bash

# OpenLearnX Backend - Automated Deployment Script
# Usage: ./deploy-backend.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/tmp/openlearnx_backend_deploy_$TIMESTAMP.log"

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

print_status "Starting OpenLearnX Backend Deployment"
print_status "Environment: $ENVIRONMENT"
print_status "Log file: $LOG_FILE"

# 1. Check prerequisites
print_status "Checking prerequisites..."
command -v python3 >/dev/null 2>&1 || { print_error "Python 3 not found"; exit 1; }
command -v git >/dev/null 2>&1 || { print_error "Git not found"; exit 1; }
print_success "Prerequisites verified"

# 2. Navigate to backend directory
cd "$BACKEND_DIR"
print_status "Working directory: $(pwd)"

# 3. Pull latest changes
print_status "Pulling latest changes from GitHub..."
git pull origin main 2>&1 | tee -a "$LOG_FILE" || { print_error "Git pull failed"; exit 1; }
print_success "Latest changes pulled"

# 4. Check/create virtual environment
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv || { print_error "Virtual environment creation failed"; exit 1; }
    print_success "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# 5. Activate virtual environment and install dependencies
print_status "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip setuptools wheel 2>&1 | grep -E "Successfully|Requirement" | tail -5 | tee -a "$LOG_FILE"
pip install -r ../requirements.txt flask flask-cors python-dotenv pymongo web3 pyjwt flask-jwt-extended requests python-dateutil pycryptodome motor 2>&1 | grep -E "Successfully|Requirement" | tail -10 | tee -a "$LOG_FILE"
print_success "Dependencies installed"

# 6. Check .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found!"
    print_status "Creating .env template..."
    cat > .env << 'EOF'
FLASK_ENV=production
DEBUG=False
SECRET_KEY=change-this-to-a-secure-key
JWT_SECRET_KEY=change-this-to-a-secure-jwt-key
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/openlearnx
WEB3_PROVIDER_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
CONTRACT_ADDRESS=0x...
EOF
    print_warning "Please update .env with your production values"
    exit 1
else
    print_status ".env file found"
fi

# 7. Check database connection
print_status "Testing MongoDB connection..."
python3 -c "
import os
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()
try:
    client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/openlearnx'))
    client.server_info()
    print('✅ MongoDB connection successful')
except Exception as e:
    print(f'❌ MongoDB connection failed: {e}')
    exit(1)
" 2>&1 | tee -a "$LOG_FILE" || { print_error "Database connection failed"; exit 1; }

# 8. Build smart contracts
print_status "Building smart contracts..."
export PATH="${FOUNDRY_BIN:-$HOME/.foundry/bin}:$PATH"
command -v forge >/dev/null 2>&1 || { print_error "forge not found (set FOUNDRY_BIN)"; exit 1; }
forge build 2>&1 | tail -5 | tee -a "$LOG_FILE"
[ "${PIPESTATUS[0]}" -eq 0 ] || { print_error "forge build failed"; exit 1; }
print_success "Smart contracts built"

# 9. Run tests (optional)
if [ "$ENVIRONMENT" = "staging" ]; then
    print_status "Running tests..."
    python3 -m pytest tests/ -v 2>&1 | tee -a "$LOG_FILE" || print_warning "Some tests failed"
fi

# 10. Create deployment backup
print_status "Creating deployment backup..."
BACKUP_DIR="/backups/openlearnx_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
cp .env "$BACKUP_DIR/.env.backup"
cp deployment.json "$BACKUP_DIR/deployment.json.backup" 2>/dev/null || true
print_success "Backup created at $BACKUP_DIR"

# 11. Stop existing process (if using PM2)
if command -v pm2 >/dev/null 2>&1; then
    print_status "Stopping existing PM2 process..."
    pm2 stop openlearnx-backend 2>/dev/null || print_warning "PM2 process not running"
fi

# 12. Start/restart service
if command -v pm2 >/dev/null 2>&1; then
    print_status "Starting with PM2..."
    pm2 start main.py --name openlearnx-backend --interpreter python3 2>&1 | tee -a "$LOG_FILE"
    pm2 save
    pm2 startup
    print_success "Backend started with PM2"
else
    print_status "PM2 not found. Start manually:"
    print_status "  cd $BACKEND_DIR && source venv/bin/activate && python3 main.py"
fi

# 13. Health check
print_status "Waiting 5 seconds for service to start..."
sleep 5

print_status "Running health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health || echo "failed")
if [[ "$HEALTH_RESPONSE" == *"health"* ]] || [[ "$HEALTH_RESPONSE" == *"{}"* ]]; then
    print_success "Health check passed"
else
    print_warning "Health check returned: $HEALTH_RESPONSE"
fi

# 14. Summary
print_success "=========================="
print_success "Backend Deployment Complete!"
print_success "=========================="
print_status "Environment: $ENVIRONMENT"
print_status "Backend URL: http://localhost:5000"
print_status "API URL: http://localhost:5000/api"
print_status "Log file: $LOG_FILE"
print_status "Backup location: $BACKUP_DIR"

# 15. Display recent logs (if using PM2)
if command -v pm2 >/dev/null 2>&1; then
    print_status "Recent logs:"
    pm2 logs openlearnx-backend --lines 10 --nostream 2>/dev/null || true
fi

print_success "Deployment successful!"
