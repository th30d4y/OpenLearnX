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
## Completed:)
