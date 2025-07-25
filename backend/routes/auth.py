from flask import Blueprint, request, jsonify, current_app
import jwt
from datetime import datetime, timedelta
import secrets

bp = Blueprint("auth", __name__)

# Store nonces temporarily (in production, use Redis or database)
nonces = {}

@bp.route("/nonce", methods=["POST"])
def get_nonce():
    data = request.get_json()
    wallet_address = data.get("wallet_address")
    
    if not wallet_address:
        return jsonify({"error": "wallet_address is required"}), 400
    
    # Generate nonce
    nonce = secrets.token_hex(16)
    message = f"Sign this message to authenticate with OpenLearnX: {nonce}"
    
    # Store nonce for this wallet address
    nonces[wallet_address.lower()] = nonce
    
    return jsonify({"nonce": nonce, "message": message})

@bp.route("/verify", methods=["POST"])
def verify_signature():
    data = request.get_json()
    wallet_address = data.get("wallet_address", "").lower()
    signature = data.get("signature")
    message = data.get("message")
    
    if not all([wallet_address, signature, message]):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Verify nonce
    stored_nonce = nonces.get(wallet_address)
    if not stored_nonce or stored_nonce not in message:
        return jsonify({"error": "Invalid nonce"}), 400
    
    try:
        web3_service = current_app.config["WEB3_SERVICE"]
        
        # Verify signature
        if not web3_service.verify_signature(wallet_address, message, signature):
            return jsonify({"error": "Invalid signature"}), 401
        
        # For now, create a mock user without database operations
        # This bypasses the async MongoDB issues entirely
        user = {
            "_id": f"user_{wallet_address}",
            "wallet_address": wallet_address,
            "created_at": datetime.utcnow(),
            "total_tests": 0,
            "certificates": []
        }
        
        # Create JWT token
        token_payload = {
            "user_id": str(user["_id"]),
            "wallet_address": wallet_address,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        token = jwt.encode(
            token_payload, 
            current_app.config["SECRET_KEY"], 
            algorithm="HS256"
        )
        
        # Clean up nonce
        if wallet_address in nonces:
            del nonces[wallet_address]
        
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "wallet_address": user["wallet_address"],
                "total_tests": user.get("total_tests", 0),
                "certificates": len(user.get("certificates", []))
            }
        })
        
    except Exception as e:
        print(f"Authentication error: {str(e)}")
        return jsonify({"error": "Authentication failed"}), 500
