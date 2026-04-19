#!/usr/bin/env python3
"""
Simple deployment script for OpenLearnX smart contracts using Anvil
"""
import os
import json
from pathlib import Path
import subprocess
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

def deploy_contract():
    provider_url = os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545')
    
    # Connect to Web3
    w3 = Web3(Web3.HTTPProvider(provider_url))
    
    if not w3.is_connected():
        raise Exception(f"Failed to connect to {provider_url}")
    
    print(f"✓ Connected to {provider_url}")
    print(f"Chain ID: {w3.eth.chain_id}")
    
    # Use Anvil's first account (well-known test account)
    # Get all accounts
    accounts = w3.eth.accounts
    if not accounts:
        raise Exception("No accounts available in Anvil")
    
    deployer = accounts[0]
    balance = w3.eth.get_balance(deployer)
    print(f"✓ Deployer account: {deployer}")
    print(f"✓ Balance: {w3.from_wei(balance, 'ether')} ETH")
    
    # Load contract
    contract_path = BASE_DIR / "out" / "CertificateNFT.sol" / "CertificateNFT.json"
    
    if not contract_path.exists():
        print("❌ Contract JSON not found. Running forge build...")
        result = subprocess.run(["forge", "build"], cwd=BASE_DIR, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"forge build failed: {result.stderr}")
    
    with open(contract_path, 'r') as f:
        contract_data = json.load(f)
    
    print(f"✓ Loaded contract ABI and bytecode")
    
    # Create contract
    contract = w3.eth.contract(
        abi=contract_data['abi'],
        bytecode=contract_data['bytecode']['object']
    )
    
    # Deploy
    print("⏳ Deploying contract...")
    tx_hash = contract.constructor().transact({
        'from': deployer,
        'gas': 5000000,
        'gasPrice': w3.to_wei('1', 'gwei')
    })
    
    print(f"✓ Transaction sent: {tx_hash.hex()}")
    print("⏳ Waiting for receipt...")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
    
    contract_address = receipt.contractAddress
    print(f"\n✅ Contract deployed successfully!")
    print(f"📍 Contract Address: {contract_address}")
    print(f"⛽ Gas Used: {receipt.gasUsed}")
    
    # Save deployment info
    deployment_info = {
        'contract_address': contract_address,
        'transaction_hash': tx_hash.hex(),
        'deployer': deployer,
        'network': 'anvil',
        'abi': contract_data['abi'],
        'gas_used': receipt.gasUsed,
        'block_number': receipt.blockNumber
    }
    
    deployment_file = BASE_DIR / "deployment.json"
    with open(deployment_file, 'w') as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"✓ Deployment info saved to: {deployment_file}")
    print(f"\n📝 Update your .env file:")
    print(f"CONTRACT_ADDRESS={contract_address}")
    
    return contract_address

if __name__ == '__main__':
    try:
        address = deploy_contract()
        print(f"\n✨ Deployment complete!")
    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)
