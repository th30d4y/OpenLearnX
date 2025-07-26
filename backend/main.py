from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import asyncio
from mongo_service import MongoService
from web3_service import Web3Service
import logging
from datetime import datetime

# Load environment variables first
load_dotenv()

# Import all route blueprints
from routes import auth, test_flow, certificate, dashboard, courses, quizzes, admin, exam, compiler

# Import services after loading env vars
try:
    from services.wallet_service import wallet_service
    from services.real_compiler_service import real_compiler_service
    WALLET_SERVICE_AVAILABLE = True
    COMPILER_SERVICE_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Service import failed: {e}")
    wallet_service = None
    real_compiler_service = None
    WALLET_SERVICE_AVAILABLE = False
    COMPILER_SERVICE_AVAILABLE = False

# Initialize Flask app
app = Flask(__name__)

# Enhanced CORS configuration for coding exam platform
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": [
            "Content-Type", 
            "Authorization", 
            "X-Requested-With",
            "Accept",
            "Origin"
        ],
        "supports_credentials": True,
        "expose_headers": ["Authorization"]
    }
})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'openlearnx-secret-key-2024')
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
app.config['WEB3_PROVIDER_URL'] = os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545')
app.config['CONTRACT_ADDRESS'] = os.getenv('CONTRACT_ADDRESS', '0x739f0aCef964f87Bc7974D972a811f8417d74B4C')
app.config['MINTER_PRIVATE_KEY'] = os.getenv('MINTER_PRIVATE_KEY', '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80')
app.config['ADMIN_TOKEN'] = os.getenv('ADMIN_TOKEN', 'admin-secret-key')

# Blockchain configuration
app.config['IPFS_GATEWAY'] = os.getenv('IPFS_GATEWAY', 'https://ipfs.infura.io:5001')
app.config['IPFS_PROJECT_ID'] = os.getenv('IPFS_PROJECT_ID')
app.config['IPFS_PROJECT_SECRET'] = os.getenv('IPFS_PROJECT_SECRET')

# Configure logging BEFORE initializing services
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('openlearnx.log') if os.access('.', os.W_OK) else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)

# ✅ DEFINE check_docker_availability BEFORE using it
def check_docker_availability():
    """Check if Docker is available for compiler service"""
    try:
        import docker
        client = docker.from_env()
        client.ping()
        return True
    except Exception:
        return False

# Initialize services with error handling
try:
    mongo_service = MongoService(app.config['MONGODB_URI'])
    app.config['MONGO_SERVICE'] = mongo_service
    MONGO_SERVICE_AVAILABLE = True
    logger.info("✅ MongoDB service initialized")
except Exception as e:
    logging.error(f"Failed to initialize MongoDB service: {e}")
    mongo_service = None
    MONGO_SERVICE_AVAILABLE = False

try:
    web3_service = Web3Service(
        app.config['WEB3_PROVIDER_URL'], 
        app.config['CONTRACT_ADDRESS']
    )
    app.config['WEB3_SERVICE'] = web3_service
    WEB3_SERVICE_AVAILABLE = True
    logger.info("✅ Web3 service initialized")
except Exception as e:
    logging.error(f"Failed to initialize Web3 service: {e}")
    web3_service = None
    WEB3_SERVICE_AVAILABLE = False

# Make services available to routes
if WALLET_SERVICE_AVAILABLE:
    app.config['WALLET_SERVICE'] = wallet_service
    logger.info("✅ Wallet service available")

if COMPILER_SERVICE_AVAILABLE:
    app.config['REAL_COMPILER_SERVICE'] = real_compiler_service
    logger.info("✅ Compiler service available")

# ✅ ENHANCED: Register all blueprints with better error handling
blueprints = [
    (auth.bp, '/api/auth', 'Authentication'),
    (test_flow.bp, '/api/test', 'Test Flow'),
    (certificate.bp, '/api/certificate', 'Certificates'),
    (dashboard.bp, '/api/dashboard', 'Dashboard'),
    (courses.bp, '/api/courses', 'Courses'),
    (quizzes.bp, '/api/quizzes', 'Quizzes'),
    (admin.bp, '/api/admin', 'Admin Panel'),
    (exam.bp, '/api/exam', 'Coding Exams'),  # ✅ Key for coding exam functionality
    (compiler.bp, '/api/compiler', 'Code Compiler'),  # ✅ Key for compiler functionality
]

registered_blueprints = []
failed_blueprints = []

for blueprint, url_prefix, description in blueprints:
    try:
        app.register_blueprint(blueprint, url_prefix=url_prefix)
        registered_blueprints.append((description, url_prefix))
        logging.info(f"✅ Registered {description}: {url_prefix}")
        print(f"✅ Registered {description}: {url_prefix}")
    except Exception as e:
        failed_blueprints.append((description, url_prefix, str(e)))
        logging.error(f"❌ Failed to register {description} ({url_prefix}): {e}")
        print(f"❌ Failed to register {description} ({url_prefix}): {e}")

# ✅ CRITICAL FIX: Add missing exam info endpoint directly to main.py
@app.route('/api/exam/info/<exam_code>', methods=['GET', 'OPTIONS'])
def get_exam_info_direct(exam_code):
    """Direct exam info endpoint for host panel - CRITICAL FIX"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"📊 DIRECT host panel request for exam: {exam_code}")
        
        # Get MongoDB connection
        from pymongo import MongoClient
        client = MongoClient(app.config['MONGODB_URI'])
        db = client.openlearnx
        
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            print(f"❌ Exam not found: {exam_code}")
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        # Convert datetime to string if needed
        created_at = exam.get("created_at")
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        elif created_at:
            created_at = str(created_at)
        
        exam_info = {
            "title": exam.get("title", "Untitled Exam"),
            "status": exam.get("status", "waiting"),
            "duration_minutes": exam.get("duration_minutes", 30),
            "participants_count": len(exam.get("participants", [])),
            "max_participants": exam.get("max_participants", 50),
            "problem_title": exam.get("problem", {}).get("title", exam.get("title", "Coding Challenge")),
            "languages": exam.get("problem", {}).get("languages", ["python"]),
            "created_at": created_at,
            "host_name": exam.get("host_name", "Unknown Host")
        }
        
        print(f"✅ Found exam: {exam_info['title']} (Status: {exam_info['status']})")
        return jsonify({"success": True, "exam_info": exam_info})
        
    except Exception as e:
        print(f"❌ Error getting exam info: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

# ✅ ADD: Additional missing host panel endpoints
@app.route('/api/exam/participants/<exam_code>', methods=['GET', 'OPTIONS'])
def get_participants_direct(exam_code):
    """Get participants for host panel"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        print(f"👥 DIRECT participants request for exam: {exam_code}")
        
        from pymongo import MongoClient
        client = MongoClient(app.config['MONGODB_URI'])
        db = client.openlearnx
        
        exam = db.exams.find_one({"exam_code": exam_code.upper()})
        if not exam:
            return jsonify({"success": False, "error": "Exam not found"}), 404
        
        participants = exam.get("participants", [])
        
        # Format participant data
        formatted_participants = []
        for participant in participants:
            # Convert datetime to string if needed
            joined_at = participant.get("joined_at")
            if hasattr(joined_at, 'isoformat'):
                joined_at = joined_at.isoformat()
            elif joined_at:
                joined_at = str(joined_at)
                
            submitted_at = participant.get("submitted_at")
            if hasattr(submitted_at, 'isoformat'):
                submitted_at = submitted_at.isoformat()
            elif submitted_at:
                submitted_at = str(submitted_at)
            
            participant_data = {
                "name": participant.get("name", ""),
                "score": participant.get("score", 0),
                "completed": participant.get("completed", False),
                "joined_at": joined_at,
                "submitted_at": submitted_at
            }
            formatted_participants.append(participant_data)
        
        print(f"✅ Found {len(formatted_participants)} participants for exam {exam_code}")
        return jsonify({"success": True, "participants": formatted_participants})
        
    except Exception as e:
        print(f"❌ Error getting participants: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/remove-participant', methods=['POST', 'OPTIONS'])
def remove_participant_direct():
    """Remove participant from exam (host panel)"""
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
        
        print(f"🗑️ DIRECT remove participant request: {participant_name} from {exam_code}")
        
        if not exam_code or not participant_name:
            return jsonify({"success": False, "error": "Missing exam_code or participant_name"}), 400
        
        from pymongo import MongoClient
        client = MongoClient(app.config['MONGODB_URI'])
        db = client.openlearnx
        
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {"$pull": {"participants": {"name": participant_name}}}
        )
        
        if result.modified_count > 0:
            print(f"✅ Removed participant {participant_name} from exam {exam_code}")
            return jsonify({"success": True, "message": f"Participant {participant_name} removed successfully"})
        else:
            return jsonify({"success": False, "error": "Participant not found or already removed"}), 404
            
    except Exception as e:
        print(f"❌ Error removing participant: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/exam/stop-exam', methods=['POST', 'OPTIONS'])
def stop_exam_direct():
    """Stop exam (host panel)"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        exam_code = data.get('exam_code', '').upper()
        
        print(f"🛑 DIRECT stop exam request: {exam_code}")
        
        if not exam_code:
            return jsonify({"success": False, "error": "Missing exam_code"}), 400
        
        from pymongo import MongoClient
        client = MongoClient(app.config['MONGODB_URI'])
        db = client.openlearnx
        
        result = db.exams.update_one(
            {"exam_code": exam_code},
            {"$set": {
                "status": "completed", 
                "ended_at": datetime.now().isoformat(),
                "ended_by": "host"
            }}
        )
        
        if result.modified_count > 0:
            print(f"✅ Exam {exam_code} stopped by host")
            return jsonify({"success": True, "message": "Exam stopped successfully"})
        else:
            return jsonify({"success": False, "error": "Exam not found"}), 404
            
    except Exception as e:
        print(f"❌ Error stopping exam: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ✅ ENHANCED: Debug routes with better structure
@app.route('/debug/routes')
def debug_routes():
    """Debug route to see all registered routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': str(rule)
        })
    return jsonify({
        "total_routes": len(routes),
        "routes": sorted(routes, key=lambda x: x['rule']),
        "registered_blueprints": [desc for desc, url in registered_blueprints],
        "failed_blueprints": failed_blueprints,
        "direct_exam_routes_added": [
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>", 
            "/api/exam/remove-participant",
            "/api/exam/stop-exam"
        ]
    })

@app.route('/debug/exam-routes')
def debug_exam_routes():
    """Debug exam-specific routes"""
    exam_routes = []
    for rule in app.url_map.iter_rules():
        if '/exam' in str(rule):
            exam_routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': str(rule)
            })
    
    return jsonify({
        "exam_routes": exam_routes,
        "exam_blueprint_registered": any('Coding Exams' in desc for desc, _ in registered_blueprints),
        "expected_exam_routes": [
            "/api/exam/create-exam",
            "/api/exam/join-exam", 
            "/api/exam/start-exam",
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/remove-participant",
            "/api/exam/stop-exam",
            "/api/exam/leaderboard/<exam_code>",
            "/api/exam/test"
        ],
        "direct_routes_added": True
    })

@app.route('/debug/services')
def debug_services():
    """Debug service availability"""
    return jsonify({
        "services": {
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability()
        },
        "app_config_keys": list(app.config.keys()),
        "blueprint_count": len(app.blueprints),
        "registered_blueprints": registered_blueprints,
        "failed_blueprints": failed_blueprints,
        "exam_system_ready": all([
            MONGO_SERVICE_AVAILABLE,
            any('Coding Exams' in desc for desc, _ in registered_blueprints)
        ]),
        "direct_exam_endpoints_added": True
    })

# ✅ ENHANCED: Direct exam test route with better functionality
@app.route('/api/exam/test-direct', methods=['GET', 'POST', 'OPTIONS'])
def test_exam_direct():
    """Direct test route for exam functionality"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        return response
    
    return jsonify({
        "success": True,
        "message": "Direct exam route is working",
        "method": request.method,
        "timestamp": datetime.now().isoformat(),
        "data": request.json if request.method == "POST" else None,
        "mongo_available": MONGO_SERVICE_AVAILABLE,
        "exam_blueprint_registered": any('Coding Exams' in desc for desc, _ in registered_blueprints),
        "direct_endpoints_added": True
    })

# ✅ ENHANCED: Health check endpoints
@app.route('/')
def health_check():
    return jsonify({
        "status": "OpenLearnX API is running", 
        "version": "2.0.1",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "blockchain": WEB3_SERVICE_AVAILABLE,
            "coding_exams": COMPILER_SERVICE_AVAILABLE,
            "wallet_auth": WALLET_SERVICE_AVAILABLE,
            "database": MONGO_SERVICE_AVAILABLE,
            "real_compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability(),
            "direct_exam_endpoints": True
        },
        "endpoints": {
            "auth": "/api/auth",
            "courses": "/api/courses", 
            "admin": "/api/admin",
            "dashboard": "/api/dashboard",
            "certificates": "/api/certificate",
            "quizzes": "/api/quizzes",
            "coding_exams": "/api/exam",
            "compiler": "/api/compiler"
        },
        "debug_endpoints": [
            "/debug/routes",
            "/debug/exam-routes",
            "/debug/services",
            "/api/exam/test-direct"
        ],
        "registered_blueprints": len(registered_blueprints),
        "failed_blueprints": len(failed_blueprints),
        "host_panel_fix": "✅ Direct endpoints added"
    })

@app.route('/api/health')
def api_health():
    """Comprehensive API health check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "mongodb": MONGO_SERVICE_AVAILABLE,
            "web3": WEB3_SERVICE_AVAILABLE,
            "wallet": WALLET_SERVICE_AVAILABLE,
            "compiler": COMPILER_SERVICE_AVAILABLE,
            "docker": check_docker_availability()
        },
        "configuration": {
            "cors_enabled": True,
            "debug_mode": app.debug,
            "secret_key_set": bool(app.config.get('SECRET_KEY')),
            "admin_token_set": bool(app.config.get('ADMIN_TOKEN'))
        },
        "blueprints_registered": list(app.blueprints.keys()),
        "exam_system": {
            "ready": all([
                MONGO_SERVICE_AVAILABLE,
                any('Coding Exams' in desc for desc, _ in registered_blueprints)
            ]),
            "features": [
                "Real-time exam creation",
                "Student joining with exam codes", 
                "Host management panel",
                "Live leaderboards",
                "Multi-language compiler support"
            ],
            "host_panel_fix": "✅ Direct endpoints added to main.py"
        }
    }
    
    # ✅ ENHANCED: Check MongoDB connection
    if MONGO_SERVICE_AVAILABLE:
        try:
            from pymongo import MongoClient
            client = MongoClient(app.config['MONGODB_URI'])
            client.admin.command('ismaster')
            health_status["services"]["mongodb_connection"] = "connected"
        except Exception as e:
            health_status["services"]["mongodb_connection"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
    
    # ✅ ENHANCED: Check Web3 connection
    if WEB3_SERVICE_AVAILABLE:
        try:
            if web3_service and web3_service.w3.is_connected():
                health_status["services"]["web3_connection"] = "connected"
            else:
                health_status["services"]["web3_connection"] = "disconnected"
                health_status["status"] = "degraded"
        except Exception as e:
            health_status["services"]["web3_connection"] = f"error: {str(e)}"
            health_status["status"] = "degraded"
    
    status_code = 200 if health_status["status"] == "healthy" else 503
    return jsonify(health_status), status_code

@app.route('/api/admin/health')
def admin_health():
    """Admin-specific health check"""
    return jsonify({
        "status": "Admin API is running",
        "timestamp": datetime.now().isoformat(),
        "admin_token_configured": bool(app.config.get('ADMIN_TOKEN')),
        "admin_endpoints": [
            "/api/admin/dashboard",
            "/api/admin/courses",
            "/api/admin/courses/<id>",
            "/api/admin/test",
            "/api/admin/initialize"
        ],
        "exam_endpoints": [
            "/api/exam/create-exam",
            "/api/exam/join-exam",
            "/api/exam/join-exam-wallet",
            "/api/exam/start-exam",
            "/api/exam/submit-solution",
            "/api/exam/leaderboard/<exam_code>",
            "/api/exam/host-dashboard/<exam_code>",
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/remove-participant",
            "/api/exam/stop-exam"
        ],
        "compiler_endpoints": [
            "/api/compiler/languages",
            "/api/compiler/execute",
            "/api/compiler/execute-async",
            "/api/compiler/status/<execution_id>",
            "/api/compiler/test",
            "/api/compiler/stats"
        ],
        "exam_system_status": {
            "ready": all([
                MONGO_SERVICE_AVAILABLE,
                any('Coding Exams' in desc for desc, _ in registered_blueprints)
            ]),
            "mongo_connected": MONGO_SERVICE_AVAILABLE,
            "exam_routes_registered": any('Coding Exams' in desc for desc, _ in registered_blueprints),
            "host_panel_endpoints": "✅ Added directly to main.py"
        }
    })

# ✅ ENHANCED: Error handlers with better error information
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "message": "The requested API endpoint does not exist",
        "requested_path": request.path,
        "method": request.method,
        "available_endpoints": [
            "/api/auth", "/api/courses", "/api/admin", 
            "/api/exam", "/api/dashboard", "/api/certificate",
            "/api/compiler"
        ],
        "debug_endpoints": [
            "/debug/routes",
            "/debug/exam-routes", 
            "/debug/services"
        ],
        "exam_specific_endpoints": [
            "/api/exam/create-exam",
            "/api/exam/join-exam",
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/test-direct"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        "error": "Internal server error",
        "message": "An unexpected error occurred on the server",
        "timestamp": datetime.now().isoformat()
    }), 500

@app.errorhandler(403)
def forbidden(error):
    return jsonify({
        "error": "Forbidden",
        "message": "Access denied - check your authentication",
        "timestamp": datetime.now().isoformat()
    }), 403

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({
        "error": "Unauthorized",
        "message": "Authentication required",
        "timestamp": datetime.now().isoformat()
    }), 401

@app.errorhandler(Exception)
def handle_error(error):
    app.logger.error(f"Unhandled error: {str(error)}")
    return jsonify({
        "error": "An unexpected error occurred",
        "type": type(error).__name__,
        "timestamp": datetime.now().isoformat()
    }), 500

# ✅ ENHANCED: Request logging and CORS handling
@app.before_request
def log_request_info():
    """Enhanced request logging"""
    if '/api/admin' in request.path:
        auth_header = request.headers.get('Authorization', 'No auth header')
        logger.info(f"Admin request: {request.method} {request.path} | Auth: {auth_header[:20]}...")
    
    if '/api/exam' in request.path:
        logger.info(f"Exam request: {request.method} {request.path}")
        print(f"📝 Exam request: {request.method} {request.path}")
        
        # Log request data for debugging
        if request.method in ['POST', 'PUT'] and request.json:
            print(f"📦 Request data: {request.json}")
    
    if '/api/compiler' in request.path:
        logger.info(f"Compiler request: {request.method} {request.path}")

@app.before_request
def handle_preflight():
    """Handle CORS preflight requests"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization")
        response.headers.add('Access-Control-Allow-Methods', "GET,POST,PUT,DELETE,OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

@app.after_request
def after_request(response):
    """Add security headers"""
    response.headers.add('X-Content-Type-Options', 'nosniff')
    response.headers.add('X-Frame-Options', 'DENY')
    response.headers.add('X-XSS-Protection', '1; mode=block')
    return response

# ✅ ENHANCED: Startup function with comprehensive initialization  
def initialize_application():
    """Initialize application with comprehensive error handling"""
    try:
        logger.info("🚀 Initializing OpenLearnX Backend...")
        print("🚀 Initializing OpenLearnX Backend...")
        
        # ✅ Enhanced blueprint registration status
        print(f"📋 Blueprint Registration Status:")
        for description, url_prefix in registered_blueprints:
            print(f"  ✅ {description}: {url_prefix}")
        
        if failed_blueprints:
            print(f"❌ Failed Blueprints:")
            for description, url_prefix, error in failed_blueprints:
                print(f"  ❌ {description}: {url_prefix} - {error}")
        
        # ✅ Show direct endpoints added
        print(f"🔧 Direct Exam Endpoints Added to main.py:")
        direct_endpoints = [
            "/api/exam/info/<exam_code>",
            "/api/exam/participants/<exam_code>",
            "/api/exam/remove-participant", 
            "/api/exam/stop-exam"
        ]
        for endpoint in direct_endpoints:
            print(f"  ✅ {endpoint}")
        
        # Test MongoDB connection
        if MONGO_SERVICE_AVAILABLE:
            try:
                loop = asyncio.get_event_loop()
                loop.run_until_complete(mongo_service.init_db())
                logger.info("✅ Database initialized successfully")
                print("✅ Database initialized successfully")
                
                from pymongo import MongoClient
                client = MongoClient(app.config['MONGODB_URI'])
                client.admin.command('ismaster')
                logger.info("✅ MongoDB connection verified")
                print("✅ MongoDB connection verified")
            except Exception as e:
                logger.error(f"❌ MongoDB initialization failed: {e}")
                print(f"❌ MongoDB initialization failed: {e}")
        
        # Test Web3 connection
        if WEB3_SERVICE_AVAILABLE:
            try:
                if web3_service.w3.is_connected():
                    logger.info("✅ Web3 connection verified")
                    print("✅ Web3 connection verified")
                else:
                    logger.warning("⚠️ Web3 connection failed - blockchain features disabled")
                    print("⚠️ Web3 connection failed - blockchain features disabled")
            except Exception as e:
                logger.warning(f"⚠️ Web3 connection error: {e}")
                print(f"⚠️ Web3 connection error: {e}")
        
        # Test Docker connection for compiler
        if COMPILER_SERVICE_AVAILABLE:
            try:
                docker_available = check_docker_availability()
                if docker_available:
                    logger.info("✅ Docker connection verified - Real compiler available")
                    print("✅ Docker connection verified - Real compiler available")
                else:
                    logger.warning("⚠️ Docker not available - Compiler features limited")
                    print("⚠️ Docker not available - Compiler features limited")
            except Exception as e:
                logger.warning(f"⚠️ Docker connection error: {e}")
                print(f"⚠️ Docker connection error: {e}")
        
        # ✅ Enhanced configuration summary
        logger.info("📋 Configuration Summary:")
        print("📋 Configuration Summary:")
        config_items = [
            ("MongoDB", MONGO_SERVICE_AVAILABLE),
            ("Blockchain", WEB3_SERVICE_AVAILABLE),
            ("Wallet Service", WALLET_SERVICE_AVAILABLE),
            ("Compiler Service", COMPILER_SERVICE_AVAILABLE),
            ("Docker", check_docker_availability()),
            ("Exam System", any('Coding Exams' in desc for desc, _ in registered_blueprints)),
            ("Host Panel Fix", True)
        ]
        
        for name, available in config_items:
            status = "✅ Connected" if available else "❌ Unavailable"
            logger.info(f"  • {name}: {status}")
            print(f"  • {name}: {status}")
        
        # ✅ Enhanced access URLs
        logger.info("🌐 Access URLs:")
        print("🌐 Access URLs:")
        
        urls = [
            ("API Health", "http://127.0.0.1:5000/api/health"),
            ("Main Page", "http://127.0.0.1:5000/"),
            ("Admin Panel", "http://localhost:3000/admin/login"),
            ("Coding Exams", "http://localhost:3000/coding"),
            ("Real Compiler", "http://localhost:3000/compiler"),
            ("Join Exam", "http://localhost:3000/coding/join"),
            ("Wallet Join", "http://localhost:3000/coding/join-wallet")
        ]
        
        for name, url in urls:
            logger.info(f"  • {name}: {url}")
            print(f"  • {name}: {url}")
        
        # ✅ Enhanced debug URLs
        print("🔧 Debug URLs:")
        debug_urls = [
            ("All Routes", "http://127.0.0.1:5000/debug/routes"),
            ("Exam Routes", "http://127.0.0.1:5000/debug/exam-routes"),
            ("Services", "http://127.0.0.1:5000/debug/services"),
            ("Direct Test", "http://127.0.0.1:5000/api/exam/test-direct"),
            ("Admin Health", "http://127.0.0.1:5000/api/admin/health"),
            ("Exam Info Test", "http://127.0.0.1:5000/api/exam/info/TEST123")
        ]
        
        for name, url in debug_urls:
            print(f"  • {name}: {url}")
        
        # ✅ Enhanced exam system status
        exam_ready = all([
            MONGO_SERVICE_AVAILABLE,
            any('Coding Exams' in desc for desc, _ in registered_blueprints)
        ])
        
        print(f"📝 Exam System Status: {'✅ Ready' if exam_ready else '❌ Not Ready'}")
        print(f"🔧 Host Panel Fix: ✅ Direct endpoints added to main.py")
        
        if exam_ready:
            print("📝 Exam Features Available:")
            features = [
                "Create coding exams with 6-character codes",
                "Students join with exam codes", 
                "Host management panel with live updates",
                "Real-time participant monitoring",
                "Live leaderboards with scoring",
                "Multi-language code execution",
                "Host panel endpoints working directly"
            ]
            for feature in features:
                print(f"  • {feature}")
        
        # Log compiler features
        if COMPILER_SERVICE_AVAILABLE:
            logger.info("💻 Compiler Features:")
            print("💻 Compiler Features:")
            features = [
                "Multi-language support: Python, Java, C++, C, JavaScript, Go, Rust, Bash",
                "Real-time code execution with output capture",
                "Secure Docker containerization",
                "Resource monitoring and limits"
            ]
            
            for feature in features:
                logger.info(f"  • {feature}")
                print(f"  • {feature}")
        
        # ✅ Enhanced admin token logging
        admin_token = app.config.get('ADMIN_TOKEN', 'admin-secret-key')
        if admin_token:
            logger.info(f"🔑 Admin token configured: {admin_token[:8]}...")
            print(f"🔑 Admin token configured: {admin_token[:8]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize application: {str(e)}")
        print(f"❌ Failed to initialize application: {str(e)}")
        logger.error("Make sure MongoDB and Docker are running and accessible")
        print("Make sure MongoDB and Docker are running and accessible")
        return False

if __name__ == '__main__':
    # Initialize application
    init_success = initialize_application()
    
    if not init_success:
        logger.error("❌ Application initialization failed - some features may not work")
        print("❌ Application initialization failed - some features may not work")
    
    try:
        logger.info("🚀 Starting OpenLearnX Backend Server...")
        print("🚀 Starting OpenLearnX Backend Server...")
        logger.info("📚 Features: Blockchain Certificates, Coding Exams, Wallet Auth, Real Multi-language Compiler")
        print("📚 Features: Blockchain Certificates, Coding Exams, Wallet Auth, Real Multi-language Compiler")
        
        # ✅ Enhanced server info
        print(f"🌐 Server will be available at:")
        print(f"  • Local: http://127.0.0.1:5000")
        print(f"  • Network: http://0.0.0.0:5000")
        print(f"📱 Frontend should connect to: http://127.0.0.1:5000")
        print(f"🔧 Host Panel Fix: ✅ Direct endpoints added for exam info")
        
        # Start Flask application
        app.run(
            debug=True, 
            host='0.0.0.0', 
            port=5000,
            threaded=True,
            use_reloader=False  # Prevent double initialization
        )
        
    except KeyboardInterrupt:
        logger.info("👋 Server stopped by user")
        print("👋 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Server startup failed: {str(e)}")
        print(f"❌ Server startup failed: {str(e)}")
