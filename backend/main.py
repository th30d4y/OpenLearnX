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

# ✅ ONLY UNIQUE DIRECT EXAM ENDPOINTS (no conflicts with blueprint)
@app.route('/api/exam/upload-question', methods=['POST', 'OPTIONS'])
def upload_question_direct():
    """Direct endpoint for question upload"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        print(f"📤 Direct question upload request")
        
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
        
        # Create question document
        question = {
            "id": str(uuid.uuid4()),
            "title": question_data.get('title', 'Custom Question'),
            "description": question_data.get('description', 'Custom programming question'),
            "difficulty": question_data.get('difficulty', 'medium'),
            "function_name": question_data.get('function_name', 'solve'),
            "starter_code": question_data.get('starter_code', {
                'python': 'def solve():\n    # Write your solution here\n    pass'
            }),
            "test_cases": question_data.get('test_cases', []),
            "examples": question_data.get('examples', []),
            "constraints": question_data.get('constraints', []),
            "time_limit": question_data.get('time_limit', 1000),
            "memory_limit": question_data.get('memory_limit', '128MB'),
            "created_at": datetime.now(),
            "uploaded_by": exam.get('host_name', 'Host'),
            "languages": list(question_data.get('starter_code', {}).keys())
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
            print(f"✅ Question '{question['title']}' uploaded to exam {exam_code}")
            return jsonify({
                "success": True,
                "message": "Question uploaded successfully",
                "question_id": question['id'],
                "question_title": question['title']
            })
        else:
            print(f"❌ Failed to update exam {exam_code}")
            return jsonify({"success": False, "error": "Failed to update exam"}), 500
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

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
        "version":"2.0.1",
        "timestamp": datetime.now().isoformat(),
        "features":{
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability()
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
            "/api/exam/upload-question",
            "/api/exam/questions/<exam_code>",
            "/api/exam/update-question"
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
        "docker": check_docker_availability()
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
            "docker": check_docker_availability()
        },
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed,
        "direct_endpoints_added": True
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
            "/api/exam/upload-question",
            "/api/exam/questions/<exam_code>",
            "/api/exam/update-question"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 Error: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "timestamp": datetime.now().isoformat()
    }), 500

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


# Startup initialization
def initialize_application():
    logger.info("🚀 Initializing OpenLearnX Backend")
    
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
    
    # Log direct endpoints
    logger.info("🔧 Direct exam endpoints added:")
    direct_endpoints = [
        "/api/exam/upload-question",
        "/api/exam/questions/<exam_code>",
        "/api/exam/update-question"
    ]
    for endpoint in direct_endpoints:
        logger.info(f"  ✅ {endpoint}")
    
    return True

if __name__ == '__main__':
    initialize_application()
    
    logger.info("🚀 Starting OpenLearnX Backend Server")
    logger.info("📚 Features: Coding Exams, Question Upload, Host Panel, Compiler")
    logger.info("🌐 Server starting on http://0.0.0.0:5000")
    logger.info("🔧 All /api/* endpoints have CORS enabled")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True, use_reloader=False)
