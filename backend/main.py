import os
import asyncio
import logging
import uuid
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient

# Load env vars
load_dotenv()

# Services
from mongo_service import MongoService
from web3_service import Web3Service

# Blueprints
from routes.auth import bp as auth_bp
from routes.test_flow import bp as test_flow_bp
from routes.certificate import bp as cert_bp
from routes.dashboard import bp as dash_bp
from routes.courses import bp as courses_bp
from routes.quizzes import bp as quizzes_bp
from routes.admin import bp as admin_bp
from routes.exam import bp as exam_bp
from routes.compiler import bp as compiler_bp

# Optional services
try:
    from services.wallet_service import wallet_service
    WALLET_SERVICE_AVAILABLE = True
except ImportError:
    wallet_service = None
    WALLET_SERVICE_AVAILABLE = False

try:
    from services.real_compiler_service import real_compiler_service
    COMPILER_SERVICE_AVAILABLE = True
except ImportError:
    real_compiler_service = None
    COMPILER_SERVICE_AVAILABLE = False

# Flask app
app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'openlearnx-secret'),
    MONGODB_URI=os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'),
    WEB3_PROVIDER_URL=os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545'),
    CONTRACT_ADDRESS=os.getenv('CONTRACT_ADDRESS', ''),
    ADMIN_TOKEN=os.getenv('ADMIN_TOKEN', '')
)

# CORS - Allow all endpoints under /api/*
CORS(app, resources={r"/api/*": {
    "origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    "supports_credentials": True,
    "expose_headers": ["Authorization"]
}})

# Logging
logging.basicConfig(level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("openlearnx.log") if os.access('.', os.W_OK) else logging.NullHandler()
    ])
logger = logging.getLogger(__name__)

# Initialize MongoDB service
try:
    mongo_service = MongoService(app.config['MONGODB_URI'])
    app.config['MONGO_SERVICE'] = mongo_service
    MONGO_SERVICE_AVAILABLE = True
    logger.info("✅ MongoService initialized")
except Exception as e:
    MONGO_SERVICE_AVAILABLE = False
    logger.error(f"❌ Failed MongoService init: {e}")

# Initialize Web3 service
try:
    web3_service = Web3Service(app.config['WEB3_PROVIDER_URL'], app.config['CONTRACT_ADDRESS'])
    app.config['WEB3_SERVICE'] = web3_service
    WEB3_SERVICE_AVAILABLE = True
    logger.info("✅ Web3Service initialized")
except Exception as e:
    WEB3_SERVICE_AVAILABLE = False
    logger.error(f"❌ Failed Web3Service init: {e}")

if WALLET_SERVICE_AVAILABLE:
    app.config['WALLET_SERVICE'] = wallet_service
if COMPILER_SERVICE_AVAILABLE:
    app.config['REAL_COMPILER_SERVICE'] = real_compiler_service

def check_docker_availability():
    try:
        import docker
        docker.from_env().ping()
        return True
    except:
        return False

# Register blueprints
blueprints_registered = []
blueprints_failed = []

for bp, prefix in [
    (auth_bp,      '/api/auth'),
    (test_flow_bp, '/api/test'),
    (cert_bp,      '/api/certificate'),
    (dash_bp,      '/api/dashboard'),
    (courses_bp,   '/api/courses'),
    (quizzes_bp,   '/api/quizzes'),
    (admin_bp,     '/api/admin'),
    (exam_bp,      '/api/exam'),
    (compiler_bp,  '/api/compiler'),
]:
    try:
        app.register_blueprint(bp, url_prefix=prefix)
        blueprints_registered.append(prefix)
        logger.info(f"✅ Registered blueprint {prefix}")
    except Exception as e:
        blueprints_failed.append((prefix, str(e)))
        logger.error(f"❌ Blueprint {prefix} failed: {e}")

# ✅ Direct MongoDB connection for direct routes
def get_db():
    """Get MongoDB database connection"""
    client = MongoClient(app.config['MONGODB_URI'])
    return client.openlearnx

# ===================================================================
# ✅ DYNAMIC SCORING SYSTEM
# ===================================================================

def calculate_dynamic_score(code, language, problem):
    """Calculate score based on test cases and expected outputs"""
    import io
    from contextlib import redirect_stdout, redirect_stderr
    import time
    
    test_cases = problem.get('test_cases', [])
    scoring_method = problem.get('scoring_method', 'test_cases')
    total_points = problem.get('total_points', 100)
    
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()
    
    start_time = time.time()
    passed_tests = 0
    total_tests = len(test_cases) if test_cases else 1
    test_results = []
    points_earned = 0
    
    print(f"🧮 Starting dynamic scoring - {total_tests} test cases")
    
    try:
        if test_cases:
            # ✅ TEST CASE BASED SCORING
            for i, test_case in enumerate(test_cases):
                test_input = test_case.get('input', '')
                expected_output = test_case.get('expected_output', '').strip()
                test_points = test_case.get('points', total_points // total_tests)
                
                print(f"📋 Test {i+1}: Input='{test_input}', Expected='{expected_output}'")
                
                try:
                    # Create a modified version of the code that handles input
                    if test_input:
                        # Inject input into the code execution environment
                        modified_code = f"""
import io
import sys
sys.stdin = io.StringIO('{test_input}')
{code}
"""
                    else:
                        modified_code = code
                    
                    # Execute the code
                    stdout_buffer = io.StringIO()
                    stderr_buffer = io.StringIO()
                    
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(modified_code, {"__builtins__": __builtins__})
                    
                    actual_output = stdout_buffer.getvalue().strip()
                    stderr_content = stderr_buffer.getvalue()
                    
                    print(f"🔍 Test {i+1} - Actual: '{actual_output}', Expected: '{expected_output}'")
                    
                    # Check if output matches
                    if actual_output == expected_output:
                        passed_tests += 1
                        points_earned += test_points
                        test_results.append({
                            "test_number": i + 1,
                            "passed": True,
                            "input": test_input,
                            "expected_output": expected_output,
                            "actual_output": actual_output,
                            "points_earned": test_points,
                            "description": test_case.get('description', f'Test case {i+1}')
                        })
                        print(f"✅ Test {i+1} PASSED - {test_points} points")
                    else:
                        test_results.append({
                            "test_number": i + 1,
                            "passed": False,
                            "input": test_input,
                            "expected_output": expected_output,
                            "actual_output": actual_output,
                            "points_earned": 0,
                            "error": f"Output mismatch. Got '{actual_output}', expected '{expected_output}'",
                            "description": test_case.get('description', f'Test case {i+1}')
                        })
                        print(f"❌ Test {i+1} FAILED - Expected '{expected_output}', got '{actual_output}'")
                
                except Exception as e:
                    test_results.append({
                        "test_number": i + 1,
                        "passed": False,
                        "input": test_input,
                        "expected_output": expected_output,
                        "actual_output": f"Error: {str(e)}",
                        "points_earned": 0,
                        "error": str(e),
                        "description": test_case.get('description', f'Test case {i+1}')
                    })
                    print(f"❌ Test {i+1} ERROR - {str(e)}")
        
        else:
            # ✅ FALLBACK: BASIC EXECUTION TEST
            try:
                with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                    exec(code, {"__builtins__": __builtins__})
                
                passed_tests = 1
                points_earned = total_points
                test_results = [{
                    "test_number": 1,
                    "passed": True,
                    "input": "",
                    "expected_output": "Code should execute without errors",
                    "actual_output": stdout_buffer.getvalue().strip(),
                    "points_earned": total_points,
                    "description": "Basic execution test"
                }]
            except Exception as e:
                test_results = [{
                    "test_number": 1,
                    "passed": False,
                    "input": "",
                    "expected_output": "Code should execute without errors",
                    "actual_output": f"Error: {str(e)}",
                    "points_earned": 0,
                    "error": str(e),
                    "description": "Basic execution test"
                }]
    
    except Exception as e:
        print(f"❌ Scoring error: {str(e)}")
        test_results = [{
            "test_number": 1,
            "passed": False,
            "input": "",
            "expected_output": "Code should execute without errors",
            "actual_output": f"Scoring error: {str(e)}",
            "points_earned": 0,
            "error": str(e),
            "description": "Scoring system error"
        }]
    
    execution_time = time.time() - start_time
    
    # Calculate final score percentage
    final_score = int((points_earned / total_points) * 100) if total_points > 0 else 0
    
    print(f"🏆 FINAL SCORE: {final_score}% ({points_earned}/{total_points} points, {passed_tests}/{total_tests} tests)")
    
    return {
        'score': final_score,
        'passed_tests': passed_tests,
        'total_tests': total_tests,
        'test_results': test_results,
        'execution_time': round(execution_time, 3),
        'details': {
            'points_earned': points_earned,
            'total_points': total_points,
            'scoring_method': scoring_method
        }
    }

# ===================================================================
# ✅ ENHANCED EXAM ENDPOINTS WITH DYNAMIC SCORING
# ===================================================================

@app.route('/api/exam/upload-question', methods=['POST', 'OPTIONS'])
def upload_question_direct():
    """Enhanced question upload with dynamic scoring"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        print(f"📤 Enhanced question upload request")
        
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        question_data = data.get('question', {})
        
        print(f"📝 Uploading question '{question_data.get('title')}' to exam {exam_code}")
        
        if not exam_code or not question_data:
            return jsonify({"success": False, "error": "Missing exam_code or question data"}), 400
        
        # Get database
        db = get_db()
        
        # Find the exam
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            print(f"❌ Exam {exam_code} not found")
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Check if exam can be modified
        if exam.get('status') != 'waiting':
            return jsonify({"success": False, "error": "Cannot modify questions after exam has started"}), 400
        
        # ✅ ENHANCED QUESTION STRUCTURE WITH DYNAMIC SCORING
        question = {
            "id": str(uuid.uuid4()),
            "title": question_data.get('title', 'Custom Question'),
            "description": question_data.get('description', 'Custom programming question'),
            "difficulty": question_data.get('difficulty', 'medium'),
            "function_name": question_data.get('function_name', 'solve'),
            "starter_code": question_data.get('starter_code', {
                'python': 'def solve():\n    # Write your solution here\n    pass'
            }),
            # ✅ ENHANCED TEST CASES FOR DYNAMIC SCORING
            "test_cases": question_data.get('test_cases', [
                {
                    "input": "",
                    "expected_output": "Hello World",
                    "description": "Basic test case",
                    "is_public": True,
                    "points": 25
                }
            ]),
            "examples": question_data.get('examples', []),
            "constraints": question_data.get('constraints', []),
            "time_limit": question_data.get('time_limit', 1000),
            "memory_limit": question_data.get('memory_limit', '128MB'),
            "created_at": datetime.now(),
            "uploaded_by": exam.get('host_name', 'Host'),
            "languages": list(question_data.get('starter_code', {}).keys()),
            # ✅ HOST'S CORRECT SOLUTION
            "correct_solution": {
                "python": question_data.get('correct_solution', {}).get('python', ''),
                "java": question_data.get('correct_solution', {}).get('java', ''),
                "javascript": question_data.get('correct_solution', {}).get('javascript', '')
            },
            "scoring_method": question_data.get('scoring_method', 'test_cases'),
            "total_points": question_data.get('total_points', 100)
        }
        
        # Update exam
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {
                "$set": {
                    "problem": question,
                    "problem_title": question['title'],
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"✅ Enhanced question '{question['title']}' uploaded to exam {exam_code}")
            return jsonify({
                "success": True,
                "message": "Question uploaded successfully with dynamic scoring",
                "question_id": question['id'],
                "question_title": question['title'],
                "test_cases_count": len(question['test_cases']),
                "total_points": question['total_points']
            })
        else:
            print(f"❌ Failed to update exam {exam_code}")
            return jsonify({"success": False, "error": "Failed to update exam"}), 500
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/submit-solution', methods=['POST', 'OPTIONS'])
def submit_solution_direct():
    """Enhanced solution submission with dynamic scoring"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        language = data.get('language', 'python')
        code = data.get('code', '').strip()
        participant_name = data.get('participant_name', 'Anonymous')
        
        print(f"📤 ENHANCED SUBMIT: Exam {exam_code}, Language: {language}, Participant: {participant_name}")
        
        if not exam_code or not code:
            return jsonify({"success": False, "error": "Missing exam_code or code"}), 400
        
        # Get database
        db = get_db()
        
        # Find the exam
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        if exam.get('status') != 'active':
            return jsonify({"success": False, "error": "Exam is not active"}), 400
        
        # Get the problem/question
        problem = exam.get('problem', {})
        if not problem:
            return jsonify({"success": False, "error": "No problem found for this exam"}), 400
        
        # ✅ DYNAMIC SCORING SYSTEM
        scoring_result = calculate_dynamic_score(code, language, problem)
        
        # Store enhanced submission
        submission = {
            "exam_code": exam_code,
            "participant_name": participant_name,
            "language": language,
            "code": code,
            "score": scoring_result['score'],
            "passed_tests": scoring_result['passed_tests'],
            "total_tests": scoring_result['total_tests'],
            "test_results": scoring_result['test_results'],
            "execution_time": scoring_result['execution_time'],
            "submitted_at": datetime.now(),
            "submission_id": str(uuid.uuid4()),
            "scoring_details": scoring_result['details']
        }
        
        # Save to database
        db.submissions.insert_one(submission)
        
        # Update participant status in leaderboard
        db.participants.update_one(
            {"exam_code": exam_code, "name": participant_name},
            {
                "$set": {
                    "completed": True,
                    "score": scoring_result['score'],
                    "submitted_at": datetime.now(),
                    "language": language,
                    "passed_tests": scoring_result['passed_tests'],
                    "total_tests": scoring_result['total_tests'],
                    "points_earned": scoring_result['details']['points_earned'],
                    "total_points": scoring_result['details']['total_points']
                }
            },
            upsert=True
        )
        
        print(f"✅ Enhanced submission saved - Score: {scoring_result['score']}% ({scoring_result['passed_tests']}/{scoring_result['total_tests']} tests passed)")
        
        return jsonify({
            "success": True,
            "message": "Solution submitted successfully with dynamic scoring!",
            "score": scoring_result['score'],
            "passed_tests": scoring_result['passed_tests'],
            "total_tests": scoring_result['total_tests'],
            "test_results": scoring_result['test_results'],
            "execution_time": scoring_result['execution_time'],
            "submission_id": submission["submission_id"],
            "scoring_details": scoring_result['details']
        })
        
    except Exception as e:
        print(f"❌ Enhanced submit error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ OTHER EXISTING ENDPOINTS (keeping all your current ones)
# ===================================================================

@app.route('/api/exam/update-duration', methods=['POST', 'OPTIONS'])
def update_duration_direct():
    """Direct endpoint for duration update"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        duration_minutes = data.get('duration_minutes', 0)
        
        print(f"⏰ DIRECT: Updating duration for exam {exam_code} to {duration_minutes} minutes")
        
        if not exam_code or duration_minutes <= 0:
            return jsonify({"success": False, "error": "Invalid data"}), 400
        
        # Get database
        db = get_db()
        
        # Find and update exam
        result = db.exams.update_one(
            {"exam_code": exam_code, "status": "waiting"},
            {"$set": {"duration_minutes": duration_minutes}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Duration updated to {duration_minutes} minutes")
            return jsonify({
                "success": True,
                "message": f"Duration updated to {duration_minutes} minutes"
            })
        else:
            return jsonify({"success": False, "error": "Exam not found or already started"}), 404
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/info/<exam_code>', methods=['GET', 'OPTIONS'])
def get_exam_info_direct(exam_code):
    """Get exam information"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"📋 Getting exam info for: {exam_code}")
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        if '_id' in exam:
            exam['_id'] = str(exam['_id'])
        
        return jsonify({
            "success": True,
            "exam_info": exam
        })
        
    except Exception as e:
        print(f"❌ Get exam info error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/get-problem/<exam_code>', methods=['GET', 'OPTIONS'])
def get_exam_problem_direct(exam_code):
    """Get exam problem"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"📝 Getting problem for exam: {exam_code}")
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Convert ObjectId to string
        if '_id' in exam:
            exam['_id'] = str(exam['_id'])
        
        return jsonify({
            "success": True,
            "exam_info": exam,
            "problem": exam.get('problem', {})
        })
        
    except Exception as e:
        print(f"❌ Get problem error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/participants/<exam_code>', methods=['GET', 'OPTIONS'])
def get_participants_direct(exam_code):
    """Get exam participants"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"👥 Getting participants for: {exam_code}")
        db = get_db()
        participants = list(db.participants.find({"exam_code": exam_code.upper()}))
        
        # Convert ObjectId to string
        for participant in participants:
            if '_id' in participant:
                participant['_id'] = str(participant['_id'])
        
        return jsonify({
            "success": True,
            "participants": participants
        })
        
    except Exception as e:
        print(f"❌ Get participants error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/leaderboard/<exam_code>', methods=['GET', 'OPTIONS'])
def get_leaderboard_direct(exam_code):
    """Enhanced leaderboard with dynamic scoring details"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"🏆 Getting enhanced leaderboard for: {exam_code}")
        db = get_db()
        
        # Get exam info
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Get participants with enhanced scoring details
        participants = list(db.participants.find({"exam_code": exam_code.upper()}))
        
        # Sort by score (highest first) and add ranks
        completed_participants = [p for p in participants if p.get('completed', False)]
        completed_participants.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        leaderboard = []
        for i, participant in enumerate(completed_participants):
            participant['rank'] = i + 1
            if '_id' in participant:
                participant['_id'] = str(participant['_id'])
            leaderboard.append(participant)
        
        # Get waiting participants
        waiting_participants = [p for p in participants if not p.get('completed', False)]
        for participant in waiting_participants:
            if '_id' in participant:
                participant['_id'] = str(participant['_id'])
        
        # Calculate enhanced stats
        scores = [p.get('score', 0) for p in completed_participants]
        passed_tests = [p.get('passed_tests', 0) for p in completed_participants]
        total_tests = [p.get('total_tests', 1) for p in completed_participants]
        
        stats = {
            "total_participants": len(participants),
            "completed_submissions": len(completed_participants),
            "waiting_submissions": len(waiting_participants),
            "average_score": sum(scores) / len(scores) if scores else 0,
            "highest_score": max(scores) if scores else 0,
            "average_tests_passed": sum(passed_tests) / len(passed_tests) if passed_tests else 0,
            "total_test_cases": max(total_tests) if total_tests else 1,
            "blockchain_participants": 0  # Add if you have blockchain functionality
        }
        
        # Convert exam ObjectId
        if '_id' in exam:
            exam['_id'] = str(exam['_id'])
        
        return jsonify({
            "success": True,
            "leaderboard": leaderboard,
            "waiting_participants": waiting_participants,
            "stats": stats,
            "exam_info": exam
        })
        
    except Exception as e:
        print(f"❌ Enhanced leaderboard error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/start-exam', methods=['POST', 'OPTIONS'])
def start_exam_direct():
    """Start an exam"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        
        print(f"🚀 Starting exam: {exam_code}")
        
        db = get_db()
        
        # Calculate end time
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        if exam.get('status') != 'waiting':
            return jsonify({"success": False, "error": "Exam already started or completed"}), 400
        
        start_time = datetime.now()
        duration_minutes = exam.get('duration_minutes', 30)
        end_time = datetime.fromtimestamp(start_time.timestamp() + (duration_minutes * 60))
        
        # Update exam status
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {
                "$set": {
                    "status": "active",
                    "start_time": start_time,
                    "end_time": end_time,
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"✅ Exam {exam_code} started successfully")
            return jsonify({
                "success": True,
                "message": "Exam started successfully",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            })
        else:
            return jsonify({"success": False, "error": "Failed to start exam"}), 500
            
    except Exception as e:
        print(f"❌ Start exam error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/stop-exam', methods=['POST', 'OPTIONS'])
def stop_exam_direct():
    """Stop an exam"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        
        print(f"🛑 Stopping exam: {exam_code}")
        
        db = get_db()
        
        # Update exam status
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.now(),
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"✅ Exam {exam_code} stopped successfully")
            return jsonify({
                "success": True,
                "message": "Exam stopped successfully"
            })
        else:
            return jsonify({"success": False, "error": "Exam not found"}), 404
            
    except Exception as e:
        print(f"❌ Stop exam error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ COMPILER ENDPOINT (Fixed timeout issue)
# ===================================================================

@app.route('/api/compiler/execute', methods=['POST', 'OPTIONS'])
def execute_code_direct():
    """Direct compiler endpoint - FIXED TIMEOUT ISSUE"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        language = data.get('language', 'python').lower()
        code = data.get('code', '').strip()
        
        print(f"🔧 COMPILER: Executing {language} code: {code}")
        
        if not code:
            return jsonify({"success": False, "error": "No code provided"}), 400
        
        if language == 'python':
            try:
                # ✅ SIMPLE EXEC METHOD (no subprocess, no timeout issues)
                import io
                import sys
                from contextlib import redirect_stdout, redirect_stderr
                import time
                
                # Capture output
                stdout_buffer = io.StringIO()
                stderr_buffer = io.StringIO()
                
                start_time = time.time()
                
                try:
                    # Execute Python code using exec
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(code, {"__builtins__": __builtins__})
                    
                    execution_time = time.time() - start_time
                    stdout_content = stdout_buffer.getvalue()
                    stderr_content = stderr_buffer.getvalue()
                    
                    print(f"✅ Python exec successful. Output: '{stdout_content.strip()}'")
                    
                    return jsonify({
                        "success": True,
                        "output": stdout_content or "Code executed successfully (no output)",
                        "error": stderr_content if stderr_content else None,
                        "language": "python",
                        "execution_time": round(execution_time, 3)
                    })
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    print(f"❌ Python execution error: {str(e)}")
                    return jsonify({
                        "success": False,
                        "error": f"Runtime error: {str(e)}",
                        "execution_time": round(execution_time, 3)
                    })
                    
            except Exception as e:
                print(f"❌ Python setup error: {str(e)}")
                return jsonify({"success": False, "error": f"Setup failed: {str(e)}"}), 500
        else:
            return jsonify({
                "success": False,
                "error": f"Language '{language}' not supported. Only Python available."
            })
            
    except Exception as e:
        print(f"❌ Compiler endpoint error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ LEGACY ENDPOINTS (keeping your existing ones)
# ===================================================================

@app.route('/api/exam/questions/<exam_code>', methods=['GET', 'OPTIONS'])
def get_exam_questions_direct(exam_code):
    """Get all questions for an exam"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        questions = exam.get('problem', {})
        
        return jsonify({
            "success": True,
            "questions": questions,
            "total_questions": 1 if questions else 0
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/update-question', methods=['POST', 'OPTIONS'])
def update_question_direct():
    """Update an existing question in an exam"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        question_data = data.get('question', {})
        
        if not exam_code or not question_data:
            return jsonify({"success": False, "error": "Missing data"}), 400
        
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        if exam['status'] != 'waiting':
            return jsonify({"success": False, "error": "Cannot modify questions after exam has started"}), 400
        
        # Update question
        question_data['updated_at'] = datetime.now()
        
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {"$set": {"problem": question_data}}
        )
        
        if result.modified_count > 0:
            return jsonify({"success": True, "message": "Question updated successfully"})
        else:
            return jsonify({"success": False, "error": "Failed to update question"}), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Request logging
@app.before_request
def log_request():
    path = request.path
    if path.startswith('/api/exam'):
        logger.info(f"📥 Exam request: {request.method} {path}")
        if request.method in ['POST', 'PUT'] and request.is_json:
            print(f"📦 Request data: {request.json}")
    elif path.startswith('/api/compiler'):
        logger.info(f"📥 Compiler request: {request.method} {path}")
    elif path.startswith('/api/admin'):
        auth = request.headers.get('Authorization','')
        logger.info(f"🔒 Admin request: {request.method} {path} Auth={auth[:20]}")

# Handle CORS preflight
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        resp = jsonify({'status':'ok'})
        resp.headers.update({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,Origin,X-Requested-With",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Credentials": "true"
        })
        return resp

# Security headers
@app.after_request
def secure_headers(resp):
    resp.headers.update({
        'X-Content-Type-Options':'nosniff',
        'X-Frame-Options':'DENY',
        'X-XSS-Protection':'1; mode=block'
    })
    return resp

# Health & debug endpoints
@app.route('/')
def health_root():
    return jsonify({
        "status":"OpenLearnX API running",
        "version":"2.1.0 - Enhanced Dynamic Scoring",
        "timestamp": datetime.now().isoformat(),
        "features":{
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability(),
            "dynamic_scoring": True
        },
        "endpoints": {
            "exam": "/api/exam",
            "compiler": "/api/compiler",
            "admin": "/api/admin",
            "health": "/api/health"
        },
        "blueprints_registered": len(blueprints_registered),
        "blueprints_failed": len(blueprints_failed),
        "direct_exam_endpoints": [
            "/api/exam/upload-question (Enhanced)",
            "/api/exam/submit-solution (Dynamic Scoring)",
            "/api/exam/leaderboard/<exam_code> (Enhanced)",
            "/api/exam/update-duration", 
            "/api/exam/info/<exam_code>",
            "/api/exam/get-problem/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/start-exam",
            "/api/exam/stop-exam",
            "/api/compiler/execute"
        ]
    })

@app.route('/api/health')
def api_health():
    status = "healthy"
    services = {
        "mongodb": MONGO_SERVICE_AVAILABLE,
        "web3": WEB3_SERVICE_AVAILABLE,
        "wallet": WALLET_SERVICE_AVAILABLE,
        "compiler": COMPILER_SERVICE_AVAILABLE,
        "docker": check_docker_availability(),
        "dynamic_scoring": True
    }
    
    # Check MongoDB connection
    if MONGO_SERVICE_AVAILABLE:
        try:
            db = get_db()
            db.command('ismaster')
            services["mongodb_connection"] = "connected"
        except Exception as e:
            services["mongodb_connection"] = f"error: {str(e)}"
            status = "degraded"
    
    return jsonify({
        "status": status,
        "services": services,
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed
    }), 200 if status == "healthy" else 503

@app.route('/debug/routes')
def debug_routes():
    rules = []
    for rule in app.url_map.iter_rules():
        rules.append({
            "rule": str(rule),
            "methods": list(rule.methods),
            "endpoint": rule.endpoint
        })
    
    return jsonify({
        "total": len(rules),
        "routes": sorted(rules, key=lambda x: x["rule"]),
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed,
        "exam_routes": [r for r in rules if '/exam' in r['rule']]
    })

@app.route('/debug/services')
def debug_services():
    return jsonify({
        "services": {
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability(),
            "dynamic_scoring": True
        },
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed,
        "direct_endpoints_added": True,
        "enhanced_features": [
            "Dynamic Test Case Scoring",
            "Host-defined Correct Solutions",
            "Point-based Test Cases",
            "Enhanced Leaderboard with Test Details"
        ]
    })

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Not Found",
        "path": request.path,
        "method": request.method,
        "available_blueprints": blueprints_registered,
        "direct_exam_endpoints": [
            "/api/exam/upload-question (Enhanced with Dynamic Scoring)",
            "/api/exam/submit-solution (Dynamic Scoring)",
            "/api/exam/leaderboard/<exam_code> (Enhanced)",
            "/api/exam/update-duration",
            "/api/exam/info/<exam_code>",
            "/api/exam/get-problem/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/start-exam",
            "/api/exam/stop-exam",
            "/api/compiler/execute"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 Error: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "timestamp": datetime.now().isoformat()
    }), 500

# Startup initialization
def initialize_application():
    logger.info("🚀 Initializing OpenLearnX Backend with Dynamic Scoring")
    
    # Show blueprint registration status
    logger.info(f"📋 Blueprints registered: {len(blueprints_registered)}")
    for bp in blueprints_registered:
        logger.info(f"  ✅ {bp}")
    
    if blueprints_failed:
        logger.warning(f"❌ Blueprints failed: {len(blueprints_failed)}")
        for bp, error in blueprints_failed:
            logger.warning(f"  ❌ {bp}: {error}")
    
    # Test DB
    if MONGO_SERVICE_AVAILABLE:
        try:
            asyncio.get_event_loop().run_until_complete(mongo_service.init_db())
            logger.info("✅ MongoDB initialized")
            
            # Test direct connection
            db = get_db()
            db.command('ismaster')
            logger.info("✅ Direct MongoDB connection verified")
        except Exception as e:
            logger.error(f"❌ MongoDB init failed: {e}")
    
    # Test Web3
    if WEB3_SERVICE_AVAILABLE:
        if web3_service.w3.is_connected():
            logger.info("✅ Web3 connected")
        else:
            logger.warning("⚠️ Web3 not connected")
    
    # Test Docker
    if COMPILER_SERVICE_AVAILABLE and not check_docker_availability():
        logger.warning("⚠️ Docker unavailable")
    
    # Log enhanced endpoints
    logger.info("🔧 Enhanced exam endpoints with dynamic scoring:")
    direct_endpoints = [
        "/api/exam/upload-question (Enhanced with Test Cases)",
        "/api/exam/submit-solution (Dynamic Scoring System)",
        "/api/exam/leaderboard/<exam_code> (Enhanced Stats)",
        "/api/exam/update-duration",
        "/api/exam/info/<exam_code>",
        "/api/exam/get-problem/<exam_code>", 
        "/api/exam/participants/<exam_code>",
        "/api/exam/start-exam",
        "/api/exam/stop-exam",
        "/api/compiler/execute"
    ]
    for endpoint in direct_endpoints:
        logger.info(f"  ✅ {endpoint}")
    
    logger.info("🧮 Dynamic Scoring Features:")
    scoring_features = [
        "Test case based scoring",
        "Point distribution per test case",
        "Host-defined correct solutions",
        "Enhanced leaderboard with test details",
        "Automatic output matching"
    ]
    for feature in scoring_features:
        logger.info(f"  🎯 {feature}")
    
    return True

if __name__ == '__main__':
    initialize_application()
    
    logger.info("🚀 Starting OpenLearnX Backend Server with Dynamic Scoring")
    logger.info("📚 Enhanced Features: Dynamic Test Case Scoring, Host Solutions, Point-based Tests")
    logger.info("🌐 Server starting on http://0.0.0.0:5000")
    logger.info("🔧 All /api/* endpoints have CORS enabled")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True, use_reloader=False)
