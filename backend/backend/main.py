import os
import asyncio
import logging
import uuid
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

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

# CORS
CORS(app, resources={r"/api/*": {
    "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    "supports_credentials": True,
    "expose_headers": ["Authorization"]
}})

# Logging
logging.basicConfig(level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.StreamHandler()])
logger = logging.getLogger(__name__)

# Initialize services
try:
    mongo_service = MongoService(app.config['MONGODB_URI'])
    app.config['MONGO_SERVICE'] = mongo_service
    MONGO_SERVICE_AVAILABLE = True
    logger.info("✅ MongoService initialized")
except Exception as e:
    MONGO_SERVICE_AVAILABLE = False
    logger.error(f"❌ Failed MongoService init: {e}")

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

# Database connection
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
    total_points = problem.get('total_points', 100)
    
    start_time = time.time()
    passed_tests = 0
    total_tests = len(test_cases) if test_cases else 1
    test_results = []
    points_earned = 0
    
    print(f"🧮 Dynamic scoring - {total_tests} test cases, {total_points} total points")
    
    try:
        if test_cases:
            for i, test_case in enumerate(test_cases):
                test_input = test_case.get('input', '')
                expected_output = test_case.get('expected_output', '').strip()
                test_points = test_case.get('points', total_points // total_tests)
                
                print(f"📋 Test {i+1}: Input='{test_input}', Expected='{expected_output}', Points={test_points}")
                
                try:
                    stdout_buffer = io.StringIO()
                    stderr_buffer = io.StringIO()
                    
                    exec_globals = {"__builtins__": __builtins__}
                    if test_input:
                        exec_globals['input'] = lambda prompt='': test_input
                    
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(code, exec_globals)
                    
                    actual_output = stdout_buffer.getvalue().strip()
                    
                    print(f"🔍 Test {i+1} - Actual: '{actual_output}', Expected: '{expected_output}'")
                    
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
                        print(f"✅ Test {i+1} PASSED - {test_points} points earned")
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
                    print(f"❌ Test {i+1} EXCEPTION - {str(e)}")
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
        else:
            # Fallback: Basic execution test
            try:
                stdout_buffer = io.StringIO()
                stderr_buffer = io.StringIO()
                
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
        print(f"❌ Scoring system error: {str(e)}")
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
            'scoring_method': 'test_cases'
        }
    }

# ===================================================================
# ✅ SUBMIT SOLUTION WITH GUARANTEED LEADERBOARD UPDATE
# ===================================================================

@app.route('/api/exam/submit-solution', methods=['POST', 'OPTIONS'])
def submit_solution_direct():
    """Submit solution with guaranteed leaderboard update"""
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
        participant_name = data.get('participant_name', 'Anonymous').strip()
        
        print(f"📤 SUBMIT: Exam {exam_code}, Participant: '{participant_name}'")
        
        if not exam_code or not code or not participant_name:
            return jsonify({"success": False, "error": "Missing required data"}), 400
        
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
        
        # Check for existing submission
        existing_submission = db.submissions.find_one({
            "exam_code": exam_code,
            "participant_name": participant_name
        })
        
        if existing_submission:
            print(f"⚠️ Participant {participant_name} already has submission")
            return jsonify({"success": False, "error": f"Participant '{participant_name}' has already submitted"}), 400
        
        # Calculate score
        scoring_result = calculate_dynamic_score(code, language, problem)
        
        # Store submission
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
        
        # Save submission to database
        submission_result = db.submissions.insert_one(submission)
        print(f"💾 Submission saved with ID: {submission_result.inserted_id}")
        
        # Delete old participant record and create new completed one
        print(f"🗑️ Deleting any existing participant records for {participant_name}")
        delete_result = db.participants.delete_many({"exam_code": exam_code, "name": participant_name})
        print(f"🗑️ Deleted {delete_result.deleted_count} old participant records")
        
        # Create fresh completed participant record
        participant_record = {
            "exam_code": exam_code,
            "name": participant_name,
            "completed": True,  # CRITICAL: Must be True
            "score": scoring_result['score'],
            "submitted_at": datetime.now(),
            "joined_at": datetime.now(),
            "language": language,
            "passed_tests": scoring_result['passed_tests'],
            "total_tests": scoring_result['total_tests'],
            "points_earned": scoring_result['details']['points_earned'],
            "total_points": scoring_result['details']['total_points'],
            "session_id": str(uuid.uuid4()),
            "rank": 0,
            "updated_at": datetime.now()
        }
        
        # Insert fresh participant record
        participant_result = db.participants.insert_one(participant_record)
        print(f"👤 NEW participant record created with ID: {participant_result.inserted_id}")
        
        # Verification
        verification = db.participants.find_one({"exam_code": exam_code, "name": participant_name})
        if verification and verification.get('completed'):
            print(f"✅ VERIFICATION SUCCESS: {participant_name} completed={verification.get('completed')}, score={verification.get('score')}")
        else:
            print(f"❌ VERIFICATION FAILED: Participant record not found or not completed")
            return jsonify({"success": False, "error": "Failed to update participant status"}), 500
        
        print(f"✅ SUBMIT COMPLETE - {participant_name}: {scoring_result['score']}% ({scoring_result['passed_tests']}/{scoring_result['total_tests']} tests)")
        
        return jsonify({
            "success": True,
            "message": f"Solution submitted successfully for {participant_name}!",
            "score": scoring_result['score'],
            "passed_tests": scoring_result['passed_tests'],
            "total_tests": scoring_result['total_tests'],
            "test_results": scoring_result['test_results'],
            "execution_time": scoring_result['execution_time'],
            "submission_id": submission["submission_id"],
            "scoring_details": scoring_result['details'],
            "participant_name": participant_name,
            "leaderboard_updated": True
        })
        
    except Exception as e:
        print(f"❌ Submit error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Submission failed: {str(e)}"}), 500

# ===================================================================
# ✅ ULTIMATE LEADERBOARD FIX - Handles duplicates and forces sync
# ===================================================================

@app.route('/api/exam/leaderboard/<exam_code>', methods=['GET', 'OPTIONS'])
def get_leaderboard_direct(exam_code):
    """ULTIMATE LEADERBOARD FIX - Handles duplicates and forces correct sync"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"🏆 ULTIMATE LEADERBOARD FIX: {exam_code}")
        db = get_db()
        
        # Get exam info
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # ✅ ULTIMATE FIX: Get unique submissions (latest per participant) using aggregation
        print(f"🔄 Getting latest submission per participant...")
        
        # Use MongoDB aggregation to get latest submission per participant
        pipeline = [
            {"$match": {"exam_code": exam_code.upper()}},
            {"$sort": {"submitted_at": -1}},  # Sort by latest first
            {"$group": {
                "_id": "$participant_name",  # Group by participant name
                "latest_submission": {"$first": "$$ROOT"}  # Take the first (latest) submission
            }},
            {"$replaceRoot": {"newRoot": "$latest_submission"}}  # Replace root with the submission
        ]
        
        unique_submissions = list(db.submissions.aggregate(pipeline))
        print(f"📋 Found {len(unique_submissions)} unique submissions after deduplication")
        
        # Debug: Print unique submissions
        for sub in unique_submissions:
            print(f"  - {sub.get('participant_name')}: {sub.get('score')}% at {sub.get('submitted_at')}")
        
        # ✅ FORCE REBUILD: Delete ALL participants and recreate from unique submissions
        delete_result = db.participants.delete_many({"exam_code": exam_code.upper()})
        print(f"🗑️ Deleted {delete_result.deleted_count} old participant records")
        
        # Create leaderboard from unique submissions
        leaderboard = []
        for submission in unique_submissions:
            participant_name = submission.get('participant_name')
            if not participant_name:
                continue
                
            # Create completed participant record
            participant = {
                "exam_code": exam_code.upper(),
                "name": participant_name,
                "completed": True,  # ✅ ALWAYS TRUE
                "score": submission.get('score', 0),
                "submitted_at": submission.get('submitted_at'),
                "joined_at": submission.get('submitted_at'),
                "language": submission.get('language'),
                "passed_tests": submission.get('passed_tests', 0),
                "total_tests": submission.get('total_tests', 1),
                "points_earned": submission.get('scoring_details', {}).get('points_earned', 0),
                "total_points": submission.get('scoring_details', {}).get('total_points', 100),
                "session_id": f"ultimate-{uuid.uuid4()}",
                "rank": 0  # Will be set below
            }
            
            # Insert participant and add to leaderboard
            result = db.participants.insert_one(participant)
            participant['_id'] = str(result.inserted_id)
            leaderboard.append(participant)
            
            print(f"✅ CREATED: {participant_name} with score {submission.get('score', 0)}%")
        
        # Sort by score (highest first) and assign ranks
        leaderboard.sort(key=lambda x: x.get('score', 0), reverse=True)
        for i, participant in enumerate(leaderboard):
            participant['rank'] = i + 1
            # Update rank in database
            db.participants.update_one(
                {"_id": ObjectId(participant['_id'])},
                {"$set": {"rank": i + 1}}
            )
        
        # Calculate accurate stats
        scores = [p.get('score', 0) for p in leaderboard]
        passed_tests = [p.get('passed_tests', 0) for p in leaderboard]
        total_tests = [p.get('total_tests', 1) for p in leaderboard]
        
        stats = {
            "total_participants": len(leaderboard),
            "completed_submissions": len(leaderboard),
            "waiting_submissions": 0,  # No waiting since we only show submitted participants
            "average_score": round(sum(scores) / len(scores)) if scores else 0,
            "highest_score": max(scores) if scores else 0,
            "average_tests_passed": round(sum(passed_tests) / len(passed_tests)) if passed_tests else 0,
            "total_test_cases": max(total_tests) if total_tests else 1,
            "blockchain_participants": 0
        }
        
        if '_id' in exam:
            exam['_id'] = str(exam['_id'])
        
        print(f"🎯 ULTIMATE LEADERBOARD COMPLETE:")
        print(f"   - Unique participants: {len(leaderboard)}")
        print(f"   - Waiting participants: 0")
        print(f"   - Average score: {stats['average_score']}%")
        
        return jsonify({
            "success": True,
            "leaderboard": leaderboard,
            "waiting_participants": [],  # Always empty - only show completed participants
            "stats": stats,
            "exam_info": exam,
            "ultimate_fix_applied": True,
            "unique_submissions_processed": len(unique_submissions)
        })
        
    except Exception as e:
        print(f"❌ Ultimate leaderboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ OTHER EXAM ENDPOINTS
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
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        question_data = data.get('question', {})
        
        if not exam_code or not question_data:
            return jsonify({"success": False, "error": "Missing exam_code or question data"}), 400
        
        db = get_db()
        
        # Find the exam
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Check if exam can be modified
        if exam.get('status') != 'waiting':
            return jsonify({"success": False, "error": "Cannot modify questions after exam has started"}), 400
        
        # Enhanced question structure
        question = {
            "id": str(uuid.uuid4()),
            "title": question_data.get('title', 'Custom Question'),
            "description": question_data.get('description', 'Custom programming question'),
            "difficulty": question_data.get('difficulty', 'medium'),
            "function_name": question_data.get('function_name', 'solve'),
            "starter_code": question_data.get('starter_code', {
                'python': 'def solve():\n    # Write your solution here\n    pass'
            }),
            "test_cases": question_data.get('test_cases', [
                {
                    "input": "",
                    "expected_output": "Hello World",
                    "description": "Basic test case",
                    "is_public": True,
                    "points": 100
                }
            ]),
            "examples": question_data.get('examples', []),
            "constraints": question_data.get('constraints', []),
            "time_limit": question_data.get('time_limit', 1000),
            "memory_limit": question_data.get('memory_limit', '128MB'),
            "created_at": datetime.now(),
            "uploaded_by": exam.get('host_name', 'Host'),
            "languages": list(question_data.get('starter_code', {}).keys()),
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
            return jsonify({
                "success": True,
                "message": "Question uploaded successfully with dynamic scoring",
                "question_id": question['id'],
                "question_title": question['title'],
                "test_cases_count": len(question['test_cases']),
                "total_points": question['total_points']
            })
        else:
            return jsonify({"success": False, "error": "Failed to update exam"}), 500
            
    except Exception as e:
        import traceback
        traceback.print_exc()
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
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        if '_id' in exam:
            exam['_id'] = str(exam['_id'])
        
        return jsonify({
            "success": True,
            "exam_info": exam
        })
        
    except Exception as e:
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
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        if '_id' in exam:
            exam['_id'] = str(exam['_id'])
        
        return jsonify({
            "success": True,
            "exam_info": exam,
            "problem": exam.get('problem', {})
        })
        
    except Exception as e:
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
        
        db = get_db()
        exam = db.exams.find_one({"exam_code": exam_code})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        if exam.get('status') != 'waiting':
            return jsonify({"success": False, "error": "Exam already started or completed"}), 400
        
        start_time = datetime.now()
        duration_minutes = exam.get('duration_minutes', 30)
        end_time = datetime.fromtimestamp(start_time.timestamp() + (duration_minutes * 60))
        
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
            return jsonify({
                "success": True,
                "message": "Exam started successfully",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            })
        else:
            return jsonify({"success": False, "error": "Failed to start exam"}), 500
            
    except Exception as e:
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
        
        db = get_db()
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
            return jsonify({
                "success": True,
                "message": "Exam stopped successfully"
            })
        else:
            return jsonify({"success": False, "error": "Exam not found"}), 404
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ COMPILER ENDPOINT
# ===================================================================

@app.route('/api/compiler/execute', methods=['POST', 'OPTIONS'])
def execute_code_direct():
    """Direct compiler endpoint"""
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
        
        if not code:
            return jsonify({"success": False, "error": "No code provided"}), 400
        
        if language == 'python':
            try:
                import io
                from contextlib import redirect_stdout, redirect_stderr
                import time
                
                stdout_buffer = io.StringIO()
                stderr_buffer = io.StringIO()
                
                start_time = time.time()
                
                try:
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(code, {"__builtins__": __builtins__})
                    
                    execution_time = time.time() - start_time
                    stdout_content = stdout_buffer.getvalue()
                    stderr_content = stderr_buffer.getvalue()
                    
                    return jsonify({
                        "success": True,
                        "output": stdout_content or "Code executed successfully (no output)",
                        "error": stderr_content if stderr_content else None,
                        "language": "python",
                        "execution_time": round(execution_time, 3)
                    })
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    return jsonify({
                        "success": False,
                        "error": f"Runtime error: {str(e)}",
                        "execution_time": round(execution_time, 3)
                    })
                    
            except Exception as e:
                return jsonify({"success": False, "error": f"Setup failed: {str(e)}"}), 500
        else:
            return jsonify({
                "success": False,
                "error": f"Language '{language}' not supported. Only Python available."
            })
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ DEBUG ENDPOINTS
# ===================================================================

@app.route('/api/debug/complete-reset/<exam_code>', methods=['POST', 'OPTIONS'])
def complete_reset_exam(exam_code):
    """COMPLETE RESET: Fix all participant-submission mismatches"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        db = get_db()
        exam_code = exam_code.upper()
        
        print(f"🔥 COMPLETE RESET for exam: {exam_code}")
        
        # 1. Get all submissions
        submissions = list(db.submissions.find({"exam_code": exam_code}))
        print(f"📋 Found {len(submissions)} submissions")
        
        # 2. DELETE ALL participants
        delete_result = db.participants.delete_many({"exam_code": exam_code})
        print(f"🗑️ Deleted {delete_result.deleted_count} participant records")
        
        # 3. Recreate ONLY completed participants from submissions
        created_count = 0
        for submission in submissions:
            participant_name = submission.get('participant_name')
            if not participant_name:
                continue
                
            new_participant = {
                "exam_code": exam_code,
                "name": participant_name,
                "completed": True,  # ✅ ALWAYS TRUE for submissions
                "score": submission.get('score', 0),
                "submitted_at": submission.get('submitted_at'),
                "joined_at": submission.get('submitted_at'),
                "language": submission.get('language'),
                "passed_tests": submission.get('passed_tests', 0),
                "total_tests": submission.get('total_tests', 1),
                "points_earned": submission.get('scoring_details', {}).get('points_earned', 0),  
                "total_points": submission.get('scoring_details', {}).get('total_points', 100),
                "session_id": f"reset-{uuid.uuid4()}",
                "rank": 0
            }
            
            db.participants.insert_one(new_participant)
            print(f"✅ Created completed participant: {participant_name} with score {submission.get('score', 0)}%")
            created_count += 1
        
        print(f"🎯 COMPLETE RESET FINISHED: {created_count} participants recreated")
        
        return jsonify({
            "success": True,
            "message": f"Complete reset finished for {exam_code}",
            "submissions_found": len(submissions),
            "participants_deleted": delete_result.deleted_count,
            "participants_created": created_count
        })
        
    except Exception as e:
        print(f"❌ Complete reset error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ REQUEST HANDLERS
# ===================================================================

# Request logging
@app.before_request
def log_request():
    path = request.path
    if path.startswith('/api/exam'):
        logger.info(f"📥 Exam request: {request.method} {path}")

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

# Health endpoints
@app.route('/')
def health_root():
    return jsonify({
        "status":"OpenLearnX API running",
        "version":"2.4.0 - ULTIMATE LEADERBOARD FIX",
        "timestamp": datetime.now().isoformat(),
        "features":{
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability(),
            "dynamic_scoring": True,
            "ultimate_leaderboard_fix": True
        }
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
        "ultimate_leaderboard_fix": True
    }
    
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

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Not Found",
        "path": request.path,
        "method": request.method
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 Error: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "timestamp": datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    logger.info("🚀 Starting OpenLearnX Backend with ULTIMATE LEADERBOARD FIX")
    logger.info("📚 Features: Dynamic Scoring, Duplicate Handling, Force Sync")
    logger.info("🌐 Server starting on http://0.0.0.0:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True, use_reloader=False)
