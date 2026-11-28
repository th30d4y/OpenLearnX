# OpenLearnX - Comprehensive Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Smart Contracts](#smart-contracts)
7. [Backend Services](#backend-services)
8. [Frontend Application](#frontend-application)
9. [Database Schema](#database-schema)
10. [API Documentation](#api-documentation)
11. [Setup & Installation](#setup--installation)
12. [Deployment](#deployment)
13. [Security Features](#security-features)
14. [Contributing](#contributing)

---

## 🎯 Project Overview

**OpenLearnX** is a cutting-edge, decentralized learning and assessment platform that revolutionizes how learners acquire, demonstrate, and verify their skills. Built on Web3 technologies, it combines adaptive learning algorithms, real-time feedback systems, and blockchain-based certification to create a transparent, verifiable, and personalized educational experience.

### Vision
To democratize education by providing learners with:
- Personalized, adaptive learning experiences that scale with their skill level
- Instant, actionable feedback on their performance
- Immutable, blockchain-verified certificates that employers can trust
- Full ownership of their learning data through decentralized storage

### Problem It Solves
1. **Traditional Credentials Are Unverifiable**: Paper certificates and digital badges can be forged
2. **One-Size-Fits-All Learning**: Static courses don't adapt to individual learner needs
3. **Delayed Feedback**: Students wait days or weeks for assessment results
4. **Data Ownership**: Learners don't control their educational records
5. **Skill Verification**: Employers struggle to verify claimed skills

---

## ✨ Core Features

### 1. Adaptive Learning System
- **Dynamic Difficulty Adjustment**: Questions adapt in real-time based on learner performance
- **Personalized Learning Paths**: AI-driven recommendation engine suggests optimal learning sequences
- **Skill Gap Analysis**: Identifies weaknesses and focuses learning where it's needed most
- **Progressive Difficulty Curve**: Gradually increases challenge as competency improves

### 2. Instant Feedback & Assessment
- **Real-Time Code Execution**: Run and test code in multiple programming languages
- **Immediate Results**: Get instant feedback on quiz answers and code submissions
- **Detailed Explanations**: Understand why answers are correct or incorrect
- **Performance Analytics**: Track progress over time with comprehensive metrics

### 3. Blockchain Certificates (NFT)
- **ERC-721 NFT Certificates**: Each certificate is a unique, non-transferable NFT
- **On-Chain Verification**: Anyone can verify certificate authenticity on the blockchain
- **IPFS Metadata Storage**: Certificate details stored on decentralized storage
- **Permanent Record**: Certificates cannot be revoked or altered once minted
- **Wallet Integration**: MetaMask wallet connects learners to their certificates

### 4. Comprehensive Dashboard
- **Student Dashboard**: 
  - Progress tracking across multiple subjects
  - Competency radar charts showing skill distribution
  - Certificate gallery with blockchain verification
  - Learning history and timeline
- **Instructor Dashboard**:
  - Class performance analytics
  - Student progress monitoring
  - Assessment creation and management
  - Bias detection in grading

### 5. Multi-Language Code Compiler
- **Supported Languages**: Python, JavaScript, Java, C++, C, Go, Rust, and more
- **Secure Execution**: Sandboxed environment with resource limits
- **Real-Time Output**: See compilation errors and execution results instantly
- **Test Cases**: Automated testing against predefined test cases

### 6. AI-Powered Quiz Generation
- **LLM Integration**: Uses machine learning to generate contextual questions
- **Adaptive Question Selection**: Picks questions based on difficulty and topic
- **Auto-Grading**: Automated evaluation of multiple-choice and coding questions
- **Question Banking**: Extensive library of pre-validated questions

### 7. Peer Review System
- **Collaborative Learning**: Students review each other's work
- **Bias Detection**: AI monitors for grading bias and inconsistencies
- **Portfolio Building**: Showcase best work for potential employers
- **Anonymous Reviews**: Optional anonymity to reduce bias

### 8. Decentralized Chat
- **Peer-to-Peer Communication**: Built on blockchain smart contracts
- **Study Groups**: Create topic-based discussion channels
- **Encrypted Messages**: Private, secure communication
- **Persistent History**: Chat logs stored on-chain

---

## 🏗 Architecture

OpenLearnX follows a modern **microservices architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  (Next.js 14 + React + TypeScript + TailwindCSS)               │
│  - User Interface                                               │
│  - Wallet Integration (MetaMask)                                │
│  - Real-time Updates                                            │
└────────────────────────┬───────────────────────────────────────┘
                         │ HTTPS/WebSocket
┌────────────────────────┴───────────────────────────────────────┐
│                      Backend Layer (Flask)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Auth Service │  │ Quiz Service │  │ Cert Service │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Compiler Svc │  │ Dashboard Svc│  │ Adaptive AI  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────┬───────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────┴─────┐ ┌──────┴──────┐ ┌─────┴──────────┐
│   MongoDB    │ │  PostgreSQL │ │  Redis Cache   │
│  (Primary DB)│ │   (Future)  │ │  (Sessions)    │
└──────────────┘ └─────────────┘ └────────────────┘
         │
         │
┌────────┴─────────────────────────────────────────────┐
│           Blockchain Layer (Ethereum/Anvil)          │
│  ┌──────────────────────────────────────────┐        │
│  │  CertificateNFT Smart Contract (Solidity)│        │
│  │  - Mint NFT certificates                 │        │
│  │  - Verify authenticity                   │        │
│  │  - Track ownership                       │        │
│  └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
         │
┌────────┴─────┐
│     IPFS     │  (Decentralized Storage)
│  Metadata    │  - Certificate details
│   Storage    │  - Learning records
└──────────────┘
```

### Key Architectural Decisions

1. **Microservices**: Each major feature is a separate service for scalability
2. **Blockchain Integration**: Ethereum smart contracts for immutable certificates
3. **Hybrid Storage**: MongoDB for application data, IPFS for decentralized storage
4. **JWT Authentication**: Stateless authentication with wallet-based identity
5. **Real-Time Processing**: WebSocket connections for live updates
6. **Containerization**: Docker for consistent deployment across environments

---

## 🔧 Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: React Context + Hooks
- **Web3 Integration**: 
  - ethers.js / web3.js
  - MetaMask SDK
  - wagmi (React Hooks for Ethereum)
- **Charts & Visualization**: Chart.js, Recharts
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios
- **Animations**: Framer Motion

### Backend
- **Framework**: Flask 2.3.3 (Python)
- **Async Support**: asyncio, motor (async MongoDB driver)
- **API Type**: REST + WebSocket
- **Authentication**: 
  - Flask-JWT-Extended
  - Wallet signature verification (Web3)
- **CORS**: Flask-CORS
- **Environment**: python-dotenv

### Database
- **Primary**: MongoDB 6.0+
  - Document-based storage for flexible schemas
  - Collections: users, courses, quizzes, certificates, submissions
- **Cache**: Redis 7
  - Session management
  - Rate limiting
  - Temporary data storage
- **Future**: PostgreSQL (planned for relational data)

### Blockchain
- **Smart Contract Language**: Solidity 0.8.19
- **Development Framework**: Foundry
  - forge (testing and building)
  - anvil (local Ethereum node)
  - cast (CLI for contract interaction)
- **Smart Contract Standards**: 
  - ERC-721 (NFT certificates)
  - OpenZeppelin contracts (security-audited base contracts)
- **Network**: 
  - Local: Anvil (development)
  - Production: Ethereum mainnet / L2 solutions (Polygon, Arbitrum)

### Machine Learning
- **Framework**: TensorFlow 2.17, Keras 3.2
- **Data Processing**: NumPy, Pandas, scikit-learn
- **NLP**: (for question generation and analysis)
- **Adaptive Algorithm**: Custom implementation with reinforcement learning principles

### DevOps
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions (implied)
- **Deployment**: 
  - Single-server: deploy-single.sh script
  - Container orchestration ready
- **Monitoring**: Application logs, TensorFlow metrics

### Security
- **Encryption**: PyCryptodome (AES encryption)
- **Password Hashing**: passlib with bcrypt
- **JWT**: PyJWT with cryptographic signatures
- **Web3 Security**: eth-account for signature verification
- **Secure Code Execution**: Sandboxed Docker containers for code compilation

---

## 📁 Project Structure

```
OpenLearnX/
├── backend/                      # Flask backend application
│   ├── main.py                   # Application entry point
│   ├── requirements.txt          # Python dependencies
│   │
│   ├── contracts/                # Solidity smart contracts
│   │   └── CertificateNFT.sol   # ERC-721 NFT certificate contract
│   │
│   ├── routes/                   # API route handlers
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── quizzes.py           # Quiz management
│   │   ├── adaptive_quiz.py     # Adaptive testing
│   │   ├── certificate.py       # NFT certificate minting
│   │   ├── dashboard.py         # Analytics and dashboards
│   │   ├── compiler.py          # Code compilation service
│   │   ├── coding.py            # Coding challenges
│   │   ├── exam.py              # Examination system
│   │   ├── courses.py           # Course management
│   │   ├── admin.py             # Admin panel
│   │   └── test_flow.py         # Testing workflows
│   │
│   ├── services/                 # Business logic layer
│   │   ├── ai_quiz_service.py   # AI-powered quiz generation
│   │   ├── adaptive_quiz_service.py  # Adaptive algorithm
│   │   ├── compiler_service.py  # Code compilation logic
│   │   ├── real_compiler_service.py  # Real code execution
│   │   ├── dashboard_service.py # Dashboard data aggregation
│   │   └── wallet_service.py    # Web3 wallet interactions
│   │
│   ├── models/                   # Data models
│   │   ├── user.py              # User data model
│   │   ├── certificate.py       # Certificate model
│   │   └── dashboard_models.py  # Dashboard data structures
│   │
│   ├── utils/                    # Utility functions
│   │   └── adaptive_engine.py   # Adaptive learning engine
│   │
│   ├── scripts/                  # Deployment and utility scripts
│   │   └── deploy.py            # Smart contract deployment
│   │
│   ├── llmtrain/                 # ML model training
│   ├── cache/                    # Temporary cache
│   ├── mongo_service.py         # MongoDB connection service
│   ├── web3_service.py          # Web3 blockchain service
│   ├── quiz_master.py           # Quiz orchestration
│   ├── seed_courses.py          # Database seeding
│   │
│   ├── foundry.toml             # Foundry configuration
│   ├── deployment.json          # Contract deployment info
│   └── Dockerfile               # Backend container config
│
├── frontend/                     # Next.js frontend application
│   ├── app/                     # Next.js 14 app directory
│   │   ├── page.tsx             # Home page
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Global styles
│   │   │
│   │   ├── auth/                # Authentication pages
│   │   ├── dashboard/           # Dashboard pages
│   │   ├── certificate/         # Certificate gallery
│   │   ├── courses/             # Course browsing
│   │   ├── coding/              # Code challenges
│   │   ├── compiler/            # Online compiler
│   │   ├── adaptive-quiz/       # Adaptive tests
│   │   ├── join-test/           # Test joining flow
│   │   └── admin/               # Admin panel
│   │
│   ├── components/              # Reusable React components
│   │   └── ui/                  # shadcn/ui components
│   │
│   ├── context/                 # React Context providers
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utility libraries
│   ├── styles/                  # Additional styles
│   │
│   ├── package.json             # Node.js dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   ├── tailwind.config.ts       # TailwindCSS configuration
│   ├── next.config.mjs          # Next.js configuration
│   └── components.json          # shadcn/ui config
│
├── chatApp/                      # Decentralized chat feature
│   ├── chatApp.sol              # Chat smart contract
│   ├── index.html               # Chat interface
│   ├── account.html             # Account management
│   └── styles.css               # Chat styling
│
├── .wake/                        # Wake AI agent configuration
│
├── docker-compose.yml           # Multi-container orchestration
├── Dockerfile                   # Main application container
├── deploy-single.sh             # Single-server deployment script
├── requirements.txt             # Python dependencies (root)
├── README.md                    # Project overview
├── steps.md                     # Setup instructions
├── .gitignore                   # Git ignore rules
├── .dockerignore                # Docker ignore rules
└── .gitmodules                  # Git submodules (OpenZeppelin)
```

---

## 📜 Smart Contracts

### CertificateNFT Contract

**Purpose**: Issue tamper-proof, blockchain-verified certificates as NFTs.

**Key Features**:
- ERC-721 compliant (standard NFT)
- Stores certificate metadata on-chain
- Tracks certificate ownership
- Verifiable by anyone on the blockchain

**Contract Structure**:
```solidity
contract CertificateNFT is ERC721, ERC721URIStorage, Ownable {
    struct Certificate {
        string subject;        // Course/subject name
        string studentName;    // Learner name
        uint256 score;         // Achievement score
        uint256 timestamp;     // Issue date
        bool verified;         // Verification status
    }
    
    // Main functions:
    - mintCertificate(address to, string tokenURI)
    - mintCertificateWithDetails(...)
    - getCertificate(uint256 tokenId)
    - getUserCertificates(address user)
    - verifyCertificate(uint256 tokenId)
}
```

**Key Functions**:

1. **mintCertificate**: Creates a basic certificate NFT
   - Only owner (platform) can mint
   - Assigns to learner's wallet
   - Returns token ID

2. **mintCertificateWithDetails**: Creates detailed certificate
   - Includes subject, name, score
   - Timestamp automatically set
   - Emits CertificateMinted event

3. **verifyCertificate**: Public verification
   - Anyone can check authenticity
   - Returns verification status

4. **getUserCertificates**: Get all certificates for a wallet
   - Returns array of token IDs
   - Used for portfolio display

**Deployment**:
- Deployed using Foundry (forge)
- Uses OpenZeppelin audited base contracts
- Deployed on local Anvil node for development
- Ready for mainnet/L2 deployment

---

## 🖥 Backend Services

### 1. Authentication Service (`routes/auth.py`)

**Endpoints**:
- `POST /api/auth/nonce` - Generate nonce for wallet signature
- `POST /api/auth/verify` - Verify wallet signature and issue JWT
- `POST /api/auth/register` - Register new user with wallet
- `GET /api/auth/profile` - Get user profile (requires JWT)

**Authentication Flow**:
```
1. User connects MetaMask wallet
2. Frontend requests nonce from backend
3. User signs nonce with private key
4. Backend verifies signature matches wallet address
5. Backend issues JWT token
6. JWT used for subsequent requests
```

**Security**:
- Wallet-based authentication (no passwords)
- Time-limited nonces (prevent replay attacks)
- JWT with expiration
- Signature verification using eth-account

### 2. Quiz Service (`routes/quizzes.py`)

**Features**:
- Create, read, update, delete quizzes
- Multiple question types (MCQ, coding, essay)
- Auto-grading for objective questions
- Manual grading interface for subjective questions
- Quiz attempt tracking
- Time limits and deadlines

**Endpoints**:
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes` - List all quizzes
- `GET /api/quizzes/:id` - Get quiz details
- `POST /api/quizzes/:id/attempt` - Submit quiz attempt
- `GET /api/quizzes/:id/results` - Get results

### 3. Adaptive Quiz Service (`routes/adaptive_quiz.py`)

**Adaptive Algorithm**:
- Uses Item Response Theory (IRT)
- Adjusts question difficulty based on performance
- Estimates learner ability in real-time
- Provides personalized question selection

**How It Works**:
```python
1. Start with medium difficulty question
2. If correct → increase difficulty
3. If incorrect → decrease difficulty
4. Track ability estimate (theta)
5. Select next question optimally for ability level
6. Repeat until convergence or question limit
```

**Endpoints**:
- `POST /api/adaptive-quiz/start` - Start adaptive test
- `POST /api/adaptive-quiz/answer` - Submit answer, get next question
- `GET /api/adaptive-quiz/results` - Final results and ability estimate

### 4. Certificate Service (`routes/certificate.py`)

**Certificate Issuance Flow**:
```
1. User completes quiz/course
2. Backend verifies completion and score
3. Generate certificate metadata (JSON)
4. Upload metadata to IPFS
5. Call smart contract to mint NFT
6. Store transaction hash in database
7. Return certificate to user
```

**Endpoints**:
- `POST /api/certificates/mint` - Mint new certificate
- `GET /api/certificates/:id` - Get certificate details
- `GET /api/certificates/user/:wallet` - Get user's certificates
- `GET /api/certificates/verify/:tokenId` - Verify certificate on blockchain

**IPFS Integration**:
- Metadata stored on IPFS for permanence
- Contains: name, subject, score, issue date, image
- IPFS hash stored in smart contract
- Ensures data can't be lost or altered

### 5. Compiler Service (`routes/compiler.py`)

**Supported Languages**:
- Python (3.x)
- JavaScript (Node.js)
- Java
- C++, C
- Go
- Rust
- Ruby
- PHP

**Execution Flow**:
```
1. Receive code and language from frontend
2. Create isolated Docker container
3. Write code to file inside container
4. Compile (if needed)
5. Execute with resource limits (CPU, memory, time)
6. Capture stdout, stderr
7. Return output to user
8. Clean up container
```

**Security Features**:
- Sandboxed execution (Docker)
- Resource limits (prevent infinite loops)
- Network isolation
- No file system access outside container
- Timeout enforcement

**Endpoints**:
- `POST /api/compiler/run` - Execute code
- `POST /api/compiler/test` - Run against test cases

### 6. Dashboard Service (`routes/dashboard.py`)

**Analytics Provided**:
- Overall progress percentage
- Competency radar chart (skill distribution)
- Time series of performance
- Subject-wise breakdown
- Recent activity timeline
- Strengths and weaknesses

**Student Dashboard**:
- My courses and progress
- Recent quiz scores
- Certificates earned
- Upcoming deadlines
- Recommended next steps

**Instructor Dashboard**:
- Class average performance
- Student progress tracking
- Question statistics (difficulty, discrimination)
- Grading queue
- Bias detection alerts

**Endpoints**:
- `GET /api/dashboard/student` - Student analytics
- `GET /api/dashboard/instructor` - Instructor analytics
- `GET /api/dashboard/competency` - Competency mapping

### 7. AI Quiz Service (`services/ai_quiz_service.py`)

**Question Generation**:
- Uses TensorFlow models
- Generates contextual questions based on topic
- Validates question quality
- Creates distractors (wrong answers) for MCQs

**Features**:
- Topic-based generation
- Difficulty control
- Question type variety
- Quality scoring

---

## 🎨 Frontend Application

### Key Pages

#### 1. Home Page (`app/page.tsx`)
- Platform introduction
- Feature highlights
- Call to action (Connect Wallet)
- Statistics (users, certificates issued, courses)

#### 2. Authentication (`app/auth/`)
- MetaMask connection
- Wallet signature verification
- User registration flow
- Profile management

#### 3. Dashboard (`app/dashboard/`)
- Progress overview
- Recent activity
- Quick actions
- Performance charts

#### 4. Courses (`app/courses/`)
- Course catalog
- Course details
- Enrollment
- Course progress

#### 5. Adaptive Quiz (`app/adaptive-quiz/`)
- Quiz interface
- Real-time difficulty adjustment
- Instant feedback
- Progress indicator

#### 6. Coding Challenges (`app/coding/`)
- Problem description
- Code editor (Monaco Editor)
- Test cases
- Submission and results

#### 7. Online Compiler (`app/compiler/`)
- Multi-language support
- Live code execution
- Output display
- Error handling

#### 8. Certificate Gallery (`app/certificate/`)
- User's certificates
- Blockchain verification
- Download/share options
- QR code for verification

#### 9. Admin Panel (`app/admin/`)
- User management
- Course creation
- Quiz authoring
- Analytics and reports

### Key Components

**UI Components** (shadcn/ui):
- Buttons, Cards, Dialogs
- Forms, Inputs, Selects
- Tables, Tabs, Toast notifications
- Accordions, Alerts, Avatars

**Custom Components**:
- WalletConnect: MetaMask integration
- QuestionCard: Quiz question display
- CodeEditor: Syntax-highlighted editor
- ProgressChart: Performance visualization
- CertificateCard: NFT certificate display

---

## 💾 Database Schema

### MongoDB Collections

#### 1. users
```json
{
  "_id": ObjectId,
  "wallet_address": "0x...",
  "username": "string",
  "email": "string",
  "role": "student|instructor|admin",
  "created_at": ISODate,
  "profile": {
    "name": "string",
    "bio": "string",
    "avatar": "string"
  },
  "stats": {
    "quizzes_completed": 0,
    "certificates_earned": 0,
    "total_score": 0
  }
}
```

#### 2. courses
```json
{
  "_id": ObjectId,
  "title": "string",
  "description": "string",
  "instructor_id": ObjectId,
  "topics": ["array of strings"],
  "difficulty": "beginner|intermediate|advanced",
  "created_at": ISODate,
  "quizzes": ["array of quiz IDs"],
  "enrollments": 0
}
```

#### 3. quizzes
```json
{
  "_id": ObjectId,
  "course_id": ObjectId,
  "title": "string",
  "description": "string",
  "questions": [
    {
      "id": "string",
      "type": "mcq|coding|essay",
      "question": "string",
      "options": ["array"],
      "correct_answer": "string|array",
      "points": 0,
      "difficulty": 0.0-1.0
    }
  ],
  "time_limit": 3600,
  "passing_score": 70,
  "adaptive": true|false
}
```

#### 4. quiz_attempts
```json
{
  "_id": ObjectId,
  "quiz_id": ObjectId,
  "user_id": ObjectId,
  "started_at": ISODate,
  "completed_at": ISODate,
  "answers": [
    {
      "question_id": "string",
      "user_answer": "string",
      "is_correct": true|false,
      "points_earned": 0
    }
  ],
  "score": 0,
  "percentage": 0.0,
  "ability_estimate": 0.0,
  "passed": true|false
}
```

#### 5. certificates
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "wallet_address": "0x...",
  "course_id": ObjectId,
  "quiz_id": ObjectId,
  "token_id": 0,
  "transaction_hash": "0x...",
  "ipfs_hash": "string",
  "subject": "string",
  "score": 0,
  "issued_at": ISODate,
  "metadata": {
    "name": "string",
    "description": "string",
    "image": "string"
  }
}
```

---

## 🔌 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

### Common Response Format
```json
{
  "success": true|false,
  "data": {},
  "message": "string",
  "error": "string" // only on failure
}
```

### Endpoint Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Authentication** ||||
| POST | /auth/nonce | Get nonce for wallet signature | No |
| POST | /auth/verify | Verify signature and get JWT | No |
| POST | /auth/register | Register new user | No |
| GET | /auth/profile | Get user profile | Yes |
| **Quizzes** ||||
| GET | /quizzes | List all quizzes | No |
| GET | /quizzes/:id | Get quiz details | Yes |
| POST | /quizzes/:id/attempt | Submit quiz attempt | Yes |
| GET | /quizzes/:id/results | Get quiz results | Yes |
| **Adaptive Quiz** ||||
| POST | /adaptive-quiz/start | Start adaptive test | Yes |
| POST | /adaptive-quiz/answer | Submit answer | Yes |
| GET | /adaptive-quiz/results | Get final results | Yes |
| **Certificates** ||||
| POST | /certificates/mint | Mint certificate | Yes |
| GET | /certificates/user/:wallet | Get user certificates | No |
| GET | /certificates/verify/:tokenId | Verify certificate | No |
| **Compiler** ||||
| POST | /compiler/run | Execute code | Yes |
| POST | /compiler/test | Run test cases | Yes |
| **Dashboard** ||||
| GET | /dashboard/student | Student analytics | Yes |
| GET | /dashboard/instructor | Instructor analytics | Yes |
| **Courses** ||||
| GET | /courses | List courses | No |
| GET | /courses/:id | Get course details | No |
| POST | /courses/:id/enroll | Enroll in course | Yes |

---

## ⚙️ Setup & Installation

### Prerequisites
- **Operating System**: Linux, macOS, or WSL (Windows Subsystem for Linux)
- **Node.js**: v18+ (for frontend)
- **Python**: 3.10+ (for backend)
- **MongoDB**: 6.0+ (database)
- **Docker**: 20.10+ (optional, for containerized deployment)
- **Git**: For cloning repository
- **MetaMask**: Browser extension for Web3

### Step-by-Step Installation

#### 1. Install Foundry (Blockchain Development Toolkit)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc

# Install Foundry toolchain
foundryup

# Verify installation
forge --version
anvil --version
cast --version
```

#### 2. Clone Repository

```bash
git clone https://github.com/th30d4y/OpenLearnX.git
cd OpenLearnX
```

#### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env  # Create this if it doesn't exist

# Edit .env with your settings
nano .env
```

**Required Environment Variables** (`.env`):
```env
# Flask
FLASK_APP=main.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/openlearnx

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Web3
WEB3_PROVIDER_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x... # Set after deploying contract

# IPFS (optional)
IPFS_GATEWAY=https://ipfs.io/ipfs/

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_EXPIRES=3600
```

#### 4. Start Local Blockchain

**Terminal 1** - Run Anvil:
```bash
anvil --fork-url https://eth.merkle.io
```

This starts a local Ethereum node. Keep this running.

**Output**:
```
Available Accounts
==================
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...

Private Keys
==================
(0) 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...

Chain ID
==================
31337
```

#### 5. Deploy Smart Contract

**Terminal 2**:
```bash
cd backend
source venv/bin/activate

# Deploy contract
python3 scripts/deploy.py
```

**Output**:
```
Deploying CertificateNFT contract...
Contract deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Transaction hash: 0x...
```

**Important**: Copy the contract address to your `.env` file:
```env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

#### 6. Start Backend Server

**Terminal 3**:
```bash
cd backend
source venv/bin/activate

# Seed database (optional)
python3 seed_courses.py

# Start Flask app
python3 main.py
```

**Output**:
```
 * Running on http://127.0.0.1:5000
 * Running on http://192.168.x.x:5000
```

**Test Backend**:
```bash
# Health check
curl http://127.0.0.1:5000/

# Test nonce generation
curl -X POST http://127.0.0.1:5000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"}'
```

#### 7. Install MongoDB

**Linux (Arch)**:
```bash
yay -S mongodb-bin
sudo systemctl start mongodb
sudo systemctl enable mongodb
mongosh  # Test connection
```

**macOS**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
mongosh  # Test connection
```

**Docker**:
```bash
docker run -d -p 27017:27017 --name mongodb mongo:6
```

#### 8. Frontend Setup

**Terminal 4**:
```bash
cd frontend

# Install dependencies
pnpm install
# or: npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Frontend Environment Variables** (`.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

**Start Frontend**:
```bash
pnpm run dev
# or: npm run dev
```

**Output**:
```
▲ Next.js 14.0.0
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

#### 9. Access Application

1. Open browser: http://localhost:3000
2. Install MetaMask extension if not already installed
3. Add local network to MetaMask:
   - Network Name: Anvil Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
4. Import account using private key from Anvil
5. Connect wallet on homepage
6. Start learning!

---

## 🚀 Deployment

### Docker Deployment

#### Option 1: Docker Compose (Recommended)

**Includes**: Application, MongoDB, Redis, all in one command

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access**:
- Application: http://localhost:80
- MongoDB: localhost:5432
- Redis: localhost:6379

#### Option 2: Single Container

```bash
# Build image
docker build -t openlearnx .

# Run container
docker run -d -p 80:80 \
  -e DATABASE_URL=mongodb://host.docker.internal:27017/openlearnx \
  -e CONTRACT_ADDRESS=0x... \
  --name openlearnx \
  openlearnx
```

### Production Deployment

#### Prerequisites
- VPS or cloud server (AWS, DigitalOcean, etc.)
- Domain name
- SSL certificate (Let's Encrypt)

#### Deployment Script

The project includes `deploy-single.sh` for single-server deployment:

```bash
# Make script executable
chmod +x deploy-single.sh

# Run deployment
./deploy-single.sh
```

**Script performs**:
1. Updates system packages
2. Installs dependencies
3. Clones repository
4. Sets up Python environment
5. Installs Node.js packages
6. Configures MongoDB
7. Deploys smart contract
8. Starts services
9. Sets up Nginx reverse proxy
10. Configures SSL

#### Manual Production Setup

**1. Server Setup**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip nodejs npm mongodb nginx

# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

**2. Clone and Configure**:
```bash
cd /opt
sudo git clone https://github.com/th30d4y/OpenLearnX.git
cd OpenLearnX

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build
```

**3. Deploy Contract** (if using public network):
```bash
# Set up Ethereum node or use Alchemy/Infura
# Update deploy script with production network
cd backend
python3 scripts/deploy.py --network mainnet
```

**4. Configure Nginx**:
```nginx
# /etc/nginx/sites-available/openlearnx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/openlearnx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d your-domain.com
```

**5. Process Management** (systemd):

Backend service (`/etc/systemd/system/openlearnx-backend.service`):
```ini
[Unit]
Description=OpenLearnX Backend
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/OpenLearnX/backend
Environment="PATH=/opt/OpenLearnX/backend/venv/bin"
ExecStart=/opt/OpenLearnX/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Frontend service (`/etc/systemd/system/openlearnx-frontend.service`):
```ini
[Unit]
Description=OpenLearnX Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/OpenLearnX/frontend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start services
sudo systemctl daemon-reload
sudo systemctl enable openlearnx-backend openlearnx-frontend
sudo systemctl start openlearnx-backend openlearnx-frontend
```

---

## 🔒 Security Features

### 1. Wallet-Based Authentication
- No passwords to leak or hack
- Cryptographic signature verification
- User owns their identity (wallet)
- Prevents phishing attacks

### 2. Smart Contract Security
- Uses OpenZeppelin audited contracts
- Access control (only owner can mint)
- Non-transferable certificates (soulbound tokens)
- Immutable once minted

### 3. Code Execution Sandbox
- Docker containerization
- Resource limits (CPU, memory, time)
- No network access
- Read-only file system
- Process isolation

### 4. Data Encryption
- AES encryption for sensitive data
- HTTPS/TLS in production
- JWT with signature verification
- Encrypted database connections

### 5. Input Validation
- All inputs sanitized
- SQL injection prevention (using ORM)
- XSS protection
- CSRF tokens

### 6. Rate Limiting
- API rate limits (Redis)
- Prevents DDoS attacks
- Per-user request limits
- Gradual backoff

### 7. Secure File Handling
- File type validation
- Size limits
- Virus scanning (production)
- Isolated storage

### 8. Audit Logging
- All critical actions logged
- User activity tracking
- Security event monitoring
- Compliance ready

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/OpenLearnX.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Test Locally**
   ```bash
   # Backend tests
   cd backend
   pytest

   # Frontend tests
   cd frontend
   npm test
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new adaptive algorithm"
   ```

   **Commit Message Format**:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Test changes
   - `chore:` - Build/tool changes

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Open Pull Request on GitHub
   ```

### Code Style Guidelines

**Python**:
- Follow PEP 8
- Use type hints
- Write docstrings for functions
- Maximum line length: 88 characters (Black formatter)

**TypeScript/React**:
- Use TypeScript strict mode
- Functional components with hooks
- ESLint and Prettier compliant
- Meaningful component names

**Smart Contracts**:
- Follow Solidity style guide
- Extensive comments
- Gas optimization
- Security first

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation improvements
- 🌐 Translations/i18n
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🧪 Test coverage
- 🔒 Security audits

---

## 📊 Project Status & Roadmap

### Current Status
✅ **Alpha Release** - Core features functional, under active development

### Completed Features
- [x] Wallet authentication
- [x] Basic quiz system
- [x] Adaptive testing algorithm
- [x] NFT certificate minting
- [x] Multi-language compiler
- [x] Student dashboard
- [x] Course management
- [x] Admin panel

### In Progress
- [ ] AI question generation refinement
- [ ] Peer review system
- [ ] Enhanced analytics
- [ ] Mobile app (React Native)

### Planned Features
- [ ] Live proctoring for exams
- [ ] Video lessons integration
- [ ] Gamification (badges, leaderboards)
- [ ] Social features (study groups, forums)
- [ ] Marketplace for courses
- [ ] Integration with job platforms
- [ ] Multi-language support (i18n)
- [ ] Offline mode (PWA)
- [ ] AI tutor chatbot
- [ ] Advanced bias detection

---

## 📞 Support & Community

### Getting Help
- 📖 **Documentation**: This file and inline code comments
- 💬 **Discussions**: GitHub Discussions tab
- 🐛 **Issues**: GitHub Issues for bug reports
- 📧 **Email**: [Project maintainer email]

### Community Guidelines
- Be respectful and inclusive
- Help others learn and grow
- Share knowledge freely
- Report security issues privately

---

## 📄 License

[Include license information here - e.g., MIT, Apache 2.0]

---

## 🙏 Acknowledgments

- **OpenZeppelin**: Secure smart contract libraries
- **Foundry**: Blazing fast Ethereum development toolkit
- **Next.js**: React framework for production
- **TensorFlow**: Machine learning framework
- **MongoDB**: Flexible database solution
- **shadcn/ui**: Beautiful component library
- **All Contributors**: Thank you for making OpenLearnX better!

---

## 📈 Statistics

- **Lines of Code**: ~8,000+ (backend Python)
- **Smart Contracts**: 1 deployed (CertificateNFT)
- **API Endpoints**: 30+
- **Supported Languages**: 8+ (compiler)
- **Dependencies**: 
  - Python: 50+ packages
  - Node.js: 60+ packages
- **Database Collections**: 6 primary collections

---

## 🔮 Vision for the Future

OpenLearnX aims to become the **de facto standard for verifiable online learning**. We envision a world where:

1. **Every learner** owns their educational data and credentials
2. **Employers** can instantly verify candidate skills
3. **Education** is accessible, personalized, and continuous
4. **Certificates** are globally recognized and tamper-proof
5. **Learning** adapts to individual needs in real-time

Join us in revolutionizing education! 🚀

---

**Last Updated**: 2026-01-31
**Version**: 1.0.0
**Maintainer**: OpenLearnX Team
