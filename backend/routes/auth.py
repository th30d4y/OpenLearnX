from flask import Blueprint, request, jsonify, current_app
import jwt
from datetime import datetime, timedelta
import uuid

bp = Blueprint('auth', __name__)

@bp.route('/nonce', methods=['POST'])
async def get_nonce():
    """Generate nonce for wallet signature"""
    data = request.get_json()
    wallet_address = data.get('wallet_address')
    
    if not wallet_address:
        return jsonify({"error": "Wallet address required"}), 400
    
    web3_service = current_app.config['WEB3_SERVICE']
    nonce = web3_service.generate_nonce()
    
    # Store nonce temporarily (in production, use Redis)
    message = f"Sign this message to authenticate with OpenLearnX: {nonce}"
    
    return jsonify({
        "nonce": nonce,
        "message": message
    })

@bp.route('/verify', methods=['POST'])
async def verify_signature():
    """Verify MetaMask signature and create session"""
    data = request.get_json()
    wallet_address = data.get('wallet_address')
    signature = data.get('signature')
    message = data.get('message')
    
    if not all([wallet_address, signature, message]):
        return jsonify({"error": "Missing required fields"}), 400
    
    web3_service = current_app.config['WEB3_SERVICE']
    mongo_service = current_app.config['MONGO_SERVICE']
    
    # Verify signature
    if not web3_service.verify_signature(wallet_address, message, signature):
        return jsonify({"error": "Invalid signature"}), 401
    
    # Create or get user
    user = await mongo_service.create_user(wallet_address)
    await mongo_service.update_user_login(wallet_address)
    
    # Create JWT token
    token_payload = {
        'user_id': str(user['_id']),
        'wallet_address': wallet_address,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    
    token = jwt.encode(
        token_payload, 
        current_app.config['SECRET_KEY'], 
        algorithm='HS256'
    )
    
    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": str(user['_id']),
            "wallet_address": user['wallet_address'],
            "created_at": user['created_at'].isoformat(),
            "total_tests": user.get('total_tests', 0),
            "certificates": len(user.get('certificates', []))
        }
    })

@bp.route('/profile', methods=['GET'])
async def get_profile():
    """Get user profile"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        return jsonify({"error": "Token required"}), 401
    
    try:
        payload = jwt.decode(
            token, 
            current_app.config['SECRET_KEY'], 
            algorithms=['HS256']
        )
        user_id = payload['user_id']
        
        mongo_service = current_app.config['MONGO_SERVICE']
        analytics = await mongo_service.get_user_analytics(user_id)
        
        return jsonify(analytics)
        
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
