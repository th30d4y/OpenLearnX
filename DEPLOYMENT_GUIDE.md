# OpenLearnX Localhost Deployment Guide

## Overview
Deploy OpenLearnX on localhost with 5 components running in parallel:
1. **MongoDB** - Database
2. **Anvil** - Local Ethereum blockchain
3. **Backend** - Flask API (Python)
4. **Smart Contract** - Deploy to Anvil
5. **Frontend** - Next.js (React/TypeScript)

---

## Terminal Setup (Use 5 separate terminal windows)

### Terminal 1: Start MongoDB
```bash
mongod --dbpath ~/mongodata --logpath /tmp/mongodb.log
# Should show: "Waiting for connections on port 27017"
```

### Terminal 2: Start Blockchain (Anvil)
```bash
export PATH="/home/w4nn4d13/.foundry/bin:$PATH"
cd /home/w4nn4d13/Project/OpenLearnX
anvil --fork-url https://eth.merkle.io
# Save one of the printed private keys for MetaMask
```

### Terminal 3: Deploy Smart Contract & Backend
```bash
export PATH="/home/w4nn4d13/.foundry/bin:$PATH"
cd /home/w4nn4d13/Project/OpenLearnX/backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt flask flask-cors python-dotenv pymongo web3 pyjwt

# Deploy smart contract
python3 scripts/deploy.py
# ⚠️ COPY THE CONTRACT ADDRESS FROM OUTPUT ⚠️

# Create .env file (update CONTRACT_ADDRESS with output from deploy.py)
cat > .env << 'ENVFILE'
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/openlearnx
WEB3_PROVIDER_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
JWT_SECRET_KEY=jwt-secret-key
ENVFILE

# Start backend
python3 main.py
# Should see: "Running on http://127.0.0.1:5000"
```

### Terminal 4: Setup Frontend
```bash
cd /home/w4nn4d13/Project/OpenLearnX/frontend

# Install dependencies
pnpm install
# If pnpm not installed: npm install -g pnpm

# Create .env.local (use CONTRACT_ADDRESS from Terminal 3)
cat > .env.local << 'ENVFILE'
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
ENVFILE

# Start frontend
pnpm dev
# Should see: "Local: http://localhost:3000"
```

### Terminal 5: Monitor & Test
```bash
# Check MongoDB
mongosh --eval "db.version()"

# Check Anvil health
curl http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Check Backend
curl http://localhost:5000/health 2>/dev/null || curl http://localhost:5000 2>/dev/null || echo "Backend not ready"

# Check Frontend
curl http://localhost:3000 -s | head -20
```

---

## Quick Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Anvil RPC**: http://127.0.0.1:8545

---

## Configuration Files

### .env (Backend)
Located at: `backend/.env`
- MONGODB_URI: Connection string to MongoDB
- WEB3_PROVIDER_URL: Anvil RPC endpoint
- CONTRACT_ADDRESS: Deployed certificate NFT contract address

### .env.local (Frontend)
Located at: `frontend/.env.local`
- NEXT_PUBLIC_BACKEND_URL: Backend base URL, without `/api` or a trailing slash
- NEXT_PUBLIC_RPC_URL: Anvil RPC endpoint
- NEXT_PUBLIC_CONTRACT_ADDRESS: Contract address for blockchain interaction

---

## Troubleshooting

### MongoDB won't start
```bash
# Kill existing MongoDB process
killall mongod

# Delete corrupted data and restart
rm -rf ~/mongodata
mkdir ~/mongodata
mongod --dbpath ~/mongodata
```

### Port already in use
```bash
# Find and kill process on port
# MongoDB (27017)
lsof -ti:27017 | xargs kill -9

# Anvil (8545)
lsof -ti:8545 | xargs kill -9

# Backend (5000)
lsof -ti:5000 | xargs kill -9

# Frontend (3000)
lsof -ti:3000 | xargs kill -9
```

### Python dependencies missing
```bash
cd backend
source venv/bin/activate
pip install -r ../requirements.txt
```

### Foundry not found
```bash
export PATH="/home/w4nn4d13/.foundry/bin:$PATH"
```

---

## Success Indicators

✅ MongoDB running on 27017
✅ Anvil running on 8545 with accounts printed
✅ Backend running on 5000
✅ Frontend accessible on 3000
✅ Smart contract deployed to Anvil

---

## Cleanup (Stop Everything)

```bash
# Terminal 1
# Press Ctrl+C in MongoDB terminal

# Terminal 2
# Press Ctrl+C in Anvil terminal

# Terminal 3
# Press Ctrl+C in Backend terminal

# Terminal 4
# Press Ctrl+C in Frontend terminal

# Terminal 5 (Clean up)
pkill mongod
pkill anvil
pkill python3
```

