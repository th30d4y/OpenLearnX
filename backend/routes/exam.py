from flask import Blueprint, request, jsonify, session
import uuid
import random
import string
from datetime import datetime, timedelta
from pymongo import MongoClient
import os

bp = Blueprint('exam', __name__)

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client.openlearnx

def generate_exam_code():
    """Generate a unique 6-character exam code"""
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not db.exams.find_one({"exam_code": code}):
            return code

@bp.route("/create-exam", methods=["POST", "OPTIONS"])
def create_exam():
    """Create a new coding exam"""
    # Handle OPTIONS request for CORS
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        print(f"Received create-exam request")
        
        data = request.json
        print(f"Request data: {data}")
        
        if not data:
            print("❌ No data provided")
            return jsonify({"error": "No data provided"}), 400
        
        # Check for basic required fields
        if not data.get('title'):
            print("❌ Missing title")
            return jsonify({"error": "Missing required field: title"}), 400
            
        if not data.get('host_name'):
            print("❌ Missing host_name")  
            return jsonify({"error": "Missing required field: host_name"}), 400
        
        # Handle different problem data formats
        problem_title = data.get('problem_title') or data.get('title') or 'Coding Challenge'
        problem_description = data.get('problem_description') or f"Solve the {problem_title} problem"
        
        # Handle problem_id if provided
        if data.get('problem_id'):
            problem_title = problem_title or data.get('problem_id').replace('-', ' ').title()
            print(f"Using problem_id: {data.get('problem_id')}")
        
        exam_code = generate_exam_code()
        
        exam = {
            "exam_code": exam_code,
            "title": data.get('title'),
            "host_name": data.get('host_name'),
            "created_at": datetime.now(),
            "status": "waiting",
            "duration_minutes": data.get('duration_minutes', 30),
            "max_participants": data.get('max_participants', 50),
            "problem": {
                "title": problem_title,
                "description": problem_description,
                "function_name": data.get('function_name', 'solve'),
                "languages": data.get('languages', ['python']),
                "test_cases": data.get('test_cases', [
                    {
                        "input": "hello world",
                        "expected_output": "Hello World",
                        "description": "Basic capitalization test"
                    }
                ]),
                "starter_code": data.get('starter_code', {
                    'python': 'def solve(input_string):\n    # Write your solution here\n    return input_string.title()',
                    'java': 'public String solve(String inputString) {\n    // Write your solution here\n    return inputString;\n}',
                    'javascript': 'function solve(inputString) {\n    // Write your solution here\n    return inputString;\n}'
                }),
                "constraints": data.get('constraints', ['Input will be a string', 'Length between 1-1000 characters']),
                "examples": data.get('examples', [
                    {
                        "input": "hello world",
                        "expected_output": "Hello World", 
                        "description": "Capitalize each word"
                    }
                ])
            },
            "participants": [],
            "leaderboard": [],
            "start_time": None,
            "end_time": None
        }
        
        print(f"✅ Creating exam with code: {exam_code}")
        print(f"✅ Problem title: {problem_title}")
        
        # Insert into database
        result = db.exams.insert_one(exam)
        
        print(f"✅ Exam created successfully with ID: {result.inserted_id}")
        
        return jsonify({
            "success": True,
            "exam_code": exam_code,
            "exam_id": str(result.inserted_id),
            "message": f"Exam created successfully! Share code: {exam_code}",
            "exam_details": {
                "title": exam['title'],
                "problem_title": problem_title,
                "duration": exam['duration_minutes'],
                "max_participants": exam['max_participants'],
                "languages": exam['problem']['languages']
            }
        })
        
    except Exception as e:
        print(f"❌ Error creating exam: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to create exam: {str(e)}"}), 500

@bp.route("/join-exam", methods=["POST", "OPTIONS"])
def join_exam():
    """Student joins exam using unique code and their name"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        # Debug logging for the request
        print(f"🔍 Raw request data: {request.data}")
        print(f"🔍 Content-Type: {request.headers.get('Content-Type')}")
        
        data = request.json
        print(f"🔍 Parsed JSON data: {data}")
        
        if not data:
            print("❌ No JSON data received")
            return jsonify({"error": "No data provided"}), 400
        
        exam_code = data.get('exam_code', '').upper().strip()
        student_name = data.get('student_name', '').strip()
        
        print(f"📝 Join exam request - Code: {exam_code}, Name: {student_name}")
        
        # Enhanced validation with detailed error messages
        if not exam_code:
            print("❌ Missing exam_code")
            return jsonify({"error": "Exam code is required"}), 400
            
        if not student_name:
            print("❌ Missing student_name")
            return jsonify({"error": "Student name is required"}), 400
        
        # Check if exam exists
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            print(f"❌ Exam not found: {exam_code}")
            return jsonify({"error": "Invalid exam code"}), 404
        
        print(f"✅ Found exam: {exam['title']} (Status: {exam['status']})")
        
        # Check exam status
        if exam['status'] == 'completed':
            print("❌ Exam already completed")
            return jsonify({"error": "This exam has already ended"}), 400
        
        # Check capacity
        current_participants = exam.get('participants', [])
        max_participants = exam.get('max_participants', 50)
        
        if len(current_participants) >= max_participants:
            print(f"❌ Exam full: {len(current_participants)}/{max_participants}")
            return jsonify({"error": "Exam is full"}), 400
        
        # Check if name is already taken
        existing_names = [p['name'].lower() for p in current_participants]
        if student_name.lower() in existing_names:
            print(f"❌ Name already taken: {student_name}")
            return jsonify({"error": "Name already taken. Please choose a different name."}), 400
        
        # Create new participant
        participant = {
            "name": student_name,
            "joined_at": datetime.now(),
            "session_id": str(uuid.uuid4()),
            "score": 0,
            "submission": None,
            "language": None,
            "submission_time": None,
            "completed": False,
            "rank": 0,
            "test_results": []
        }
        
        # Add participant to exam
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {"$push": {"participants": participant}}
        )
        
        if result.modified_count == 0:
            print("❌ Failed to add participant to database")
            return jsonify({"error": "Failed to join exam"}), 500
        
        # Set session data
        session['exam_code'] = exam_code
        session['student_name'] = student_name
        session['session_id'] = participant['session_id']
        
        print(f"✅ Participant {student_name} joined exam {exam_code}")
        
        return jsonify({
            "success": True,
            "message": f"Successfully joined exam: {exam['title']}",
            "exam_info": {
                "title": exam['title'],
                "duration_minutes": exam['duration_minutes'],
                "status": exam['status'],
                "participants_count": len(current_participants) + 1,
                "max_participants": max_participants,
                "languages": exam.get('problem', {}).get('languages', ['python']),
                "problem_title": exam.get('problem', {}).get('title', '')
            }
        })
        
    except Exception as e:
        print(f"❌ Error joining exam: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to join exam: {str(e)}"}), 500

@bp.route("/start-exam", methods=["POST", "OPTIONS"])
def start_exam():
    """Host starts the exam"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.json
        exam_code = data.get('exam_code')
        
        print(f"📝 Start exam request - Code: {exam_code}")
        
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            return jsonify({"error": "Exam not found"}), 404
        
        if exam['status'] != 'waiting':
            return jsonify({"error": "Exam has already started or ended"}), 400
        
        start_time = datetime.now()
        end_time = start_time + timedelta(minutes=exam['duration_minutes'])
        
        db.exams.update_one(
            {"exam_code": exam_code},
            {
                "$set": {
                    "status": "active",
                    "start_time": start_time,
                    "end_time": end_time
                }
            }
        )
        
        print(f"✅ Exam {exam_code} started successfully")
        
        return jsonify({
            "success": True,
            "message": "Exam started successfully!",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "participants_count": len(exam.get('participants', []))
        })
    except Exception as e:
        print(f"❌ Error starting exam: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/leaderboard/<exam_code>", methods=["GET", "OPTIONS"])
def get_leaderboard(exam_code):
    """Get real-time leaderboard visible to all participants"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"📝 Leaderboard request - Code: {exam_code}")
        
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"error": "Exam not found"}), 404
        
        participants = exam.get('participants', [])
        
        # Sort by score and submission time
        completed_participants = [p for p in participants if p.get('completed', False)]
        leaderboard = sorted(
            completed_participants,
            key=lambda x: (-x.get('score', 0), x.get('submission_time', datetime.now()))
        )
        
        # Add rank to each participant
        for i, participant in enumerate(leaderboard):
            participant['rank'] = i + 1
        
        waiting_participants = [p for p in participants if not p.get('completed', False)]
        
        # Calculate statistics
        total_score = sum(p.get('score', 0) for p in completed_participants)
        avg_score = total_score / len(completed_participants) if completed_participants else 0
        
        return jsonify({
            "success": True,
            "exam_info": {
                "title": exam['title'],
                "status": exam['status'],
                "duration_minutes": exam['duration_minutes'],
                "start_time": exam.get('start_time'),
                "end_time": exam.get('end_time'),
                "problem_title": exam.get('problem', {}).get('title', '')
            },
            "leaderboard": leaderboard,
            "waiting_participants": waiting_participants,
            "stats": {
                "total_participants": len(participants),
                "completed_submissions": len(completed_participants),
                "waiting_submissions": len(waiting_participants),
                "average_score": round(avg_score, 1),
                "highest_score": max((p.get('score', 0) for p in completed_participants), default=0)
            }
        })
    except Exception as e:
        print(f"❌ Error getting leaderboard: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/get-problem/<exam_code>", methods=["GET", "OPTIONS"])
def get_exam_problem(exam_code):
    """Get problem details for participants"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"error": "Exam not found"}), 404
        
        return jsonify({
            "success": True,
            "problem": exam.get('problem', {}),
            "exam_info": {
                "title": exam['title'],
                "status": exam['status'],
                "duration_minutes": exam['duration_minutes']
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/host-dashboard/<exam_code>", methods=["GET", "OPTIONS"])
def get_host_dashboard(exam_code):
    """Get comprehensive host dashboard data"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"error": "Exam not found"}), 404
        
        participants = exam.get('participants', [])
        
        # Separate participants by status
        completed_participants = [p for p in participants if p.get('completed', False)]
        waiting_participants = [p for p in participants if not p.get('completed', False)]
        
        # Sort leaderboard
        leaderboard = sorted(
            completed_participants,
            key=lambda x: (-x.get('score', 0), x.get('submission_time', datetime.now()))
        )
        
        # Add ranks
        for i, participant in enumerate(leaderboard):
            participant['rank'] = i + 1
        
        # Calculate time statistics
        current_time = datetime.now()
        start_time = exam.get('start_time')
        end_time = exam.get('end_time')
        
        time_elapsed = 0
        time_remaining = 0
        
        if start_time:
            time_elapsed = int((current_time - start_time).total_seconds())
        
        if end_time and current_time < end_time:
            time_remaining = int((end_time - current_time).total_seconds())
        
        return jsonify({
            "success": True,
            "exam_info": {
                "exam_code": exam['exam_code'],
                "title": exam['title'],
                "status": exam['status'],
                "duration_minutes": exam['duration_minutes'],
                "max_participants": exam.get('max_participants', 50),
                "created_at": exam.get('created_at'),
                "start_time": start_time,
                "end_time": end_time,
                "time_elapsed": time_elapsed,
                "time_remaining": time_remaining
            },
            "participants": {
                "total": len(participants),
                "completed": len(completed_participants),
                "working": len(waiting_participants),
                "all_participants": sorted(participants, key=lambda x: x.get('joined_at', datetime.now())),
                "recent_joins": sorted(participants, key=lambda x: x.get('joined_at', datetime.now()), reverse=True)[:5]
            },
            "leaderboard": leaderboard,
            "statistics": {
                "average_score": sum(p.get('score', 0) for p in completed_participants) / len(completed_participants) if completed_participants else 0,
                "highest_score": max((p.get('score', 0) for p in completed_participants), default=0),
                "lowest_score": min((p.get('score', 0) for p in completed_participants), default=0),
                "completion_rate": (len(completed_participants) / len(participants) * 100) if participants else 0
            },
            "problem": exam.get('problem', {})
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ CORRECTED: Host panel management endpoints (using Blueprint decorators)
@bp.route('/info/<exam_code>', methods=['GET', 'OPTIONS'])
def get_exam_info(exam_code):
    """Get detailed information about an exam for the host panel"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        exam_info = {
            "title": exam["title"],
            "status": exam["status"],
            "duration_minutes": exam["duration_minutes"],
            "participants_count": len(exam.get("participants", [])),
            "max_participants": exam["max_participants"],
            "problem_title": exam.get("problem", {}).get("title", exam["title"]),
            "languages": exam.get("problem", {}).get("languages", ["python"]),
            "created_at": exam["created_at"],
            "host_name": exam["host_name"]
        }
        
        print(f"📊 Host panel requested info for exam {exam_code}")
        return jsonify({"success": True, "exam_info": exam_info})
    except Exception as e:
        print(f"❌ Error getting exam info: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/participants/<exam_code>', methods=['GET', 'OPTIONS'])
def get_participants(exam_code):
    """Get list of participants for host panel monitoring"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        participants = exam.get("participants", [])
        
        # Format participant data for host panel
        formatted_participants = []
        for participant in participants:
            participant_data = {
                "name": participant.get("name", ""),
                "score": participant.get("score", 0),
                "completed": participant.get("completed", False),
                "joined_at": participant.get("joined_at", ""),
                "submitted_at": participant.get("submitted_at", None)
            }
            formatted_participants.append(participant_data)
        
        print(f"👥 Retrieved {len(formatted_participants)} participants for exam {exam_code}")
        return jsonify({"success": True, "participants": formatted_participants})
    except Exception as e:
        print(f"❌ Error getting participants: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/remove-participant', methods=['POST', 'OPTIONS'])
def remove_participant():
    """Remove a participant from an exam (host only)"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        participant_name = data.get('participant_name', '')
        
        if not exam_code or not participant_name:
            return jsonify({"success": False, "error": "Missing exam_code or participant_name"}), 400
        
        # Remove participant from exam
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {"$pull": {"participants": {"name": participant_name}}}
        )
        
        if result.modified_count > 0:
            print(f"🗑️ Host removed participant {participant_name} from exam {exam_code}")
            return jsonify({"success": True, "message": f"Participant {participant_name} removed successfully"})
        else:
            return jsonify({"success": False, "error": "Participant not found or already removed"}), 404
            
    except Exception as e:
        print(f"❌ Error removing participant: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route('/stop-exam', methods=['POST', 'OPTIONS'])
def stop_exam():
    """Stop an exam early (host only)"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        
        if not exam_code:
            return jsonify({"success": False, "error": "Missing exam_code"}), 400
        
        # Update exam status to completed
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {"$set": {
                "status": "completed", 
                "ended_at": datetime.now().isoformat(),
                "ended_by": "host"
            }}
        )
        
        if result.modified_count > 0:
            print(f"🛑 Exam {exam_code} stopped early by host")
            return jsonify({"success": True, "message": "Exam stopped successfully"})
        else:
            return jsonify({"success": False, "error": "Exam not found"}), 404
            
    except Exception as e:
        print(f"❌ Error stopping exam: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/debug-join-data", methods=["POST", "OPTIONS"])
def debug_join_data():
    """Debug what data is actually being received"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    print(f"🔍 Raw request data: {request.data}")
    print(f"🔍 Request JSON: {request.json}")
    print(f"🔍 Content-Type: {request.headers.get('Content-Type')}")
    
    return jsonify({
        "received_raw": request.data.decode() if request.data else None,
        "received_json": request.json,
        "content_type": request.headers.get('Content-Type'),
        "success": True
    })

@bp.route("/test", methods=["GET"])
def test_exam_route():
    """Test if exam routes are working"""
    return jsonify({
        "success": True,
        "message": "Exam routes are working",
        "timestamp": datetime.now().isoformat(),
        "available_routes": [
            "/api/exam/create-exam",
            "/api/exam/join-exam", 
            "/api/exam/start-exam",
            "/api/exam/leaderboard/<exam_code>",
            "/api/exam/get-problem/<exam_code>",
            "/api/exam/host-dashboard/<exam_code>",
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/remove-participant",
            "/api/exam/stop-exam",
            "/api/exam/debug-join-data"
        ]
    })

@bp.route("/", methods=["GET"])
def exam_root():
    """Exam route root"""
    return jsonify({
        "message": "OpenLearnX Exam API",
        "available_endpoints": [
            "/api/exam/create-exam",
            "/api/exam/join-exam",
            "/api/exam/start-exam", 
            "/api/exam/leaderboard/<exam_code>",
            "/api/exam/get-problem/<exam_code>",
            "/api/exam/host-dashboard/<exam_code>",
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/remove-participant",
            "/api/exam/stop-exam",
            "/api/exam/test",
            "/api/exam/debug-join-data"
        ]
    })
@bp.route('/info/<exam_code>', methods=['GET', 'OPTIONS'])
def get_exam_info(exam_code):
    """Get detailed information about an exam for the host panel"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"📊 Host panel requesting info for exam: {exam_code}")
        
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            print(f"❌ Exam not found: {exam_code}")
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Convert datetime objects to strings for JSON serialization
        created_at = exam.get("created_at")
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        
        exam_info = {
            "title": exam["title"],
            "status": exam["status"],
            "duration_minutes": exam["duration_minutes"],
            "participants_count": len(exam.get("participants", [])),
            "max_participants": exam.get("max_participants", 50),
            "problem_title": exam.get("problem", {}).get("title", exam["title"]),
            "languages": exam.get("problem", {}).get("languages", ["python"]),
            "created_at": created_at,
            "host_name": exam["host_name"]
        }
        
        print(f"✅ Found exam: {exam['title']} (Status: {exam['status']})")
        return jsonify({"success": True, "exam_info": exam_info})
        
    except Exception as e:
        print(f"❌ Error getting exam info: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
