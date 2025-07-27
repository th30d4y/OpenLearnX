from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId
import uuid

bp = Blueprint('adaptive_quiz', __name__)

def get_db():
    """Get database connection"""
    from main import get_db as main_get_db
    return main_get_db()

def get_ai_service():
    """Get AI service from app config"""
    from flask import current_app
    return current_app.config.get('AI_QUIZ_SERVICE')

@bp.route('/start', methods=['POST', 'OPTIONS'])
def start_adaptive_quiz():
    """Start new adaptive quiz session"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        user_id = data.get('user_id', f'anonymous_{uuid.uuid4()}')
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({
                "success": False,
                "error": "AI Quiz service not available"
            }), 503
        
        # Create new session
        session_data = ai_service.create_session(user_id)
        
        # Get first question
        first_question = ai_service.get_adaptive_question(session_data)
        
        # Save session to database
        db = get_db()
        db.adaptive_quiz_sessions.insert_one(session_data)
        
        return jsonify({
            "success": True,
            "session_id": session_data['session_id'],
            "question": first_question,
            "session_stats": ai_service.get_session_stats(session_data)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/<session_id>/answer', methods=['POST', 'OPTIONS'])
def submit_answer(session_id):
    """Submit answer and get next question"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        user_answer = data.get('answer', '').upper()
        question_data = data.get('question_data', {})
        
        if not user_answer or not question_data:
            return jsonify({
                "success": False,
                "error": "Answer and question_data required"
            }), 400
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({
                "success": False,
                "error": "AI Quiz service not available"
            }), 503
        
        db = get_db()
        
        # Get session data
        session = db.adaptive_quiz_sessions.find_one({"session_id": session_id})
        if not session:
            return jsonify({
                "success": False,
                "error": "Session not found"
            }), 404
        
        # Remove MongoDB _id for processing
        if '_id' in session:
            del session['_id']
        
        # Evaluate answer
        result = ai_service.evaluate_answer(session, question_data, user_answer)
        
        # Update session in database
        db.adaptive_quiz_sessions.replace_one(
            {"session_id": session_id},
            session
        )
        
        # Check if quiz should continue
        if session['total_questions'] >= 20:  # Max 20 questions
            session['status'] = 'completed'
            db.adaptive_quiz_sessions.replace_one(
                {"session_id": session_id},
                session
            )
            
            return jsonify({
                "success": True,
                "quiz_completed": True,
                "result": result,
                "final_stats": ai_service.get_session_stats(session)
            })
        
        # Get next question
        next_question = ai_service.get_adaptive_question(session)
        
        return jsonify({
            "success": True,
            "quiz_completed": False,
            "result": result,
            "next_question": next_question,
            "session_stats": ai_service.get_session_stats(session)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/<session_id>/stats', methods=['GET', 'OPTIONS'])
def get_session_stats(session_id):
    """Get session statistics"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    try:
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({
                "success": False,
                "error": "AI Quiz service not available"
            }), 503
        
        db = get_db()
        session = db.adaptive_quiz_sessions.find_one({"session_id": session_id})
        
        if not session:
            return jsonify({
                "success": False,
                "error": "Session not found"
            }), 404
        
        if '_id' in session:
            del session['_id']
        
        stats = ai_service.get_session_stats(session)
        
        return jsonify({
            "success": True,
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/predict', methods=['POST', 'OPTIONS'])
def get_ai_prediction():
    """Get AI prediction for a question"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        question_text = data.get('question_text', '')
        choices = data.get('choices', {})
        
        if not question_text or not choices:
            return jsonify({
                "success": False,
                "error": "question_text and choices required"
            }), 400
        
        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({
                "success": False,
                "error": "AI Quiz service not available"
            }), 503
        
        prediction = ai_service.get_llm_prediction(question_text, choices)
        
        return jsonify({
            "success": True,
            "prediction": prediction
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
