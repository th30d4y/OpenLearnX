import os
import asyncio
import logging
import uuid
import random
import string
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
from routes.adaptive_quiz import bp as adaptive_quiz_bp

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

# ✅ AI Quiz Service Integration with graceful fallback
try:
    from services.ai_quiz_service import AdaptiveQuizMasterLLM
    ai_service = AdaptiveQuizMasterLLM()
    AI_QUIZ_SERVICE_AVAILABLE = True
    print("🤖 AI Quiz Service initialized successfully")
except Exception as e:
    ai_service = None
    AI_QUIZ_SERVICE_AVAILABLE = False
    print(f"⚠️ AI Quiz Service unavailable: {str(e)}")
    print("🔄 Server will continue without AI features")

# Utility function for unique room codes
def generate_room_code(length=6):
    """Generate unique room code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

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
if AI_QUIZ_SERVICE_AVAILABLE:
    app.config['AI_QUIZ_SERVICE'] = ai_service

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
    (auth_bp,         '/api/auth'),
    (test_flow_bp,    '/api/test'),
    (cert_bp,         '/api/certificate'),
    (dash_bp,         '/api/dashboard'),
    (courses_bp,      '/api/courses'),
    (quizzes_bp,      '/api/quizzes'),
    (admin_bp,        '/api/admin'),
    (exam_bp,         '/api/exam'),
    (compiler_bp,     '/api/compiler'),
    (adaptive_quiz_bp, '/api/adaptive-quiz'),
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
# ✅ ENHANCED DYNAMIC SCORING SYSTEM - CORRECTED VERSION
# ===================================================================

def calculate_dynamic_score(code, language, problem):
    """Enhanced dynamic scoring with better error handling and feedback"""
    import io
    from contextlib import redirect_stdout, redirect_stderr
    import time
    
    # Handle both old and new problem formats
    test_cases = problem.get('test_cases', [])
    total_points = problem.get('total_points', 100)
    
    # ✅ FIXED: Handle empty test cases properly
    if not test_cases:
        # Create a basic test case for simple execution
        test_cases = [{
            "input": "",
            "expected_output": "",
            "description": "Basic execution test",
            "points": total_points
        }]
    
    start_time = time.time()
    passed_tests = 0
    total_tests = len(test_cases)
    test_results = []
    points_earned = 0
    
    print(f"🧮 Enhanced Dynamic scoring - {total_tests} test cases, {total_points} total points")
    
    try:
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get('input', '')
            expected_output = test_case.get('expected_output', '').strip()
            test_points = test_case.get('points', total_points // total_tests)
            
            print(f"📋 Test {i+1}: Input='{test_input}', Expected='{expected_output}', Points={test_points}")
            
            try:
                stdout_buffer = io.StringIO()
                stderr_buffer = io.StringIO()
                
                # ✅ ENHANCED: Better execution environment
                exec_globals = {
                    "__builtins__": __builtins__,
                    "__name__": "__main__"
                }
                
                # Handle input simulation
                if test_input:
                    input_lines = test_input.split('\n') if '\n' in test_input else [test_input]
                    input_iter = iter(input_lines)
                    exec_globals['input'] = lambda prompt='': next(input_iter, '')
                else:
                    exec_globals['input'] = lambda prompt='': ''
                
                with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                    exec(code, exec_globals)
                
                actual_output = stdout_buffer.getvalue().strip()
                stderr_content = stderr_buffer.getvalue().strip()
                
                print(f"🔍 Test {i+1} - Actual: '{actual_output}', Expected: '{expected_output}'")
                
                # ✅ ENHANCED: Better output comparison
                is_correct = False
                if expected_output == "":
                    # For basic execution tests, just check if code runs without error
                    is_correct = stderr_content == ""
                else:
                    # Compare outputs with tolerance for whitespace
                    is_correct = (
                        actual_output == expected_output or 
                        actual_output.replace(' ', '') == expected_output.replace(' ', '') or
                        actual_output.lower().strip() == expected_output.lower().strip()
                    )
                
                if is_correct:
                    passed_tests += 1
                    points_earned += test_points
                    test_results.append({
                        "test_number": i + 1,
                        "passed": True,
                        "input": test_input,
                        "expected_output": expected_output,
                        "actual_output": actual_output,
                        "points_earned": test_points,
                        "description": test_case.get('description', f'Test case {i+1}'),
                        "execution_time": round(time.time() - start_time, 3)
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
                        "description": test_case.get('description', f'Test case {i+1}'),
                        "stderr": stderr_content if stderr_content else None
                    })
                    print(f"❌ Test {i+1} FAILED - Expected '{expected_output}', got '{actual_output}'")
            
            except Exception as e:
                print(f"❌ Test {i+1} EXCEPTION - {str(e)}")
                test_results.append({
                    "test_number": i + 1,
                    "passed": False,
                    "input": test_input,
                    "expected_output": expected_output,
                    "actual_output": f"Runtime Error: {str(e)}",
                    "points_earned": 0,
                    "error": str(e),
                    "description": test_case.get('description', f'Test case {i+1}'),
                    "error_type": type(e).__name__
                })
    
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
            "description": "Scoring system error",
            "error_type": type(e).__name__
        }]
        total_tests = 1
    
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
            'scoring_method': 'enhanced_dynamic',
            'language': language
        }
    }

# ===================================================================
# ✅ QUIZ ENDPOINTS - Only Blueprint Integration (No Duplicates)
# ===================================================================

@app.route('/api/quizzes/generate-ai', methods=['POST', 'OPTIONS'])
def generate_ai_quiz_direct():
    """Generate AI-powered quiz using the integrated AI service"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    if not AI_QUIZ_SERVICE_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "AI Quiz service is not available. Please check if the AI models are properly installed."
        }), 503
    
    try:
        data = request.get_json()
        topic = data.get('topic', 'General')
        difficulty = data.get('difficulty', 'medium')
        num_questions = int(data.get('num_questions', 5))
        
        print(f"🤖 Generating AI quiz: Topic={topic}, Difficulty={difficulty}, Questions={num_questions}")
        
        # Generate quiz using AI service
        ai_quiz = ai_service.generate_quiz(
            topic=topic,
            difficulty=difficulty,
            num_questions=num_questions
        )
        
        if not ai_quiz:
            return jsonify({
                "success": False,
                "error": "Failed to generate AI quiz. Please try again."
            }), 500
        
        # Save to database
        db = get_db()
        result = db.quizzes.insert_one(ai_quiz)
        ai_quiz['_id'] = str(result.inserted_id)
        
        print(f"✅ AI quiz created: {ai_quiz['title']} with {len(ai_quiz['questions'])} questions")
        
        return jsonify({
            "success": True,
            "message": f"AI quiz generated successfully with {len(ai_quiz['questions'])} questions",
            "quiz": ai_quiz
        })
        
    except Exception as e:
        print(f"❌ AI quiz generation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ ENHANCED HEALTH AND DEBUG ENDPOINTS
# ===================================================================

@app.route('/')
def health_root():
    return jsonify({
        "status": "OpenLearnX API running",
        "version": "2.6.0 - CORRECTED ULTIMATE EDITION",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "ai_quiz_service": AI_QUIZ_SERVICE_AVAILABLE,
            "docker": check_docker_availability(),
            "dynamic_scoring": True,
            "enhanced_scoring": True,
            "exam_submission": True,
            "adaptive_quiz": True,
            "enhanced_security": True,
            "ai_integration": AI_QUIZ_SERVICE_AVAILABLE
        },
        "endpoints": {
            "exam": "/api/exam/*",
            "exam_submit": "/api/exam/submit-solution",
            "quizzes": "/api/quizzes/*",
            "compiler": "/api/compiler/*",
            "ai_quiz": "/api/quizzes/generate-ai" if AI_QUIZ_SERVICE_AVAILABLE else "unavailable",
            "adaptive_quiz": "/api/adaptive-quiz/*",
            "health": "/api/health",
            "debug": "/api/debug/*"
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
        "ai_quiz_service": AI_QUIZ_SERVICE_AVAILABLE,
        "docker": check_docker_availability(),
        "enhanced_scoring": True,
        "exam_submission_fixed": True,
        "adaptive_quiz": True,
        "enhanced_version": "2.6.0"
    }
    
    # Enhanced MongoDB connection test
    if MONGO_SERVICE_AVAILABLE:
        try:
            db = get_db()
            db.command('ismaster')
            # Test collections
            collections_count = {
                "exams": db.exams.count_documents({}),
                "submissions": db.submissions.count_documents({}),
                "participants": db.participants.count_documents({}),
                "quizzes": db.quizzes.count_documents({})
            }
            services["mongodb_connection"] = "connected"
            services["collections"] = collections_count
        except Exception as e:
            services["mongodb_connection"] = f"error: {str(e)}"
            status = "degraded"
    
    # AI service health check
    if AI_QUIZ_SERVICE_AVAILABLE:
        try:
            services["ai_models_loaded"] = hasattr(ai_service, 'model_available') and ai_service.model_available
        except Exception as e:
            services["ai_service_error"] = str(e)
    
    return jsonify({
        "status": status,
        "services": services,
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed,
        "version": "2.6.0-corrected"
    }), 200 if status == "healthy" else 503

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

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Not Found",
        "path": request.path,
        "method": request.method,
        "available_endpoints": [
            "/api/exam/submit-solution",
            "/api/exam/create-exam",
            "/api/exam/join-exam",
            "/api/quizzes/*",
            "/api/health"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 Error: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "timestamp": datetime.now().isoformat(),
        "suggestion": "Check server logs for detailed error information"
    }), 500

# ===================================================================
# ✅ APPLICATION STARTUP
# ===================================================================

if __name__ == "__main__":
    print("🚀 Starting OpenLearnX Backend v2.6.0 - CORRECTED ULTIMATE EDITION")
    print("📚 Features: Enhanced Dynamic Scoring, AI Quiz Integration, Fixed Exam Submission")
    print(f"🤖 AI Quiz Service: {'✅ Available' if AI_QUIZ_SERVICE_AVAILABLE else '❌ Unavailable'}")
    print(f"📊 MongoDB: {'✅ Available' if MONGO_SERVICE_AVAILABLE else '❌ Unavailable'}")
    print(f"🔧 Enhanced Scoring: ✅ Available")
    print("🌐 Server starting on http://0.0.0.0:5000")
    
    # ✅ STARTUP VALIDATION
    print("\n📋 Startup Validation:")
    print(f"   - Blueprints registered: {len(blueprints_registered)}")
    if blueprints_failed:
        print(f"   - Blueprint failures: {len(blueprints_failed)}")
        for prefix, error in blueprints_failed:
            print(f"     ❌ {prefix}: {error}")
    print(f"   - Database: {'✅ Connected' if MONGO_SERVICE_AVAILABLE else '❌ Disconnected'}")
    print(f"   - AI Service: {'✅ Ready' if AI_QUIZ_SERVICE_AVAILABLE else '❌ Not Available'}")
    
    try:
        app.run(
            host="0.0.0.0",
            port=5000,
            debug=True,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        import traceback
        traceback.print_exc()
