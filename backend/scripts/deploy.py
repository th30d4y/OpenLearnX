#!/usr/bin/env python3
"""
Deployment script for OpenLearnX smart contracts
"""
import os
import json
from pathlib import Path
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

# Load environment variables from backend/.env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

def deploy_contract():
    # Load environment variables
    provider_url = os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545')
    private_key = os.getenv('DEPLOYER_PRIVATE_KEY')
    
    if not private_key:
        raise ValueError("DEPLOYER_PRIVATE_KEY environment variable required")
    
    # Connect to Web3
    w3 = Web3(Web3.HTTPProvider(provider_url))
    
    if not w3.is_connected():
        raise Exception(f"Failed to connect to {provider_url}")
    
    account = Account.from_key(private_key)
    
    print(f"Deploying from account: {account.address}")
    print(f"Balance: {w3.eth.get_balance(account.address) / 10**18} ETH")
    
    # Load contract bytecode and ABI
    contract_path = BASE_DIR / "out" / "CertificateNFT.sol" / "CertificateNFT.json"
    
    if not contract_path.exists():
        print("Contract not compiled. Running forge build...")
        import subprocess
        result = subprocess.run(["forge", "build"], cwd=BASE_DIR, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"forge build failed: {result.stderr}")
    
    with open(contract_path, 'r') as f:
        contract_data = json.load(f)
    
    # Deploy contract
    contract = w3.eth.contract(
        abi=contract_data['abi'],
        bytecode=contract_data['bytecode']['object']
    )
    
    # Build transaction with higher gas limit
    transaction = contract.constructor().build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 5000000,  # Increased gas limit
        'gasPrice': w3.to_wei('20', 'gwei')
    })
    
    # Sign and send transaction
    signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    
    print(f"Transaction hash: {tx_hash.hex()}")
    
    # Wait for receipt with timeout
    try:
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
        
        # Check if transaction was successful
        if receipt.status == 0:
            raise Exception("Transaction failed - check gas limit and contract code")
        
        contract_address = receipt.contractAddress
        
        if not contract_address:
            raise Exception("Contract address is None - deployment failed")
        
        print(f"Contract deployed at: {contract_address}")
        print(f"Gas used: {receipt.gasUsed}")
        print(f"Transaction status: {'Success' if receipt.status == 1 else 'Failed'}")
        
    except Exception as e:
        print(f"Error waiting for transaction receipt: {e}")
        return None
    
    # Save deployment info
    deployment_info = {
        'contract_address': contract_address,
        'transaction_hash': tx_hash.hex(),
        'deployer': account.address,
        'network': 'local' if 'localhost' in provider_url or '127.0.0.1' in provider_url else 'unknown',
        'abi': contract_data['abi'],
        'gas_used': receipt.gasUsed,
        'block_number': receipt.blockNumber,
        'status': receipt.status
    }
    
    deployment_file = BASE_DIR / "deployment.json"
    with open(deployment_file, 'w') as f:
        json.dump(deployment_info, f, indent=2)
    
    print(f"Deployment info saved to: {deployment_file}")
    print(f"\nAdd this to your .env file:")
    print(f"CONTRACT_ADDRESS={contract_address}")
    
    return contract_address

if __name__ == '__main__':
    try:
        contract_address = deploy_contract()
        if contract_address:
            print(f"\n✅ Deployment successful!")
            print(f"Contract Address: {contract_address}")
        else:
            print(f"\n❌ Deployment failed!")
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
