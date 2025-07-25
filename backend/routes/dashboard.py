from flask import Blueprint, request, jsonify, current_app
import jwt
from datetime import datetime, timedelta

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
    
    if not analytics:
        return jsonify({"error": "User not found"}), 404
    
    # Get recent activity
    recent_sessions = await mongo_service.test_sessions.find({
        "user_id": user_id
    }).sort("created_at", -1).limit(5).to_list(length=5)
    
    # Get certificates
    certificates = await mongo_service.get_user_certificates(user_id)
    
    # Calculate streaks and progress
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    week_sessions = [s for s in recent_sessions 
                    if s['created_at'].date() >= week_ago]
    month_sessions = [s for s in recent_sessions 
                     if s['created_at'].date() >= month_ago]
    
    dashboard_data = {
        "user_info": {
            "id": str(analytics['user']['_id']),
            "wallet_address": analytics['user']['wallet_address'],
            "member_since": analytics['user']['created_at'].isoformat(),
            "last_login": analytics['user']['last_login'].isoformat()
        },
        "overview": {
            "total_tests": analytics['total_tests'],
            "completed_tests": analytics['completed_tests'],
            "average_score": round(analytics['average_score'] * 100, 1),
            "certificates_earned": analytics['certificates_earned'],
            "this_week_tests": len(week_sessions),
            "this_month_tests": len(month_sessions)
        },
        "subject_breakdown": {
            subject: {
                "tests_taken": data['tests'],
                "average_score": round(data['avg_score'] * 100, 1),
                "mastery_level": get_mastery_level(data['avg_score'])
            }
            for subject, data in analytics['subject_breakdown'].items()
        },
        "recent_activity": [
            {
                "id": str(session['_id']),
                "subject": session['subject'],
                "score": round(session.get('score', 0) * 100, 1),
                "completed": session.get('completed', False),
                "date": session['created_at'].isoformat(),
                "questions_answered": len(session.get('answers', []))
            }
            for session in recent_sessions
        ],
        "certificates": [
            {
                "id": str(cert['_id']),
                "token_id": cert['token_id'],
                "subject": cert['subject'],
                "score": round(cert['score'] * 100, 1),
                "earned_date": cert['created_at'].isoformat(),
                "blockchain_verified": cert.get('verified', True)
            }
            for cert in certificates
        ],
        "progress_chart": await get_progress_chart_data(mongo_service, user_id),
        "competency_radar": get_competency_radar_data(analytics['subject_breakdown'])
    }
    
    return jsonify(dashboard_data)

@bp.route('/instructor/overview', methods=['GET'])
async def get_instructor_dashboard():
    """Get instructor dashboard with class overview"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_from_token(token)
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    mongo_service = current_app.config['MONGO_SERVICE']
    
    # Get overall platform statistics
    total_users = await mongo_service.users.count_documents({})
    total_tests = await mongo_service.test_sessions.count_documents({})
    total_certificates = await mongo_service.certificates.count_documents({})
    
    # Get recent activity across all users
    recent_sessions = await mongo_service.test_sessions.find({}).sort(
        "created_at", -1
    ).limit(20).to_list(length=20)
    
    # Calculate subject popularity
    subject_stats = {}
    for session in recent_sessions:
        subject = session.get('subject', 'Unknown')
        if subject not in subject_stats:
            subject_stats[subject] = {'count': 0, 'total_score': 0}
        subject_stats[subject]['count'] += 1
        subject_stats[subject]['total_score'] += session.get('score', 0)
    
    for subject in subject_stats:
        subject_stats[subject]['avg_score'] = (
            subject_stats[subject]['total_score'] / subject_stats[subject]['count']
        )
    
    dashboard_data = {
        "platform_overview": {
            "total_users": total_users,
            "total_tests": total_tests,
            "total_certificates": total_certificates,
            "active_users_today": len([s for s in recent_sessions 
                                     if s['created_at'].date() == datetime.utcnow().date()])
        },
        "subject_performance": {
            subject: {
                "total_attempts": data['count'],
                "average_score": round(data['avg_score'] * 100, 1),
                "difficulty_trend": "increasing" if data['avg_score'] > 0.7 else "stable"
            }
            for subject, data in subject_stats.items()
        },
        "recent_activity": [
            {
                "user_id": session['user_id'],
                "subject": session['subject'],
                "score": round(session.get('score', 0) * 100, 1),
                "completed": session.get('completed', False),
                "timestamp": session['created_at'].isoformat()
            }
            for session in recent_sessions[:10]
        ]
    }
    
    return jsonify(dashboard_data)

def get_mastery_level(score):
    """Determine mastery level based on score"""
    if score >= 0.9:
        return "Expert"
    elif score >= 0.8:
        return "Advanced"
    elif score >= 0.7:
        return "Proficient"
    elif score >= 0.6:
        return "Developing"
    else:
        return "Beginner"

async def get_progress_chart_data(mongo_service, user_id):
    """Get progress chart data for the last 30 days"""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    sessions = await mongo_service.test_sessions.find({
        "user_id": user_id,
        "created_at": {"$gte": thirty_days_ago},
        "completed": True
    }).sort("created_at", 1).to_list(length=None)
    
    progress_data = []
    for session in sessions:
        progress_data.append({
            "date": session['created_at'].strftime("%Y-%m-%d"),
            "score": round(session.get('score', 0) * 100, 1),
            "subject": session['subject']
        })
    
    return progress_data

def get_competency_radar_data(subject_breakdown):
    """Generate radar chart data for competencies"""
    radar_data = []
    for subject, data in subject_breakdown.items():
        radar_data.append({
            "subject": subject,
            "score": round(data['avg_score'] * 100, 1),
            "tests": data['tests']
        })
    
    return radar_data
