from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import asyncio
from mongo_service import MongoService
from web3_service import Web3Service
import logging

# Import all route blueprints
from routes import auth, test_flow, certificate, dashboard, courses, quizzes, admin

load_dotenv()

app = Flask(__name__)

# Enhanced CORS configuration for admin panel with credentials support
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True  # ✅ Added for admin authentication
    }
})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
app.config['WEB3_PROVIDER_URL'] = os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545')
app.config['CONTRACT_ADDRESS'] = os.getenv('CONTRACT_ADDRESS')
app.config['MINTER_PRIVATE_KEY'] = os.getenv('MINTER_PRIVATE_KEY')

# Initialize services
mongo_service = MongoService(app.config['MONGODB_URI'])
web3_service = Web3Service(app.config['WEB3_PROVIDER_URL'], app.config['CONTRACT_ADDRESS'])

# Make services available to routes
app.config['MONGO_SERVICE'] = mongo_service
app.config['WEB3_SERVICE'] = web3_service

# Register all blueprints
app.register_blueprint(auth.bp, url_prefix='/api/auth')
app.register_blueprint(test_flow.bp, url_prefix='/api/test')
app.register_blueprint(certificate.bp, url_prefix='/api/certificate')
app.register_blueprint(dashboard.bp, url_prefix='/api/dashboard')
app.register_blueprint(courses.bp, url_prefix='/api/courses')
app.register_blueprint(quizzes.bp, url_prefix='/api/quizzes')
app.register_blueprint(admin.bp, url_prefix="/api/admin")

@app.route('/')
def health_check():
    return jsonify({
        "status": "OpenLearnX API is running", 
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "courses": "/api/courses", 
            "admin": "/api/admin",
            "dashboard": "/api/dashboard",
            "certificates": "/api/certificate",
            "quizzes": "/api/quizzes"
        }
    })

@app.route('/api/admin/health')
def admin_health():
    return jsonify({
        "status": "Admin API is running",
        "admin_endpoints": [
            "/api/admin/dashboard",
            "/api/admin/courses",
            "/api/admin/courses/<id>",
            "/api/admin/test"  # ✅ Added test endpoint
        ]
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(Exception)
def handle_error(error):
    app.logger.error(f"Unhandled error: {str(error)}")
    return jsonify({"error": "An unexpected error occurred"}), 500

# Enable logging for admin operations
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'  # ✅ Enhanced logging format
)
logger = logging.getLogger(__name__)

@app.before_request
def log_request_info():
    if '/api/admin' in request.path:
        # ✅ Enhanced admin request logging
        auth_header = request.headers.get('Authorization', 'No auth header')
        logger.info(f"Admin request: {request.method} {request.path} | Auth: {auth_header}")

# ✅ Add OPTIONS handler for CORS preflight
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

if __name__ == '__main__':
    try:
        # ✅ Enhanced database initialization with better error handling
        loop = asyncio.get_event_loop()
        loop.run_until_complete(mongo_service.init_db())
        logger.info("✅ Database initialized successfully")
        
        # ✅ Test MongoDB connection
        from pymongo import MongoClient
        client = MongoClient(app.config['MONGODB_URI'])
        client.admin.command('ismaster')
        logger.info("✅ MongoDB connection verified")
        
        logger.info("✅ OpenLearnX backend starting...")
        logger.info(f"✅ Admin panel available at: http://localhost:3000/admin/login")
        logger.info(f"✅ API health check: http://127.0.0.1:5000")
        logger.info(f"✅ Admin health check: http://127.0.0.1:5000/api/admin/health")
        
        # ✅ Log admin token for debugging
        admin_token = os.getenv('ADMIN_TOKEN', 'admin-secret-key')
        logger.info(f"✅ Admin token configured: {admin_token[:8]}...")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize: {str(e)}")
        logger.error("Make sure MongoDB is running and accessible")
    
    # ✅ Enhanced Flask app configuration
    app.run(
        debug=True, 
        host='0.0.0.0', 
        port=5000,
        threaded=True  # Better for handling multiple requests
    )
