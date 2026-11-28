# OpenLearnX Development Guide

**Last Updated:** May 12, 2026  
**Status:** All services operational

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- MongoDB 4.4+
- Foundry (Anvil)

### One-Command Setup
```bash
# Terminal 1: Start MongoDB
mongod --dbpath ~/mongodata

# Terminal 2: Start Anvil blockchain
export PATH="/home/w4nn4d13/.foundry/bin:$PATH"
anvil

# Terminal 3: Start Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
python3 main.py

# Terminal 4: Start Frontend
cd frontend
pnpm install
pnpm dev
```

---

## 📋 Complete Setup Guide

### Step 1: MongoDB Setup

```bash
# Start MongoDB (local development)
mongod --dbpath ~/mongodata --logpath /tmp/mongodb.log

# Verify connection
mongosh
> use openlearnx
> db.stats()
```

### Step 2: Blockchain Setup

```bash
# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc  # or ~/.zshrc
foundryup

# Start Anvil local blockchain
export PATH="/home/w4nn4d13/.foundry/bin:$PATH"
anvil

# You'll see test accounts printed:
# Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
# Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Step 3: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Create .env file
cat > .env << 'EOF'
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/openlearnx
WEB3_PROVIDER_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
JWT_SECRET_KEY=jwt-secret-key
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
EOF

# Deploy smart contract
python3 scripts/deploy.py

# Start backend
python3 main.py
# Should see: Running on http://127.0.0.1:5000
```

### Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
EOF

# Start development server
pnpm dev
# Should see: Local: http://localhost:3000
```

---

## 📊 Services Overview

### Available Services

| Service | Port | URL | Status |
|---------|------|-----|--------|
| MongoDB | 27017 | localhost:27017 | Database |
| Anvil | 8545 | http://127.0.0.1:8545 | Blockchain |
| Backend | 5000 | http://localhost:5000 | Flask API |
| Frontend | 3000 | http://localhost:3000 | Next.js UI |

### Service Status Check

```bash
# Check all services
echo "MongoDB:" && pgrep mongod >/dev/null && echo "✅ Running" || echo "❌ Stopped"
echo "Anvil:" && pgrep anvil >/dev/null && echo "✅ Running" || echo "❌ Stopped"
echo "Backend:" && curl -s http://localhost:5000/api/health >/dev/null && echo "✅ Running" || echo "❌ Stopped"
echo "Frontend:" && curl -s http://localhost:3000 >/dev/null && echo "✅ Running" || echo "❌ Stopped"
```

---

## 🔧 Common Development Tasks

### Backend Development

#### Run tests
```bash
cd backend
python3 -m pytest tests/ -v
```

#### Rebuild smart contracts
```bash
cd backend
export PATH="/home/w4nn4d13/.foundry/bin:$PATH"
forge build
```

#### Deploy contract to Anvil
```bash
cd backend
python3 scripts/deploy.py
```

#### View backend logs
```bash
tail -f /tmp/openlearnx_backend.log
```

#### API Health Check
```bash
curl http://localhost:5000/api/health
```

### Frontend Development

#### Hot reload mode (automatic)
```bash
cd frontend
pnpm dev
```

#### Build for production
```bash
cd frontend
pnpm build
```

#### Build and start production build
```bash
cd frontend
pnpm build
pnpm start
```

#### Lint and format
```bash
cd frontend
pnpm lint
pnpm format
```

---

## 📝 Environment Variables

### Backend (.env)
```env
# Flask
FLASK_ENV=development
DEBUG=True
SECRET_KEY=dev-secret-key

# Database
MONGODB_URI=mongodb://localhost:27017/openlearnx

# Blockchain
WEB3_PROVIDER_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# JWT
JWT_SECRET_KEY=jwt-secret-key

# Admin
ADMIN_TOKEN=admin-token-change-this
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
python3 -m pytest tests/ -v
python3 -m pytest tests/ -v --cov=  # With coverage
```

### API Testing with curl
```bash
# Health check
curl http://localhost:5000/api/health

# Dashboard stats
curl http://localhost:5000/api/dashboard/comprehensive-stats

# List courses
curl http://localhost:5000/api/courses

# List quizzes
curl http://localhost:5000/api/quizzes
```

### Frontend Testing
```bash
cd frontend
pnpm test           # Run tests
pnpm test:watch    # Watch mode
```

---

## 🔍 Debugging

### Backend Debugging

#### Enable verbose logging
```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Check database
```bash
mongosh
use openlearnx
db.users.find()
db.quizzes.find()
```

#### Check blockchain
```bash
# If Anvil is running, check accounts
curl -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}'
```

### Frontend Debugging

#### Chrome DevTools
- Open http://localhost:3000
- Press F12 to open DevTools
- Check Console, Network, and Application tabs

#### Next.js Debug Mode
```bash
NODE_DEBUG_SKIP_TYPES=*-skip pnpm dev
```

---

## 📦 Dependency Management

### Backend

#### Add Python package
```bash
cd backend
source venv/bin/activate
pip install package-name
pip freeze > ../requirements.txt
```

#### Update all dependencies
```bash
cd backend
source venv/bin/activate
pip install --upgrade pip
pip install -U -r ../requirements.txt
```

### Frontend

#### Add npm package
```bash
cd frontend
pnpm add package-name
```

#### Add dev dependency
```bash
cd frontend
pnpm add -D package-name
```

#### Update packages
```bash
cd frontend
pnpm update
```

---

## 🛑 Stop Services

### Stop Individual Services
```bash
# Backend
pkill -f "python3.*main.py"

# Frontend
pkill -f "next dev"

# Anvil
pkill anvil

# MongoDB
killall mongod
```

### Stop All Services
```bash
pkill mongod && pkill anvil && pkill -f "python3.*main.py" && pkill -f "next dev"
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Kill any stuck processes
killall mongod

# Remove lock file
rm -f ~/mongodata/mongod.lock

# Restart MongoDB
mongod --dbpath ~/mongodata
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5000    # Backend
lsof -i :3000    # Frontend
lsof -i :8545    # Anvil
lsof -i :27017   # MongoDB

# Kill process
kill -9 <PID>
```

### Backend Won't Start
```bash
cd backend
source venv/bin/activate

# Reinstall dependencies
pip install -r ../requirements.txt

# Check Python version
python3 --version  # Should be 3.10+

# Try running with more verbose output
python3 main.py -v
```

### Frontend Won't Build
```bash
cd frontend

# Clear cache
rm -rf .next node_modules pnpm-lock.yaml

# Reinstall
pnpm install

# Try building again
pnpm build
```

### Anvil Issues
```bash
# Check if Foundry is installed correctly
forge --version
anvil --version

# Reinstall Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

---

## 📚 Useful Resources

- **Backend Framework**: Flask - https://flask.palletsprojects.com/
- **Frontend Framework**: Next.js - https://nextjs.org/
- **Database**: MongoDB - https://www.mongodb.com/
- **Blockchain**: Foundry - https://book.getfoundry.sh/
- **API Testing**: Postman - https://www.postman.com/

---

## 🚀 Deployment

For production deployment, see:
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 📞 Getting Help

### Check Logs
```bash
# Backend logs
tail -f /tmp/mongodb.log
pm2 logs openlearnx-backend

# Frontend logs
pm2 logs openlearnx-frontend
```

### View Git History
```bash
git log --oneline -10
git diff HEAD~1
```

### Report Issues
1. Check [GitHub Issues](https://github.com/th30d4y/OpenLearnX/issues)
2. Create new issue with:
   - Description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, versions, etc.)

---

## ✅ Development Checklist

- [ ] MongoDB running
- [ ] Anvil running
- [ ] Backend running (http://localhost:5000)
- [ ] Frontend running (http://localhost:3000)
- [ ] Can connect to MetaMask
- [ ] Can create account
- [ ] Can browse courses
- [ ] Can take quiz
- [ ] Can mint certificate
- [ ] Database has test data

---

## 🎯 Next Steps

1. **Understand Architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Explore API**: Check [Backend Routes](./backend/routes/)
3. **Explore Components**: Check [Frontend Components](./frontend/components/)
4. **Review Smart Contracts**: Check [Contracts](./backend/contracts/)
5. **Read Tests**: Check [Test Files](./backend/tests/) and [Frontend Tests](./frontend/__tests__/)

---

**Happy developing! 🎉**
