from flask import Blueprint, request, jsonify, current_app
import jwt
from datetime import datetime
import random

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
    questions = await mongo_service.get_questions_by_difficulty(2, 1)  # Start with medium
    
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
    confidence_score = random.uniform(0.7, 0.95) if is_correct else random.uniform(0.1, 0.4)
    
    # Update session
    if 'answers' not in session:
        session['answers'] = []
    
    answer_record = {
        'question_id': question_id,
        'answer': answer,
        'correct': is_correct,
        'timestamp': datetime.utcnow()
    }
    session['answers'].append(answer_record)
    
    # Calculate current score
    correct_answers = sum(1 for a in session['answers'] if a['correct'])
    current_score = correct_answers / len(session['answers'])
    
    # Update difficulty for next question
    current_difficulty = session.get('current_difficulty', 2)
    if is_correct and confidence_score > 0.8:
        current_difficulty = min(5, current_difficulty + 1)
    elif not is_correct and confidence_score < 0.3:
        current_difficulty = max(1, current_difficulty - 1)
    
    await mongo_service.update_test_session(session_id, {
        'answers': session['answers'],
        'score': current_score,
        'current_difficulty': current_difficulty
    })
    
    # Prepare response
    feedback = {
        "correct": is_correct,
        "confidence_score": round(confidence_score, 2),
        "explanation": question['explanation'],
        "correct_answer": question['options'][question['correct_answer']],
        "current_score": round(current_score * 100, 1),
        "total_answered": len(session['answers'])
    }
    
    # Get next question if test not complete
    next_question = None
    if len(session['answers']) < 10:  # 10 questions per test
        questions = await mongo_service.get_questions_by_difficulty(current_difficulty, 1)
        if questions:
            next_q = questions[0]
            session['questions'].append(str(next_q['_id']))
            await mongo_service.update_test_session(session_id, {
                'questions': session['questions']
            })
            
            next_question = {
                "id": str(next_q['_id']),
                "question": next_q['question'],
                "options": next_q['options'],
                "subject": next_q['subject'],
                "difficulty": next_q['difficulty']
            }
    else:
        # Test completed
        await mongo_service.update_test_session(session_id, {
            'completed': True,
            'completed_at': datetime.utcnow()
        })
        
        # Update user stats
        await mongo_service.users.update_one(
            {"_id": user_id},
            {
                "$inc": {"total_tests": 1, "total_score": current_score},
                "$set": {f"competency_scores.{session['subject']}": current_score}
            }
        )
    
    response = {
        "feedback": feedback,
        "test_completed": len(session['answers']) >= 10
    }
    
    if next_question:
        response['next_question'] = next_question
        response['question_number'] = len(session['answers']) + 1
    
    return jsonify(response)

@bp.route('/sessions/<user_id>', methods=['GET'])
async def get_user_sessions(user_id):
    """Get user's test sessions"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    token_user_id = get_user_from_token(token)
    
    if not token_user_id or token_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    mongo_service = current_app.config['MONGO_SERVICE']
    
    sessions = await mongo_service.test_sessions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(20).to_list(length=20)
    
    # Format sessions for response
    formatted_sessions = []
    for session in sessions:
        formatted_sessions.append({
            "id": str(session['_id']),
            "subject": session['subject'],
            "score": session.get('score', 0),
            "completed": session.get('completed', False),
            "questions_answered": len(session.get('answers', [])),
            "created_at": session['created_at'].isoformat()
        })
    
    return jsonify({"sessions": formatted_sessions})
