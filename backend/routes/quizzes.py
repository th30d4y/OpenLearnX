from flask import Blueprint, request, jsonify
from datetime import datetime
import uuid
import random
import string

bp = Blueprint('quizzes', __name__)

def get_db():
    """Get database connection"""
    from main import get_db as main_get_db
    return main_get_db()

def get_ai_service():
    """Get AI service from app config"""
    from flask import current_app
    return current_app.config.get('AI_QUIZ_SERVICE')

# ✅ UNIQUE ROOM CODE GENERATOR - Creates random code every time
def generate_room_code(length=6):
    """Generate unique random room invitation code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def apply_difficulty_progression(current_difficulty, consecutive_correct, is_correct):
    """
    Apply difficulty progression logic:
    - 3 consecutive correct: easy → medium → hard
    - 1 incorrect: hard → medium → easy (stay on easy if already there)
    """
    if is_correct:
        # Move up after 3 consecutive correct answers
        if consecutive_correct[current_difficulty] >= 3:
            if current_difficulty == 'easy':
                return 'medium'
            elif current_difficulty == 'medium':
                return 'hard'
            # If already hard, stay hard
    else:
        # Move down immediately after 1 wrong answer
        if current_difficulty == 'hard':
            return 'medium'
        elif current_difficulty == 'medium':
            return 'easy'
        # If already easy, stay easy
    
    return current_difficulty

# ===================================================================
# ✅ PUBLIC ROOMS LISTING
# ===================================================================

@bp.route('/public-rooms', methods=['GET', 'OPTIONS'])
def get_public_rooms():
    """Get all public quiz rooms"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    try:
        db = get_db()
        rooms = list(db.quiz_rooms.find({
            "is_private": False,
            "status": {"$in": ["waiting", "active"]}
        }).sort("created_at", -1))

        for room in rooms:
            room['_id'] = str(room['_id'])
            room['participants_count'] = len(room.get('participants', []))
            room['questions_count'] = len(room.get('questions', []))
            # Group questions by difficulty
            questions_by_difficulty = {
                'easy': len([q for q in room.get('questions', []) if q.get('difficulty') == 'easy']),
                'medium': len([q for q in room.get('questions', []) if q.get('difficulty') == 'medium']),
                'hard': len([q for q in room.get('questions', []) if q.get('difficulty') == 'hard'])
            }
            room['questions_by_difficulty'] = questions_by_difficulty

        return jsonify({
            "success": True,
            "public_rooms": rooms
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ ROOM CREATION WITH UNIQUE INVITATION CODES
# ===================================================================

@bp.route('/create-room', methods=['POST', 'OPTIONS'])
def create_quiz_room():
    """Host creates a new quiz room with unique invitation code"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        data = request.get_json()
        host_name = data.get('host_name', 'Anonymous Host').strip()
        room_title = data.get('room_title', 'Quiz Room').strip()
        is_private = data.get('is_private', False)
        max_participants = int(data.get('max_participants', 50))
        duration_minutes = int(data.get('duration_minutes', 30))

        # ✅ GENERATE UNIQUE RANDOM INVITATION CODE EVERY TIME
        room_code = generate_room_code()
        db = get_db()

        # ✅ ENSURE UNIQUENESS - Keep generating until we get a unique code
        while db.quiz_rooms.find_one({"room_code": room_code}):
            room_code = generate_room_code()
            print(f"🔄 Code collision detected, generating new code: {room_code}")

        # Create quiz room with all required properties
        quiz_room = {
            "room_id": str(uuid.uuid4()),
            "room_code": room_code,  # ✅ UNIQUE CODE EVERY TIME
            "title": room_title,
            "host_name": host_name,
            "is_private": is_private,
            "status": "waiting",  # waiting, active, completed
            "max_participants": max_participants,
            "duration_minutes": duration_minutes,
            "questions": [],
            "participants": [],
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "ended_at": None,
            "settings": {
                "difficulty_progression": True,
                "ai_hints_enabled": True,
                "shuffle_questions": True,
                "show_correct_answers": True
            },
            # Frontend convenience fields
            "participants_count": 0,
            "questions_count": 0,
            "questions_by_difficulty": {
                "easy": 0,
                "medium": 0,
                "hard": 0
            }
        }

        result = db.quiz_rooms.insert_one(quiz_room)
        quiz_room['_id'] = str(result.inserted_id)

        print(f"✅ Quiz room created: {room_code} - {room_title} by {host_name}")

        return jsonify({
            "success": True,
            "message": "Quiz room created successfully",
            "room": quiz_room
        })
    except Exception as e:
        print(f"❌ Room creation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ JOIN ROOM BY INVITATION CODE
# ===================================================================

@bp.route('/join-room', methods=['POST', 'OPTIONS'])
def join_room():
    """User joins a quiz room using invitation code"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        data = request.get_json()
        room_code = data.get('room_code', '').upper()
        username = data.get('username', '').strip()

        if not room_code or not username:
            return jsonify({
                "success": False,
                "error": "Room invitation code and username are required"
            }), 400

        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code})

        if not room:
            return jsonify({
                "success": False,
                "error": "Quiz room not found. Please check your invitation code."
            }), 404

        if room.get('status') == 'completed':
            return jsonify({"success": False, "error": "Quiz has ended"}), 400

        # Check room capacity
        current_participants = len(room.get('participants', []))
        if current_participants >= room.get('max_participants', 50):
            return jsonify({"success": False, "error": "Quiz room is full"}), 400

        # Check username uniqueness
        existing_participant = next((p for p in room.get('participants', []) 
                                   if p.get('username') == username), None)
        if existing_participant:
            return jsonify({"success": False, "error": "Username already taken"}), 400

        # Create participant session
        participant_session = {
            "session_id": str(uuid.uuid4()),
            "username": username,
            "joined_at": datetime.now(),
            "status": "waiting",
            "current_difficulty": "easy",
            "consecutive_correct": {"easy": 0, "medium": 0, "hard": 0},
            "score": 0,
            "total_questions": 0,
            "correct_answers": 0,
            "question_history": [],
            "current_question_index": -1
        }

        # Add participant to room
        db.quiz_rooms.update_one(
            {"room_code": room_code},
            {
                "$push": {"participants": participant_session},
                "$set": {"updated_at": datetime.now()}
            }
        )

        print(f"✅ User joined room: {username} -> {room_code}")

        return jsonify({
            "success": True,
            "message": f"Successfully joined quiz room '{room.get('title')}'",
            "session": {
                "session_id": participant_session["session_id"],
                "room_code": room_code,
                "room_title": room.get('title'),
                "username": username,
                "room_status": room.get('status'),
                "is_private": room.get('is_private', False),
                "participants_count": current_participants + 1,
                "max_participants": room.get('max_participants')
            }
        })
    except Exception as e:
        print(f"❌ Join room error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ SESSION-BASED QUIZ GAMEPLAY (FIXED 404 ROUTES)
# ===================================================================

@bp.route('/session/<session_id>/next-question', methods=['GET', 'OPTIONS'])
def get_next_question(session_id):
    """Get next question for a user session"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    try:
        db = get_db()
        
        # Find the room and participant by session_id
        room = db.quiz_rooms.find_one({
            "participants.session_id": session_id
        })
        
        if not room:
            return jsonify({"success": False, "error": "Session not found"}), 404
        
        # Get participant data
        participant = next((p for p in room.get('participants', []) 
                          if p.get('session_id') == session_id), None)
        
        if not participant:
            return jsonify({"success": False, "error": "Participant not found"}), 404
        
        # Check if quiz is active
        if room.get('status') != 'active':
            return jsonify({
                "success": False, 
                "error": "Quiz is not active yet",
                "room_status": room.get('status')
            }), 400
        
        # Get available questions based on current difficulty
        current_difficulty = participant.get('current_difficulty', 'easy')
        asked_question_ids = [q.get('question_id') for q in participant.get('question_history', [])]
        
        # Filter questions by difficulty and exclude already asked
        available_questions = [
            q for q in room.get('questions', [])
            if q.get('difficulty') == current_difficulty 
            and q.get('question_id') not in asked_question_ids
        ]
        
        # If no questions at current difficulty, try any difficulty
        if not available_questions:
            available_questions = [
                q for q in room.get('questions', [])
                if q.get('question_id') not in asked_question_ids
            ]
        
        # Check if quiz is completed
        if not available_questions:
            return jsonify({
                "success": True,
                "quiz_completed": True,
                "message": "No more questions available",
                "final_stats": {
                    "total_questions": participant.get('total_questions', 0),
                    "correct_answers": participant.get('correct_answers', 0),
                    "score": participant.get('score', 0),
                    "final_difficulty": current_difficulty
                }
            })
        
        # Select random question
        question = random.choice(available_questions)
        
        return jsonify({
            "success": True,
            "question": question,
            "session_stats": {
                "current_difficulty": current_difficulty,
                "consecutive_correct": participant.get('consecutive_correct', {}),
                "total_questions": participant.get('total_questions', 0),
                "correct_answers": participant.get('correct_answers', 0),
                "score": participant.get('score', 0)
            }
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/session/<session_id>/submit-answer', methods=['POST', 'OPTIONS'])
def submit_answer(session_id):
    """Submit answer and apply difficulty progression"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        user_answer = data.get('answer', '')
        question_data = data.get('question_data', {})
        
        db = get_db()
        
        # Find room and participant
        room = db.quiz_rooms.find_one({
            "participants.session_id": session_id
        })
        
        if not room:
            return jsonify({"success": False, "error": "Session not found"}), 404
        
        # Get participant index for updating
        participants = room.get('participants', [])
        participant_index = -1
        participant = None
        
        for i, p in enumerate(participants):
            if p.get('session_id') == session_id:
                participant_index = i
                participant = p
                break
        
        if participant_index == -1:
            return jsonify({"success": False, "error": "Participant not found"}), 404
        
        # Check if answer is correct
        is_correct = user_answer.strip().lower() == question_data.get('correct_answer', '').strip().lower()
        current_difficulty = participant.get('current_difficulty', 'easy')
        consecutive_correct = participant.get('consecutive_correct', {'easy': 0, 'medium': 0, 'hard': 0})
        
        # Update participant stats
        participant['total_questions'] = participant.get('total_questions', 0) + 1
        if is_correct:
            participant['correct_answers'] = participant.get('correct_answers', 0) + 1
            participant['score'] += question_data.get('points', 10)
            consecutive_correct[current_difficulty] += 1
        else:
            # Reset consecutive count for current difficulty
            consecutive_correct[current_difficulty] = 0
        
        # Apply difficulty progression (3 correct = level up, 1 wrong = level down)
        new_difficulty = apply_difficulty_progression(current_difficulty, consecutive_correct, is_correct)
        
        # Record question in history
        question_record = {
            'question_id': question_data.get('question_id'),
            'question_text': question_data.get('question_text'),
            'user_answer': user_answer,
            'correct_answer': question_data.get('correct_answer'),
            'is_correct': is_correct,
            'difficulty': current_difficulty,
            'points_earned': question_data.get('points', 10) if is_correct else 0,
            'timestamp': datetime.now()
        }
        
        if 'question_history' not in participant:
            participant['question_history'] = []
        participant['question_history'].append(question_record)
        
        participant['current_difficulty'] = new_difficulty
        participant['consecutive_correct'] = consecutive_correct
        
        # Update participant in database
        db.quiz_rooms.update_one(
            {"room_code": room.get('room_code'), "participants.session_id": session_id},
            {"$set": {
                f"participants.{participant_index}": participant,
                "updated_at": datetime.now()
            }}
        )
        
        # Get AI prediction for comparison (if available)
        ai_feedback = None
        ai_service = get_ai_service()
        if ai_service:
            try:
                choices_dict = {}
                if isinstance(question_data.get('options'), list):
                    for i, option in enumerate(question_data.get('options', [])):
                        choices_dict[chr(65 + i)] = option
                else:
                    choices_dict = question_data.get('options', {})
                
                prediction = ai_service.get_llm_prediction(
                    question_data.get('question_text', ''), 
                    choices_dict
                )
                ai_feedback = {
                    "ai_prediction": prediction.get('llm_prediction'),
                    "ai_confidence": prediction.get('confidence', 0),
                    "ai_agrees": prediction.get('llm_prediction') == question_data.get('correct_answer'),
                    "ai_reason": prediction.get('reason', '')
                }
            except Exception as e:
                print(f"AI feedback error: {e}")
        
        result = {
            "success": True,
            "is_correct": is_correct,
            "correct_answer": question_data.get('correct_answer'),
            "explanation": question_data.get('explanation', ''),
            "difficulty_changed": new_difficulty != current_difficulty,
            "previous_difficulty": current_difficulty,
            "new_difficulty": new_difficulty,
            "consecutive_correct": consecutive_correct[current_difficulty],
            "points_earned": question_data.get('points', 10) if is_correct else 0,
            "session_stats": {
                "total_questions": participant.get('total_questions', 0),
                "correct_answers": participant.get('correct_answers', 0),
                "score": participant.get('score', 0),
                "accuracy": round((participant.get('correct_answers', 0) / participant.get('total_questions', 1)) * 100, 1)
            }
        }
        
        if ai_feedback:
            result["ai_feedback"] = ai_feedback
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ AI QUESTION GENERATION - IMPROVED VERSION
# ===================================================================

@bp.route('/room/<room_code>/generate-ai-questions', methods=['POST', 'OPTIONS'])
def generate_ai_questions(room_code):
    """Generate AI questions for the quiz room - IMPROVED VERSION"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        data = request.get_json()
        topic = data.get('topic', 'General')
        num_easy = int(data.get('num_easy', 3))
        num_medium = int(data.get('num_medium', 3))
        num_hard = int(data.get('num_hard', 2))

        print(f"🤖 AI Generation Request: topic={topic}, easy={num_easy}, medium={num_medium}, hard={num_hard}")

        ai_service = get_ai_service()
        if not ai_service:
            return jsonify({
                "success": False,
                "error": "AI service not available"
            }), 503

        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code.upper()})
        if not room:
            return jsonify({"success": False, "error": "Quiz room not found"}), 404

        if room.get('status') != 'waiting':
            return jsonify({
                "success": False,
                "error": "Cannot add questions after quiz started"
            }), 400

        generated_questions = []

        # ✅ IMPROVED: Generate questions for each difficulty level with better filtering
        for difficulty, count in [('easy', num_easy), ('medium', num_medium), ('hard', num_hard)]:
            if count <= 0:
                continue
                
            print(f"📝 Looking for {count} {difficulty} questions...")
            
            # Get all questions of this difficulty
            difficulty_questions = [q for q in ai_service.quiz_data 
                                  if q.get('difficulty', 'medium') == difficulty]
            
            print(f"📊 Found {len(difficulty_questions)} {difficulty} questions in total")

            # ✅ IMPROVED: More flexible topic filtering
            if topic and topic.lower() != 'general':
                # Try exact topic match first
                topic_filtered = [q for q in difficulty_questions 
                                if topic.lower() in q.get('question', '').lower() or 
                                   topic.lower() in q.get('category', '').lower()]
                
                # If no exact matches, try partial matches
                if not topic_filtered:
                    topic_filtered = [q for q in difficulty_questions 
                                    if any(word in q.get('question', '').lower() or 
                                          word in q.get('category', '').lower()
                                          for word in topic.lower().split())]
                
                # If still no matches, use all questions of this difficulty
                if not topic_filtered:
                    print(f"⚠️ No {difficulty} questions match topic '{topic}', using all {difficulty} questions")
                    topic_filtered = difficulty_questions
                
                difficulty_questions = topic_filtered

            print(f"📋 After topic filtering: {len(difficulty_questions)} {difficulty} questions available")

            # Select random questions (up to the requested count)
            selected = random.sample(difficulty_questions, min(count, len(difficulty_questions))) if difficulty_questions else []
            
            print(f"✅ Selected {len(selected)} {difficulty} questions")

            # Convert selected questions to room format
            for q_data in selected:
                choices = q_data.get('incorrect_answers', []) + [q_data.get('correct_answer', '')]
                random.shuffle(choices)

                question = {
                    "question_id": str(uuid.uuid4()),
                    "question_text": q_data.get('question', ''),
                    "options": choices,
                    "correct_answer": q_data.get('correct_answer', ''),
                    "difficulty": difficulty,
                    "points": 10 if difficulty == 'easy' else 15 if difficulty == 'medium' else 20,
                    "explanation": f"The correct answer is {q_data.get('correct_answer', '')}.",
                    "created_at": datetime.now(),
                    "generated_by": "AI",
                    "category": q_data.get('category', 'General')
                }
                generated_questions.append(question)

        print(f"🎯 Total questions generated: {len(generated_questions)}")

        # Add generated questions to room
        if generated_questions:
            db.quiz_rooms.update_one(
                {"room_code": room_code.upper()},
                {
                    "$push": {"questions": {"$each": generated_questions}},
                    "$set": {"updated_at": datetime.now()}
                }
            )

            return jsonify({
                "success": True,
                "message": f"Generated {len(generated_questions)} AI questions",
                "questions": generated_questions,
                "breakdown": {
                    "easy": len([q for q in generated_questions if q['difficulty'] == 'easy']),
                    "medium": len([q for q in generated_questions if q['difficulty'] == 'medium']),
                    "hard": len([q for q in generated_questions if q['difficulty'] == 'hard'])
                }
            })
        else:
            return jsonify({
                "success": False,
                "error": f"No questions available for topic '{topic}'. Try 'General' or a different topic.",
                "suggestion": "Use 'Programming', 'Science', 'Technology', or 'General' as topics"
            })

    except Exception as e:
        print(f"❌ AI generation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ DEBUG ENDPOINT FOR TROUBLESHOOTING
# ===================================================================

@bp.route('/debug/questions', methods=['GET'])
def debug_questions():
    """Debug endpoint to see available questions"""
    ai_service = get_ai_service()
    if not ai_service:
        return jsonify({"error": "AI service not available"})
    
    stats = {
        "total_questions": len(ai_service.quiz_data),
        "by_difficulty": {
            "easy": len([q for q in ai_service.quiz_data if q.get('difficulty') == 'easy']),
            "medium": len([q for q in ai_service.quiz_data if q.get('difficulty') == 'medium']),
            "hard": len([q for q in ai_service.quiz_data if q.get('difficulty') == 'hard'])
        },
        "categories": list(set(q.get('category', 'Unknown') for q in ai_service.quiz_data)),
        "sample_questions": ai_service.quiz_data[:3]  # First 3 questions for inspection
    }
    
    return jsonify(stats)

# ===================================================================
# ✅ MANUAL QUESTION MANAGEMENT
# ===================================================================

@bp.route('/room/<room_code>/add-question', methods=['POST', 'OPTIONS'])
def add_question(room_code):
    """Host adds a manual question to the quiz room"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        data = request.get_json()
        question_text = data.get('question_text')
        options = data.get('options')
        correct_answer = data.get('correct_answer')
        difficulty = data.get('difficulty', 'medium').lower()
        points = int(data.get('points', 10))
        explanation = data.get('explanation', '')

        if not question_text or not options or not correct_answer:
            return jsonify({
                "success": False,
                "error": "Question text, options, and correct answer are required"
            }), 400

        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code.upper()})
        if not room:
            return jsonify({"success": False, "error": "Quiz room not found"}), 404

        if room.get('status') != 'waiting':
            return jsonify({
                "success": False,
                "error": "Cannot add questions after quiz started"
            }), 400

        question = {
            "question_id": str(uuid.uuid4()),
            "question_text": question_text,
            "options": options,
            "correct_answer": correct_answer,
            "difficulty": difficulty,
            "points": points,
            "explanation": explanation,
            "created_at": datetime.now(),
            "generated_by": "manual",
            "order": len(room.get('questions', []))
        }

        db.quiz_rooms.update_one(
            {"room_code": room_code.upper()},
            {
                "$push": {"questions": question},
                "$set": {"updated_at": datetime.now()}
            }
        )

        return jsonify({
            "success": True,
            "message": "Question added successfully",
            "question": question
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/room/<room_code>/remove-question/<question_id>', methods=['DELETE', 'OPTIONS'])
def remove_question(room_code, question_id):
    """Host removes a question from the quiz room"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "DELETE,OPTIONS")
        return response

    try:
        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code.upper()})
        
        if not room:
            return jsonify({"success": False, "error": "Quiz room not found"}), 404

        if room.get('status') != 'waiting':
            return jsonify({
                "success": False,
                "error": "Cannot remove questions after quiz started"
            }), 400

        result = db.quiz_rooms.update_one(
            {"room_code": room_code.upper()},
            {
                "$pull": {"questions": {"question_id": question_id}},
                "$set": {"updated_at": datetime.now()}
            }
        )

        if result.modified_count > 0:
            return jsonify({
                "success": True,
                "message": "Question removed successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Question not found"
            }), 404

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ ROOM MANAGEMENT
# ===================================================================

@bp.route('/room/<room_code>/info', methods=['GET', 'OPTIONS'])
def get_room_info(room_code):
    """Get quiz room information"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    try:
        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code.upper()})

        if not room:
            return jsonify({"success": False, "error": "Quiz room not found"}), 404

        if '_id' in room:
            room['_id'] = str(room['_id'])

        room['participants_count'] = len(room.get('participants', []))
        room['questions_count'] = len(room.get('questions', []))

        # Group questions by difficulty
        questions_by_difficulty = {
            'easy': len([q for q in room.get('questions', []) if q.get('difficulty') == 'easy']),
            'medium': len([q for q in room.get('questions', []) if q.get('difficulty') == 'medium']),
            'hard': len([q for q in room.get('questions', []) if q.get('difficulty') == 'hard'])
        }
        room['questions_by_difficulty'] = questions_by_difficulty

        return jsonify({
            "success": True,
            "room": room
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/room/<room_code>/start', methods=['POST', 'OPTIONS'])
def start_quiz_room(room_code):
    """Host starts the quiz room"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code.upper()})

        if not room:
            return jsonify({"success": False, "error": "Quiz room not found"}), 404

        if room.get('status') != 'waiting':
            return jsonify({"success": False, "error": "Quiz already started or completed"}), 400

        if len(room.get('questions', [])) == 0:
            return jsonify({"success": False, "error": "No questions added to the quiz"}), 400

        # Start the quiz
        start_time = datetime.now()
        end_time = datetime.fromtimestamp(
            start_time.timestamp() + (room.get('duration_minutes', 30) * 60)
        )

        db.quiz_rooms.update_one(
            {"room_code": room_code.upper()},
            {
                "$set": {
                    "status": "active",
                    "started_at": start_time,
                    "ends_at": end_time,
                    "updated_at": datetime.now()
                }
            }
        )

        return jsonify({
            "success": True,
            "message": "Quiz started successfully",
            "started_at": start_time.isoformat(),
            "ends_at": end_time.isoformat()
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/room/<room_code>/end', methods=['POST', 'OPTIONS'])
def end_quiz_room(room_code):
    """Host ends the quiz room"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        db = get_db()

        db.quiz_rooms.update_one(
            {"room_code": room_code.upper()},
            {
                "$set": {
                    "status": "completed",
                    "ended_at": datetime.now(),
                    "updated_at": datetime.now()
                }
            }
        )

        return jsonify({
            "success": True,
            "message": "Quiz ended successfully"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ PARTICIPANT MANAGEMENT
# ===================================================================

@bp.route('/room/<room_code>/participants', methods=['GET', 'OPTIONS'])
def get_room_participants(room_code):
    """Get all participants in a quiz room (for host)"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    
    try:
        db = get_db()
        room = db.quiz_rooms.find_one({"room_code": room_code.upper()})
        
        if not room:
            return jsonify({"success": False, "error": "Quiz room not found"}), 404
        
        participants = room.get('participants', [])
        
        # Calculate statistics
        stats = {
            "total_participants": len(participants),
            "waiting": len([p for p in participants if p.get('status') == 'waiting']),
            "active": len([p for p in participants if p.get('status') == 'active']),
            "completed": len([p for p in participants if p.get('status') == 'completed']),
            "average_score": sum(p.get('score', 0) for p in participants) / len(participants) if participants else 0
        }
        
        return jsonify({
            "success": True,
            "participants": participants,
            "stats": stats
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/room/<room_code>/remove-participant/<username>', methods=['DELETE', 'OPTIONS'])
def remove_participant(room_code, username):
    """Host removes a participant from the quiz room"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "DELETE,OPTIONS")
        return response
    
    try:
        db = get_db()
        
        # Remove participant from room
        result = db.quiz_rooms.update_one(
            {"room_code": room_code.upper()},
            {
                "$pull": {"participants": {"username": username}},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        if result.modified_count > 0:
            return jsonify({
                "success": True,
                "message": f"Participant '{username}' removed successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Participant not found"
            }), 404
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ TRADITIONAL QUIZ ROUTES (LEGACY SUPPORT)
# ===================================================================

@bp.route('/', methods=['GET', 'OPTIONS'])
def get_all_quizzes():
    """Get all traditional quizzes"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    try:
        db = get_db()
        quizzes = list(db.quizzes.find())

        for quiz in quizzes:
            if '_id' in quiz:
                quiz['_id'] = str(quiz['_id'])

        return jsonify({
            "success": True,
            "quizzes": quizzes,
            "total": len(quizzes),
            "ai_available": True
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/', methods=['POST', 'OPTIONS'])
def create_quiz():
    """Create new traditional quiz"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response

    try:
        data = request.get_json()

        quiz = {
            "id": str(uuid.uuid4()),
            "title": data.get('title', 'Untitled Quiz'),
            "description": data.get('description', ''),
            "difficulty": data.get('difficulty', 'medium'),
            "questions": data.get('questions', []),
            "created_at": datetime.now().isoformat(),
            "total_points": data.get('total_points', 0),
            "generated_by": data.get('generated_by', 'manual')
        }

        db = get_db()
        result = db.quizzes.insert_one(quiz)
        quiz['_id'] = str(result.inserted_id)

        return jsonify({
            "success": True,
            "message": "Quiz created successfully",
            "quiz": quiz
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/<quiz_id>', methods=['GET', 'OPTIONS'])
def get_quiz_by_id(quiz_id):
    """Get specific quiz by ID"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response

    try:
        db = get_db()
        quiz = db.quizzes.find_one({"id": quiz_id})

        if not quiz:
            return jsonify({"success": False, "error": "Quiz not found"}), 404

        if '_id' in quiz:
            quiz['_id'] = str(quiz['_id'])

        return jsonify({
            "success": True,
            "quiz": quiz
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
