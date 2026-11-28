# OpenLearnX - Quick Start Guide

Get OpenLearnX running in 15 minutes! ⚡

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] **Node.js 18+** - `node --version`
- [ ] **Python 3.10+** - `python3 --version`
- [ ] **MongoDB** - `mongosh --version`
- [ ] **Git** - `git --version`
- [ ] **MetaMask** - Browser extension installed

---

## 🚀 5-Step Setup

### Step 1: Install Foundry (2 minutes)

```bash
# Install Foundry (Ethereum toolkit)
curl -L https://foundry.paradigm.xyz | bash

# Reload your shell
source ~/.bashrc  # or source ~/.zshrc for zsh

# Install the toolchain
foundryup

# Verify (should show version numbers)
forge --version
anvil --version
```

### Step 2: Clone & Setup (1 minute)

```bash
# Clone repository
git clone https://github.com/th30d4y/OpenLearnX.git
cd OpenLearnX
```

### Step 3: Start Blockchain (1 minute)

**Open Terminal 1:**
```bash
# Start local Ethereum node
anvil --fork-url https://eth.merkle.io

# Leave this running!
# Note: Copy one of the private keys shown for later
```

### Step 4: Backend Setup (5 minutes)

**Open Terminal 2:**
```bash
cd backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Deploy smart contract
python3 scripts/deploy.py
# ⚠️ IMPORTANT: Copy the contract address from output!

# Create .env file
cat > .env << EOF
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/openlearnx
WEB3_PROVIDER_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
JWT_SECRET_KEY=jwt-secret-key
EOF

# Update CONTRACT_ADDRESS in .env with your deployed address!

# Start backend
python3 main.py
# Should see: Running on http://127.0.0.1:5000
```

### Step 5: Frontend Setup (6 minutes)

**Open Terminal 3:**
```bash
cd frontend

# Install dependencies
pnpm install
# or: npm install

# Create environment file
cat > .env.local << EOF
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
EOF

# Update CONTRACT_ADDRESS with your deployed address!

# Start frontend
pnpm run dev
# or: npm run dev

# Should see: Local: http://localhost:3000
```

---

## 🦊 MetaMask Setup (2 minutes)

1. **Open MetaMask extension**

2. **Add Local Network**:
   - Click network dropdown
   - "Add Network" → "Add a network manually"
   - **Network Name**: `Anvil Local`
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
   - Click "Save"

3. **Import Test Account**:
   - Click account icon → "Import Account"
   - Paste private key from Anvil Terminal 1 (starts with 0xac...)
   - Now you have 10000 test ETH!

---

## ✅ Test Your Setup

### 1. Open Browser
Navigate to: http://localhost:3000

### 2. Connect Wallet
- Click "Connect Wallet" button
- Select the imported account
- Approve connection

### 3. Test Backend API
```bash
# In a new terminal
curl http://127.0.0.1:5000/

# Should return: {"message": "OpenLearnX API is running"}
```

### 4. Take a Quiz
- Navigate to "Courses" or "Quizzes"
- Start an adaptive quiz
- Answer questions
- See instant feedback!

### 5. Mint a Certificate
- Complete a quiz with passing score
- Navigate to "Certificates"
- Click "Mint Certificate"
- Approve MetaMask transaction
- View your NFT certificate!

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
sudo systemctl status mongodb
# or: mongosh

# Check Python version
python3 --version  # Must be 3.10+

# Check virtual environment
which python  # Should show venv path
```

### Frontend errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### MetaMask connection fails
1. Check Anvil is running (Terminal 1)
2. Verify RPC URL is `http://127.0.0.1:8545`
3. Verify Chain ID is `31337`
4. Try switching networks back and forth

### Smart contract deployment fails
```bash
# Ensure Anvil is running
# Check you're in the backend directory
cd backend
source venv/bin/activate
python3 scripts/deploy.py
```

---

## 📚 Next Steps

Now that you're set up:

1. **Explore Features**:
   - Try adaptive quizzes
   - Write and run code in the compiler
   - View your dashboard analytics
   - Mint certificates

2. **Read Documentation**:
   - [DOCUMENTATION.md](./DOCUMENTATION.md) - Comprehensive guide
   - [steps.md](./steps.md) - Detailed setup instructions

3. **Customize**:
   - Add your own courses (`backend/seed_courses.py`)
   - Modify quiz questions
   - Customize UI theme

4. **Contribute**:
   - Report bugs
   - Suggest features
   - Submit pull requests

---

## 🎯 Common Commands Reference

### Start Development
```bash
# Terminal 1: Blockchain
anvil --fork-url https://eth.merkle.io

# Terminal 2: Backend
cd backend
source venv/bin/activate
python3 main.py

# Terminal 3: Frontend
cd frontend
pnpm run dev
```

### Stop Everything
```bash
# Stop Anvil: Ctrl+C in Terminal 1
# Stop Backend: Ctrl+C in Terminal 2
# Stop Frontend: Ctrl+C in Terminal 3
```

### Reset Database
```bash
cd backend
source venv/bin/activate
mongosh openlearnx --eval "db.dropDatabase()"
python3 seed_courses.py  # Reseed data
```

### Redeploy Contract
```bash
cd backend
source venv/bin/activate
python3 scripts/deploy.py
# Update CONTRACT_ADDRESS in both .env files!
```

---

## 🆘 Getting Help

- 📖 **Full Documentation**: [DOCUMENTATION.md](./DOCUMENTATION.md)
- 🐛 **Issues**: [GitHub Issues](https://github.com/th30d4y/OpenLearnX/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/th30d4y/OpenLearnX/discussions)

---

**Happy Learning! 🎓**
