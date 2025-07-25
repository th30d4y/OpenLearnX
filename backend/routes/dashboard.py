from flask import Blueprint, request, jsonify, current_app
import jwt

bp = Blueprint('dashboard', __name__)

def get_user_from_token(token):
    """Extract user from JWT token"""
    try:
        payload = jwt.decode(
            token, 
            current_app.config['SECRET_KEY'], 
            algorithms=['HS256']
        )
        return payload['user_id']
    except:
        return None

@bp.route('/student/<user_id>', methods=['GET'])
async def get_student_dashboard(user_id):
    """Get comprehensive student dashboard"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    token_user_id = get_user_from_token(token)
    
    if not token_user_id or token_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    mongo_service = current_app.config['MONGO_SERVICE']
    analytics = await mongo_service.get_user_analytics(user_id)
    
    return jsonify(analytics or {
        "user_info": {"id": user_id},
        "overview": {
            "total_tests": 0,
            "completed_tests": 0,
            "average_score": 0,
            "certificates_earned": 0
        },
        "subject_breakdown": {},
        "recent_activity": []
    })
