# 🛠 Step 1: Install Foundry & Anvil

Foundry is a blazing-fast toolkit for Ethereum development written in Rust. It includes `forge` (for testing), `cast` (for scripting), and `anvil` (a local Ethereum node, like Hardhat or Ganache).

---

## ✅ Prerequisites

- A Unix-based system (Linux/macOS/WSL)
- `curl` installed
- `zsh` or `bash` shell

---

## 🔽 Install Foundry

Open your terminal and run:

```bash
curl -L https://foundry.paradigm.xyz | bash
```

## Then activate Foundry by either:
```
# If using zsh
source ~/.zshrc

# If using bash
source ~/.bashrc

```
Now install the Foundry toolchain:
```
foundryup
```

##  Verify Installation
```
forge --version
anvil --version
cast --version
```
If all return versions, you’re good to go!

## Run Anvil Locally
Start a local Ethereum testnet node:
```
anvil
```
Or to fork Ethereum mainnet (for testing with real contract data):
```
anvil --fork-url https://eth.merkle.io

```
## Step 1 Completed:)

# Step 2 Backend

OpenLearnX Quick Start Commands

## Terminal 1: Start Anvil Blockchain
```
anvil --fork-url https://eth.merkle.io
```
Keep this terminal running

## Terminal 2: Deploy Smart Contract

```
cd backend
source venv/bin/activate
python3 scripts/deploy.py
```

Copy the contract address to your .env file, then you can close this terminal

## Terminal 3: Start Flask Application

```
cd backend
source venv/bin/activate
python3 main.py
```
Keep this terminal running

## Test Your Platform
```
# Test API health
curl http://127.0.0.1:5000/

# Test authentication endpoint
curl -X POST http://127.0.0.1:5000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}'
```
Your OpenLearnX Platform URLs
```


    API: http://127.0.0.1:5000

    Network Access: http://192.168.35.250:5000
```
## Step 2 Completed:)

# Step 3 Frontend

based on your backend setup and requirements for a comprehensive adaptive learning platform, here's how to build the frontend in your existing frontend directory.

## 

```
cd frontend

# Create React + TypeScript + Vite project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages for OpenLearnX features
npm install web3 ethers @metamask/detect-provider
npm install react-router-dom react-query
npm install @headlessui/react @heroicons/react
npm install chart.js react-chartjs-2 recharts
npm install axios react-hook-form
npm install framer-motion react-hot-toast
npm install tailwindcss @tailwindcss/forms
```
## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── MetaMaskConnect.tsx
│   │   │   └── WalletAuth.tsx
│   │   ├── testing/
│   │   │   ├── AdaptiveTest.tsx
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── InstantFeedback.tsx
│   │   │   └── ProgressTracker.tsx
│   │   ├── assessment/
│   │   │   ├── PeerReview.tsx
│   │   │   ├── BiasDetection.tsx
│   │   │   └── Portfolio.tsx
│   │   ├── dashboard/
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── InstructorDashboard.tsx
│   │   │   ├── CompetencyRadar.tsx
│   │   │   └── ProgressChart.tsx
│   │   ├── certificates/
│   │   │   ├── CertificateGallery.tsx
│   │   │   ├── NFTViewer.tsx
│   │   │   └── BlockchainVerify.tsx
│   │   └── common/
│   │       ├── Layout.tsx
│   │       ├── Navigation.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useMetaMask.ts
│   │   ├── useAdaptiveTesting.ts
│   │   ├── useInstantFeedback.ts
│   │   └── useBlockchain.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── web3.ts
│   │   └── auth.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── testing.ts
│   │   └── dashboard.ts
│   ├── utils/
│   │   ├── adaptiveAlgorithm.ts
│   │   ├── biasDetection.ts
│   │   └── competencyMapping.ts
│   └── pages/
│       ├── HomePage.tsx
│       ├── TestingPage.tsx
│       ├── DashboardPage.tsx
│       └── CertificatesPage.tsx

```


## run frontend
```
cd frontend
pnpm install
pnpm run dev
```

 
## run mangodb in local for running 
```
# Install MongoDB on Arch Linux
yay -S mongodb-bin

# Start the service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verify it's running
sudo systemctl status mongodb

# Test connection
mongosh
```
