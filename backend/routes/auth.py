from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
import uuid
import jwt
import logging
from eth_account.messages import encode_defunct
from web3 import Web3

bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client.openlearnx

# JWT secret
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-here')

@bp.route('/nonce', methods=['POST', 'OPTIONS'])
def get_nonce():
    """Generate nonce for MetaMask authentication"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        
        if not wallet_address:
            return jsonify({
                "success": False,
                "error": "Wallet address required"
            }), 400
        
        # Generate unique nonce
        nonce = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create message to sign
        message = f"Sign this message to authenticate with OpenLearnX:\n\nNonce: {nonce}\nTimestamp: {timestamp}\nAddress: {wallet_address}"
        
        logger.info(f"🔐 Generated nonce for wallet: {wallet_address}")
        
        return jsonify({
            "success": True,
            "nonce": nonce,
            "message": message,
            "timestamp": timestamp
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating nonce: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/verify', methods=['POST', 'OPTIONS'])
def verify_signature():
    """Verify MetaMask signature and authenticate user"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        signature = data.get('signature')
        message = data.get('message')
        
        if not all([wallet_address, signature, message]):
            return jsonify({
                "success": False,
                "error": "Wallet address, signature, and message are required"
            }), 400
        
        # Verify the signature
        try:
            # Create the message hash that was signed
            message_hash = encode_defunct(text=message)
            
            # Recover the address from the signature
            w3 = Web3()
            recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
            
            # Check if recovered address matches the claimed address
            if recovered_address.lower() != wallet_address.lower():
                return jsonify({
                    "success": False,
                    "error": "Signature verification failed"
                }), 401
                
        except Exception as e:
            logger.error(f"❌ Signature verification error: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Invalid signature"
            }), 401
        
        # Check if user exists, create if not
        user = db.users.find_one({"wallet_address": wallet_address.lower()})
        
        if not user:
            # Create new user
            user = {
                "wallet_address": wallet_address.lower(),
                "created_at": datetime.now(),
                "last_login": datetime.now(),
                "login_count": 1
            }
            result = db.users.insert_one(user)
            user["_id"] = str(result.inserted_id)
            logger.info(f"✅ Created new user: {wallet_address}")
        else:
            # Update existing user
            db.users.update_one(
                {"wallet_address": wallet_address.lower()},
                {
                    "$set": {"last_login": datetime.now()},
                    "$inc": {"login_count": 1}
                }
            )
            user["_id"] = str(user["_id"])
            logger.info(f"✅ Updated existing user: {wallet_address}")
        
        # Generate JWT token
        token_payload = {
            "user_id": user["wallet_address"],
            "wallet_address": user["wallet_address"],
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        
        # Prepare user data for response
        user_response = {
            "id": user["wallet_address"],
            "wallet_address": user["wallet_address"],
            "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
            "last_login": user["last_login"].isoformat() if isinstance(user["last_login"], datetime) else str(user["last_login"])
        }
        
        logger.info(f"✅ Authentication successful for: {wallet_address}")
        
        return jsonify({
            "success": True,
            "token": token,
            "user": user_response,
            "message": "Authentication successful"
        })
        
    except Exception as e:
        logger.error(f"❌ Error verifying signature: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500