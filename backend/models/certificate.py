from datetime import datetime
import secrets
import string
from cryptography.fernet import Fernet
import os
import base64
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import json

class CertificateManager:
    def __init__(self):
        # AES-256 key (store this securely in environment variables)
        self.key = os.getenv('AES_ENCRYPTION_KEY', self._generate_key())
    
    def _generate_key(self):
        """Generate a new AES-256 key"""
        return base64.b64encode(get_random_bytes(32)).decode('utf-8')
    
    def encrypt_wallet_id(self, wallet_id):
        """Encrypt wallet ID using AES-256"""
        try:
            key = base64.b64decode(self.key)
            cipher = AES.new(key, AES.MODE_CBC)
            ct_bytes = cipher.encrypt(pad(wallet_id.encode('utf-8'), AES.block_size))
            iv = base64.b64encode(cipher.iv).decode('utf-8')
            ct = base64.b64encode(ct_bytes).decode('utf-8')
            return {"iv": iv, "encrypted": ct}
        except Exception as e:
            print(f"Encryption error: {e}")
            return None
    
    def decrypt_wallet_id(self, encrypted_data):
        """Decrypt wallet ID"""
        try:
            key = base64.b64decode(self.key)
            iv = base64.b64decode(encrypted_data['iv'])
            ct = base64.b64decode(encrypted_data['encrypted'])
            cipher = AES.new(key, AES.MODE_CBC, iv)
            pt = unpad(cipher.decrypt(ct), AES.block_size)
            return pt.decode('utf-8')
        except Exception as e:
            print(f"Decryption error: {e}")
            return None
    
    def generate_certificate_id(self):
        """Generate random certificate ID"""
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(12))
