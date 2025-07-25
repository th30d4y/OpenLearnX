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
