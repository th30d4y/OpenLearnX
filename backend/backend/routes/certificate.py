from flask import Blueprint, request, jsonify, current_app
import jwt

bp = Blueprint('certificate', __name__)

def get_user_from_token(token):
    """Extract user from JWT token"""
    try:
        payload = jwt.decode(
            token, 
            current_app.config['SECRET_KEY'], 
            algorithms=['HS256']
        )
        return payload['user_id'], payload['wallet_address']
    except:
        return None, None

@bp.route('/user/<user_id>', methods=['GET'])
async def get_user_certificates(user_id):
    """Get all certificates for a user"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    token_user_id, _ = get_user_from_token(token)
    
    if not token_user_id or token_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    mongo_service = current_app.config['MONGO_SERVICE']
    certificates = await mongo_service.get_user_certificates(user_id)
    
    return jsonify({"certificates": certificates or []})

@bp.route('/mint', methods=['POST'])
async def mint_certificate():
    """Mint NFT certificate for completed test"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id, wallet_address = get_user_from_token(token)
    
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    # Mock certificate minting for now
    return jsonify({
        "success": True,
        "certificate": {
            "token_id": 1,
            "transaction_hash": "0x123...",
            "message": "Certificate minting functionality ready"
        }
    })
