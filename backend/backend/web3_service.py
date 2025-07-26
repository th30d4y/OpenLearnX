from web3 import Web3
from eth_account.messages import encode_defunct
import json
import secrets
import time
from typing import Optional, Dict, Any
from pathlib import Path

class Web3Service:
    def __init__(self, provider_url: str, contract_address: Optional[str] = None):
        self.w3 = Web3(Web3.HTTPProvider(provider_url))
        self.contract_address = contract_address
        self.contract = None
        
        if contract_address:
            self.load_contract()
    
    def load_contract(self):
        """Load the smart contract ABI and create contract instance"""
        try:
            # Updated path to match Foundry's output structure
            contract_path = Path('out/CertificateNFT.sol/CertificateNFT.json')
            
            if not contract_path.exists():
                print(f"Contract JSON not found at {contract_path}")
                return
                
            with open(contract_path, 'r') as f:
                contract_data = json.load(f)
                abi = contract_data['abi']
                
            self.contract = self.w3.eth.contract(
                address=self.contract_address,
                abi=abi
            )
            print(f"Contract loaded successfully at {self.contract_address}")
            
        except Exception as e:
            print(f"Failed to load contract: {e}")
    
    def generate_nonce(self) -> str:
        """Generate a random nonce for signature verification"""
        return secrets.token_hex(16)
    
    def verify_signature(self, address: str, message: str, signature: str) -> bool:
        """Verify MetaMask signature"""
        try:
            # Create the message that was signed
            message_hash = encode_defunct(text=message)
            
            # Recover the address from signature
            recovered_address = self.w3.eth.account.recover_message(
                message_hash, 
                signature=signature
            )
            
            # Compare addresses (case insensitive)
            return recovered_address.lower() == address.lower()
        except Exception as e:
            print(f"Signature verification failed: {e}")
            return False
    
    def mint_certificate(self, to_address: str, token_uri: str, private_key: str) -> Optional[str]:
        """Mint an NFT certificate using the simple mintCertificate function"""
        if not self.contract:
            raise Exception("Contract not loaded")
        
        try:
            # Get account from private key
            account = self.w3.eth.account.from_key(private_key)
            
            # Build transaction
            transaction = self.contract.functions.mintCertificate(
                to_address, 
                token_uri
            ).build_transaction({
                'from': account.address,
                'nonce': self.w3.eth.get_transaction_count(account.address),
                'gas': 500000,  # Increased gas limit
                'gasPrice': self.w3.to_wei('20', 'gwei')
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt.status == 1:
                print(f"Certificate minted successfully. TX: {receipt.transactionHash.hex()}")
                return receipt.transactionHash.hex()
            else:
                print(f"Transaction failed. Status: {receipt.status}")
                return None
            
        except Exception as e:
            print(f"Minting failed: {e}")
            return None
    
    def mint_certificate_with_details(self, to_address: str, token_uri: str, 
                                    subject: str, student_name: str, score: int, 
                                    private_key: str) -> Optional[str]:
        """Mint an NFT certificate with detailed information"""
        if not self.contract:
            raise Exception("Contract not loaded")
        
        try:
            # Get account from private key
            account = self.w3.eth.account.from_key(private_key)
            
            # Build transaction with detailed function
            transaction = self.contract.functions.mintCertificateWithDetails(
                to_address,
                token_uri,
                subject,
                student_name,
                score
            ).build_transaction({
                'from': account.address,
                'nonce': self.w3.eth.get_transaction_count(account.address),
                'gas': 600000,  # Higher gas for detailed function
                'gasPrice': self.w3.to_wei('20', 'gwei')
            })
            
            # Sign and send transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt.status == 1:
                print(f"Detailed certificate minted successfully. TX: {receipt.transactionHash.hex()}")
                return receipt.transactionHash.hex()
            else:
                print(f"Transaction failed. Status: {receipt.status}")
                return None
            
        except Exception as e:
            print(f"Detailed minting failed: {e}")
            return None
    
    def get_certificate_details(self, token_id: int) -> Optional[Dict]:
        """Get certificate details by token ID"""
        if not self.contract:
            return None
            
        try:
            # Get certificate struct data
            certificate = self.contract.functions.getCertificate(token_id).call()
            
            # Get owner and token URI
            owner = self.contract.functions.ownerOf(token_id).call()
            token_uri = self.contract.functions.tokenURI(token_id).call()
            
            return {
                'token_id': token_id,
                'owner': owner,
                'token_uri': token_uri,
                'subject': certificate[0],
                'student_name': certificate[1],
                'score': certificate[2],
                'timestamp': certificate[3],
                'verified': certificate[4]
            }
        except Exception as e:
            print(f"Failed to get certificate details: {e}")
            return None
    
    def get_user_certificates(self, user_address: str) -> Optional[list]:
        """Get all certificate token IDs for a user"""
        if not self.contract:
            return None
            
        try:
            token_ids = self.contract.functions.getUserCertificates(user_address).call()
            return token_ids
        except Exception as e:
            print(f"Failed to get user certificates: {e}")
            return None
    
    def verify_certificate(self, token_id: int) -> bool:
        """Verify if a certificate is valid"""
        if not self.contract:
            return False
            
        try:
            is_verified = self.contract.functions.verifyCertificate(token_id).call()
            return is_verified
        except Exception as e:
            print(f"Failed to verify certificate: {e}")
            return False
    
    def get_total_supply(self) -> int:
        """Get total number of certificates minted"""
        if not self.contract:
            return 0
            
        try:
            total = self.contract.functions.totalSupply().call()
            return total
        except Exception as e:
            print(f"Failed to get total supply: {e}")
            return 0
    
    def get_latest_token_id(self) -> int:
        """Get the latest token ID (useful for getting newly minted certificate)"""
        return self.get_total_supply()
    
    def get_transaction_receipt(self, tx_hash: str) -> Optional[Dict]:
        """Get transaction receipt for a given hash"""
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return {
                'transaction_hash': receipt.transactionHash.hex(),
                'block_number': receipt.blockNumber,
                'gas_used': receipt.gasUsed,
                'status': receipt.status,
                'contract_address': receipt.contractAddress
            }
        except Exception as e:
            print(f"Failed to get transaction receipt: {e}")
            return None
    
    def is_connected(self) -> bool:
        """Check if connected to blockchain"""
        try:
            return self.w3.is_connected()
        except:
            return False
    
    def get_balance(self, address: str) -> float:
        """Get ETH balance for an address"""
        try:
            balance_wei = self.w3.eth.get_balance(address)
            return self.w3.from_wei(balance_wei, 'ether')
        except Exception as e:
            print(f"Failed to get balance: {e}")
            return 0.0
    
    def get_gas_price(self) -> int:
        """Get current gas price"""
        try:
            return self.w3.eth.gas_price
        except Exception as e:
            print(f"Failed to get gas price: {e}")
            return self.w3.to_wei('20', 'gwei')  # Default fallback
    
    def estimate_gas(self, to_address: str, token_uri: str, account_address: str) -> int:
        """Estimate gas for certificate minting"""
        if not self.contract:
            return 500000  # Default estimate
            
        try:
            gas_estimate = self.contract.functions.mintCertificate(
                to_address, 
                token_uri
            ).estimate_gas({'from': account_address})
            
            # Add 20% buffer
            return int(gas_estimate * 1.2)
            
        except Exception as e:
            print(f"Failed to estimate gas: {e}")
            return 500000  # Default fallback
    
    def get_contract_info(self) -> Dict:
        """Get basic contract information"""
        if not self.contract:
            return {}
            
        try:
            return {
                'address': self.contract_address,
                'total_certificates': self.get_total_supply(),
                'is_connected': self.is_connected(),
                'network_id': self.w3.eth.chain_id,
                'latest_block': self.w3.eth.block_number
            }
        except Exception as e:
            print(f"Failed to get contract info: {e}")
            return {}
