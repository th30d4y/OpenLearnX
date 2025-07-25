from flask import Blueprint, request, jsonify, current_app
import jwt
import json
import uuid
from datetime import datetime

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

@bp.route('/mint', methods=['POST'])
async def mint_certificate():
    """Mint NFT certificate for completed test"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id, wallet_address = get_user_from_token(token)
    
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    data = request.get_json()
    session_id = data.get('session_id')
    
    mongo_service = current_app.config['MONGO_SERVICE']
    web3_service = current_app.config['WEB3_SERVICE']
    
    # Get completed session
    session = await mongo_service.get_test_session(session_id)
    
    if not session or not session.get('completed'):
        return jsonify({"error": "Test session not completed"}), 400
    
    if session['user_id'] != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Check if certificate already minted for this session
    existing_cert = await mongo_service.certificates.find_one({"session_id": session_id})
    if existing_cert:
        return jsonify({"error": "Certificate already minted"}), 400
    
    # Create certificate metadata
    certificate_metadata = {
        "name": f"OpenLearnX Certificate - {session['subject']}",
        "description": f"Certificate of completion for {session['subject']} assessment",
        "image": f"https://certificates.openlearnx.com/{session_id}.png",
        "attributes": [
            {"trait_type": "Subject", "value": session['subject']},
            {"trait_type": "Score", "value": f"{session['score']:.1%}"},
            {"trait_type": "Date", "value": session['created_at'].strftime("%Y-%m-%d")},
            {"trait_type": "Questions", "value": len(session.get('answers', []))},
            {"trait_type": "Difficulty", "value": session.get('current_difficulty', 2)}
        ],
        "certificate_data": {
            "student_wallet": wallet_address,
            "subject": session['subject'],
            "score": session['score'],
            "completion_date": session.get('completed_at', datetime.utcnow()).isoformat(),
            "questions_answered": len(session.get('answers', [])),
            "session_id": session_id
        }
    }
    
    # Upload to IPFS (simplified - in production use proper IPFS service)
    ipfs_hash = f"Qm{uuid.uuid4().hex[:40]}"  # Mock IPFS hash
    token_uri = f"https://ipfs.io/ipfs/{ipfs_hash}"
    
    try:
        # Mint NFT (requires private key for the minting account)
        private_key = current_app.config.get('MINTER_PRIVATE_KEY')
        if not private_key:
            return jsonify({"error": "Minting not configured"}), 500
        
        tx_hash = web3_service.mint_certificate(
            wallet_address, 
            token_uri, 
            private_key
        )
        
        if not tx_hash:
            return jsonify({"error": "Minting failed"}), 500
        
        # Get token ID from transaction (simplified)
        token_id = await mongo_service.certificates.count_documents({}) + 1
        
        # Save certificate record
        cert_record = await mongo_service.create_certificate_record(
            user_id=user_id,
            token_id=token_id,
            tx_hash=tx_hash,
            ipfs_hash=ipfs_hash,
            subject=session['subject'],
            score=session['score']
        )
        
        # Update session with certificate info
        await mongo_service.update_test_session(session_id, {
            'certificate_minted': True,
            'certificate_token_id': token_id,
            'certificate_tx_hash': tx_hash
        })
        
        return jsonify({
            "success": True,
            "certificate": {
                "token_id": token_id,
                "transaction_hash": tx_hash,
                "ipfs_hash": ipfs_hash,
                "token_uri": token_uri,
                "metadata": certificate_metadata
            }
        })
        
    except Exception as e:
        return jsonify({"error": f"Minting failed: {str(e)}"}), 500

@bp.route('/verify/<int:token_id>', methods=['GET'])
async def verify_certificate(token_id):
    """Verify certificate by token ID"""
    web3_service = current_app.config['WEB3_SERVICE']
    mongo_service = current_app.config['MONGO_SERVICE']
    
    # Get certificate from blockchain
    cert_details = web3_service.get_certificate_details(token_id)
    
    if not cert_details:
        return jsonify({"error": "Certificate not found"}), 404
    
    # Get additional details from database
    db_cert = await mongo_service.certificates.find_one({"token_id": token_id})
    
    response = {
        "valid": True,
        "token_id": token_id,
        "owner": cert_details['owner'],
        "token_uri": cert_details['token_uri']
    }
    
    if db_cert:
        response.update({
            "subject": db_cert['subject'],
            "score": db_cert['score'],
            "issue_date": db_cert['created_at'].isoformat(),
            "transaction_hash": db_cert['transaction_hash']
        })
    
    return jsonify(response)

@bp.route('/user/<user_id>', methods=['GET'])
async def get_user_certificates(user_id):
    """Get all certificates for a user"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    token_user_id, _ = get_user_from_token(token)
    
    if not token_user_id or token_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    mongo_service = current_app.config['MONGO_SERVICE']
    certificates = await mongo_service.get_user_certificates(user_id)
    
    formatted_certs = []
    for cert in certificates:
        formatted_certs.append({
            "id": str(cert['_id']),
            "token_id": cert['token_id'],
            "subject": cert['subject'],
            "score": cert['score'],
            "created_at": cert['created_at'].isoformat(),
            "transaction_hash": cert['transaction_hash'],
            "verified": cert.get('verified', True)
        })
    
    return jsonify({"certificates": formatted_certs})
