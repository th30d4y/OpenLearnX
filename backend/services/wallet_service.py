from web3 import Web3
from eth_account import Account
from datetime import datetime
import hashlib
import secrets
import os  # ✅ Add this missing import

class WalletService:
    def __init__(self, web3_provider_url):
        self.w3 = Web3(Web3.HTTPProvider(web3_provider_url))
        
    def verify_wallet_signature(self, wallet_address, signature, message):
        """Verify wallet signature for authentication"""
        try:
            # Recover the address from signature
            message_hash = Web3.keccak(text=message)
            recovered_address = self.w3.eth.account.recover_message_hash(message_hash, signature=signature)
            
            return recovered_address.lower() == wallet_address.lower()
        except Exception as e:
            print(f"Signature verification error: {e}")
            return False
    
    def generate_auth_message(self, wallet_address, exam_code):
        """Generate message for wallet signing"""
        timestamp = int(datetime.now().timestamp())
        nonce = secrets.token_hex(16)
        
        message = f"""OpenLearnX Exam Authentication

Wallet: {wallet_address}
Exam Code: {exam_code}
Timestamp: {timestamp}
Nonce: {nonce}

Sign this message to join the coding exam."""
        
        return message, timestamp, nonce
    
    def create_wallet_session(self, wallet_address, exam_code, signature):
        """Create authenticated wallet session"""
        session_id = hashlib.sha256(f"{wallet_address}{exam_code}{datetime.now().timestamp()}".encode()).hexdigest()
        
        return {
            "session_id": session_id,
            "wallet_address": wallet_address,
            "exam_code": exam_code,
            "authenticated_at": datetime.now(),
            "signature": signature
        }

# Create the service instance
wallet_service = WalletService(os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545'))
