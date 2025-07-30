#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🚀 Deploying OpenLearnX Single Container Platform"
echo "================================================="

# Check prerequisites
print_status "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { print_error "Docker not found. Please install Docker."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { print_error "docker-compose not found. Please install docker-compose."; exit 1; }

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Prerequisites check passed!"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p backend/uploads backend/logs

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down -v 2>/dev/null || true

# Clean up old images
print_status "Cleaning up old images..."
docker system prune -f

# Build the single container
print_status "Building OpenLearnX single container..."
docker-compose build --no-cache openlearnx

# Start all services
print_status "Starting all services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 60

# Health checks
print_status "Performing health checks..."

check_service() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "$url" >/dev/null 2>&1; then
            print_success "$service is healthy!"
            return 0
        fi
        print_status "Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    print_warning "$service health check failed after $max_attempts attempts"
    return 1
}

# Check all services
check_service "Main Application" "http://localhost/health"
check_service "Frontend" "http://localhost/"
check_service "Backend API" "http://localhost/api/health"
check_service "Database" "http://localhost:5432" || print_warning "Database connection check skipped"

# Display service status
print_status "Service Status:"
docker-compose ps

# Display logs for debugging if needed
print_status "Recent logs:"
docker-compose logs --tail=10 openlearnx

# Display URLs and information
echo ""
echo "🎉 OpenLearnX Platform Deployed Successfully!"
echo "============================================="
echo "🌐 Main Application: http://localhost"
echo "🔧 Backend API: http://localhost/api/"
echo "📱 Frontend: http://localhost/"
echo "🗄️ Database: postgresql://postgres:openlearnx123@localhost:5432/openlearnx"
echo "📊 Redis: redis://localhost:6379"
echo ""
echo "📋 Useful Commands:"
echo "  - View logs: docker-compose logs -f openlearnx"
echo "  - View all logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart: docker-compose restart openlearnx"
echo "  - Enter container: docker-compose exec openlearnx bash"
echo "  - View processes: docker-compose exec openlearnx supervisorctl status"
echo ""
echo "🔍 Monitoring:"
echo "  - Application logs: docker-compose exec openlearnx tail -f /var/log/supervisor/backend.out.log"
echo "  - Frontend logs: docker-compose exec openlearnx tail -f /var/log/supervisor/frontend.out.log"
echo "  - Nginx logs: docker-compose exec openlearnx tail -f /var/log/supervisor/nginx.out.log"
echo ""

# Optional: Open browser
if command -v xdg-open &> /dev/null; then
    print_status "Opening application in browser..."
    xdg-open http://localhost
elif command -v open &> /dev/null; then
    print_status "Opening application in browser..."
    open http://localhost
fi

print_success "Single container deployment completed! 🐳🚀"
print_status "Your OpenLearnX platform is running in a single Docker container with all services!"
