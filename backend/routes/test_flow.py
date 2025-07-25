from flask import Blueprint, request, jsonify, current_app
import jwt
from datetime import datetime

bp = Blueprint('test', __name__)

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

@bp.route('/start', methods=['POST'])
async def start_test():
    """Start a new test session"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_from_token(token)
    
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    data = request.get_json()
    subject = data.get('subject', 'General')
    
    mongo_service = current_app.config['MONGO_SERVICE']
    
    # Create test session
    session = await mongo_service.create_test_session(user_id, subject)
    
    # Get first question
    questions = await mongo_service.get_questions_by_difficulty(2, 1)
    
    if not questions:
        return jsonify({"error": "No questions available"}), 404
    
    question = questions[0]
    session['questions'].append(str(question['_id']))
    await mongo_service.update_test_session(str(session['_id']), {
        'questions': session['questions'],
        'current_question': 0
    })
    
    return jsonify({
        "session_id": str(session['_id']),
        "question": {
            "id": str(question['_id']),
            "question": question['question'],
            "options": question['options'],
            "subject": question['subject'],
            "difficulty": question['difficulty']
        },
        "question_number": 1,
        "total_questions": 10
    })

@bp.route('/answer', methods=['POST'])
async def submit_answer():
    """Submit answer and get feedback"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_user_from_token(token)
    
    if not user_id:
        return jsonify({"error": "Authentication required"}), 401
    
    data = request.get_json()
    session_id = data.get('session_id')
    question_id = data.get('question_id')
    answer = data.get('answer')
    
    mongo_service = current_app.config['MONGO_SERVICE']
    
    # Get session and question
    session = await mongo_service.get_test_session(session_id)
    question = await mongo_service.questions.find_one({"_id": question_id})
    
    if not session or not question:
        return jsonify({"error": "Invalid session or question"}), 404
    
    # Check answer
    is_correct = answer == question['correct_answer']
    
    # Provide feedback
    feedback = {
        "correct": is_correct,
        "confidence_score": 0.85 if is_correct else 0.25,
        "explanation": question['explanation'],
        "correct_answer": question['options'][question['correct_answer']],
        "current_score": 75.0,
        "total_answered": len(session.get('answers', [])) + 1
    }
    
    return jsonify({
        "feedback": feedback,
        "test_completed": False,
        "next_question": {
            "id": str(question['_id']),
            "question": "Sample next question?",
            "options": ["A", "B", "C", "D"],
            "subject": subject,
            "difficulty": 2
        }
    })
