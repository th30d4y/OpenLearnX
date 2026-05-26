# OpenLearnX
[![Self-Hosted Git](https://img.shields.io/badge/Self--Hosted-Gitea-green?style=flat-square\&logo=gitea\&logoColor=white)](https://git.w4nn4d13.tech/0x5t4l1n/OpenLearnX)


**OpenLearnX** is an open-source, decentralized learning and assessment platform that combines adaptive AI-driven quizzes, real-time code execution, and blockchain-based NFT certificates to create a transparent, verifiable, and personalized educational experience.

## Official npm Package

The official package for this repository is:

```bash
npm install @th30d4y/openlearnx
```

Do **not** use the unscoped `openlearnx` package name.

## Features

- **Adaptive Learning** – Questions dynamically adjust in real-time based on learner performance using IRT (Item Response Theory) and AI models
- **Instant Feedback** – Real-time quiz grading with detailed explanations and performance analytics
- **NFT Certificates** – Blockchain-verified ERC-721 certificates minted on Ethereum; tamper-proof and permanently on-chain
- **Multi-Language Code Compiler** – Sandboxed execution of Python, JavaScript, Java, C++, Go, Rust, and more
- **Comprehensive Dashboards** – Student and instructor dashboards with competency radar charts, progress tracking, and bias detection
- **AI Quiz Generation** – LLM-powered contextual question generation with auto-grading
- **Decentralized Chat** – Peer-to-peer encrypted messaging for study groups
- **Peer Review System** – Collaborative review with AI-monitored grading bias detection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS |
| Backend | Python 3, Flask |
| Database | MongoDB |
| Cache | Redis |
| Blockchain | Ethereum (Solidity, Foundry / Anvil) |
| Wallet | MetaMask (ethers.js v6) |
| ML / AI | TensorFlow, LLM integration |
| Storage | IPFS (certificate metadata) |
| Container | Docker |

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB
- Git
- MetaMask browser extension
- [Foundry](https://book.getfoundry.sh/) (`forge`, `anvil`)

## Quick Start

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc   # or ~/.zshrc
foundryup
```

### 2. Clone the repository

```bash
git clone https://github.com/th30d4y/OpenLearnX.git
cd OpenLearnX
```

### 3. Start the local blockchain

```bash
# Terminal 1 – keep this running
anvil --fork-url https://eth.merkle.io
```

### 4. Set up the backend

```bash
# Terminal 2
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Deploy the smart contract and note the contract address
python3 scripts/deploy.py

# Create .env (update CONTRACT_ADDRESS with the address printed above)
cat > .env << EOF
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/openlearnx
WEB3_PROVIDER_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
JWT_SECRET_KEY=jwt-secret-key
EOF

python3 main.py   # http://127.0.0.1:5000
```

### 5. Set up the frontend

```bash
# Terminal 3
cd frontend
pnpm install      # or: npm install

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
EOF

pnpm run dev      # http://localhost:3000
```

### 6. Configure MetaMask

1. Add a custom network: RPC `http://127.0.0.1:8545`, Chain ID `31337`, symbol `ETH`
2. Import a test account using a private key printed by Anvil (starts with `0xac…`)

See [QUICK_START.md](./QUICK_START.md) for the full walkthrough and troubleshooting tips.

## Docker

```bash
docker compose up --build
```

## Project Structure

```
OpenLearnX/
├── backend/          # Flask API, smart-contract scripts, ML models
│   ├── contracts/    # Solidity smart contracts
│   ├── models/       # Database models
│   ├── routes/       # API route handlers
│   ├── services/     # Business logic (auth, quiz, cert, compiler…)
│   └── scripts/      # Deployment & utility scripts
├── frontend/         # Next.js application
│   ├── app/          # App Router pages
│   ├── components/   # Reusable UI components
│   ├── context/      # React context providers
│   └── hooks/        # Custom React hooks
├── chatApp/          # Decentralized chat application
├── docker-compose.yml
└── DOCUMENTATION.md  # Full technical documentation
```

## Documentation

| Document | Description |
|----------|-------------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Comprehensive technical documentation |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture diagrams |
| [QUICK_START.md](./QUICK_START.md) | Step-by-step setup guide |
| [SECURITY.md](./SECURITY.md) | Security policies and practices |
| [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md) | Deployment guide |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/th30d4y/OpenLearnX).

## License

This project is open source. See the repository for license details.
