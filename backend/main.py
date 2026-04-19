import os
import asyncio
import logging
import uuid
import random
import string
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, make_response, g
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
import hashlib
import time
import signal
import io
from contextlib import redirect_stdout, redirect_stderr
import base64
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import secrets
import re
import json
import jwt as pyjwt

try:
    import psutil
except Exception:
    psutil = None

# Load environment variables
load_dotenv()

# Services
from mongo_service import MongoService
from web3_service import Web3Service

# ✅ CORRECTED: Import dashboard blueprint with comprehensive endpoints
try:
    from routes.dashboard import bp as dashboard_bp
    DASHBOARD_AVAILABLE = True
    print("✅ Dashboard routes with comprehensive analytics available")
except ImportError:
    dashboard_bp = None
    DASHBOARD_AVAILABLE = False
    print("⚠️ Dashboard routes not available")

# ✅ CRITICAL: Import certificate blueprint
try:
    from routes.certificate import bp as certificate_bp
    CERTIFICATE_BLUEPRINT_AVAILABLE = True
    print("✅ Certificate blueprint with all fixes available")
except ImportError:
    certificate_bp = None
    CERTIFICATE_BLUEPRINT_AVAILABLE = False
    print("❌ Certificate blueprint not available - check routes/certificate.py")

# Blueprints - Updated order and error handling
blueprints_to_register = [
    ('auth', '/api/auth'),
    ('test_flow', '/api/test'),
    ('certificate', '/api/certificate'),  # ✅ Use blueprint version
    ('dashboard', '/api/dashboard'),
    ('courses', '/api/courses'),
    ('quizzes', '/api/quizzes'),
    ('admin', '/api/admin'),
    ('exam', '/api/exam'),
    ('compiler', '/api/compiler'),
    ('adaptive_quiz', '/api/adaptive-quiz'),
]

# Optional services with better error handling
services_status = {}

try:
    from services.wallet_service import wallet_service
    services_status['wallet'] = True
except ImportError as e:
    wallet_service = None
    services_status['wallet'] = False
    print(f"⚠️ Wallet service unavailable: {str(e)}")

try:
    from services.real_compiler_service import real_compiler_service
    services_status['compiler'] = True
except ImportError as e:
    real_compiler_service = None
    services_status['compiler'] = False
    print(f"⚠️ Real compiler service unavailable: {str(e)}")

# ✅ AI Quiz Service Integration with graceful fallback
try:
    from services.ai_quiz_service import AdaptiveQuizMasterLLM
    ai_service = AdaptiveQuizMasterLLM()
    services_status['ai_quiz'] = True
    print("🤖 AI Quiz Service initialized successfully")
except Exception as e:
    ai_service = None
    services_status['ai_quiz'] = False
    print(f"⚠️ AI Quiz Service unavailable: {str(e)}")
    print("🔄 Server will continue without AI features")

# Utility functions
def generate_room_code(length=6):
    """Generate unique room code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def check_docker_availability():
    """Check if Docker is available"""
    try:
        import docker
        docker.from_env().ping()
        return True
    except:
        return False

# ✅ ENHANCED: Flask app configuration with your .env variables
app = Flask(__name__)

class MissingSecretError(ValueError):
    """Raised when a required secret is not set in environment variables."""
    pass

def get_required_secret(env_var: str, description: str) -> str:
    """
    Get required secret from environment.
    
    Args:
        env_var: Name of the environment variable
        description: Human-readable description of the secret
        
    Returns:
        The secret value from the environment
        
    Raises:
        MissingSecretError: If the environment variable is not set
    """
    value = os.getenv(env_var)
    if not value:
        raise MissingSecretError(f"{description} ({env_var}) must be set in environment variables for security. Do not use default values for secrets.")
    return value

def get_dev_fallback_secret(name: str) -> str:
    """
    Generate a persistent random secret for development use only.
    
    Stores the secret in a file in the system temp directory to persist across restarts.
    Files are created with restrictive permissions (0600) to limit access.
    
    Args:
        name: Unique identifier for this secret (used in filename)
        
    Returns:
        A 64-character hex string (32 bytes of randomness)
        
    Security Note:
        These secrets are stored in temp files and should only be used for development.
        In production, always set proper secrets via environment variables.
    """
    import tempfile
    import stat
    secret_file = os.path.join(tempfile.gettempdir(), f'.openlearnx_dev_{name}')
    try:
        if os.path.exists(secret_file):
            with open(secret_file, 'r') as f:
                return f.read().strip()
    except Exception:
        pass
    # Generate new secret and persist it
    new_secret = os.urandom(32).hex()
    try:
        with open(secret_file, 'w') as f:
            f.write(new_secret)
        # Set restrictive permissions (owner read/write only)
        os.chmod(secret_file, stat.S_IRUSR | stat.S_IWUSR)
    except Exception:
        pass  # If we can't persist, just return the generated secret
    return new_secret

# Validate required secrets at startup
try:
    _secret_key = get_required_secret('SECRET_KEY', 'Flask secret key')
    _jwt_secret_key = get_required_secret('JWT_SECRET_KEY', 'JWT secret key')
    _admin_token = get_required_secret('ADMIN_TOKEN', 'Admin authentication token')
except MissingSecretError as e:
    print(f"⚠️ SECURITY WARNING: {e}")
    print("⚠️ Using persistent development secrets. Set proper secrets in production!")
    _secret_key = os.getenv('SECRET_KEY') or get_dev_fallback_secret('secret_key')
    _jwt_secret_key = os.getenv('JWT_SECRET_KEY') or get_dev_fallback_secret('jwt_secret_key')
    _admin_token = os.getenv('ADMIN_TOKEN') or get_dev_fallback_secret('admin_token')

app.config.update(
    SECRET_KEY=_secret_key,
    MONGODB_URI=os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'),
    WEB3_PROVIDER_URL=os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545'),
    CONTRACT_ADDRESS=os.getenv('CONTRACT_ADDRESS', '0x739f0aCef964f87Bc7974D972a811f8417d74B4C'),
    DEPLOYER_PRIVATE_KEY=os.getenv('DEPLOYER_PRIVATE_KEY'),
    MINTER_PRIVATE_KEY=os.getenv('MINTER_PRIVATE_KEY'),
    ADMIN_TOKEN=_admin_token,
    # ✅ JWT Configuration from your .env
    JWT_SECRET_KEY=_jwt_secret_key,
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=int(os.getenv('JWT_EXPIRATION_HOURS', 168))),
    # ✅ IPFS Configuration from your .env
    IPFS_GATEWAY=os.getenv('IPFS_GATEWAY', 'https://ipfs.infura.io:5001'),
    IPFS_PROJECT_ID=os.getenv('IPFS_PROJECT_ID'),
    IPFS_PROJECT_SECRET=os.getenv('IPFS_PROJECT_SECRET'),
    # ✅ Server Configuration from your .env
    PORT=int(os.getenv('PORT', 5000)),
    HOST=os.getenv('HOST', '0.0.0.0'),
    # ✅ Dashboard specific configs
    DASHBOARD_CACHE_TIMEOUT=int(os.getenv('DASHBOARD_CACHE_TIMEOUT', 300)),
    MAX_ACTIVITY_RECORDS=int(os.getenv('MAX_ACTIVITY_RECORDS', 1000)),
    # ✅ Certificate encryption key
    AES_ENCRYPTION_KEY=os.getenv('AES_ENCRYPTION_KEY')
)

# ✅ Initialize JWT with your configuration
jwt = JWTManager(app)

# ✅ ENHANCED CORS configuration - Allow all localhost ports for development
CORS(app, resources={r"/api/*": {
    "origins": [
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:3006",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://127.0.0.1:3006",
        "https://openlearnx.vercel.app"
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    "allow_headers": [
        "Content-Type", 
        "Authorization", 
        "Accept", 
        "Origin", 
        "X-Requested-With",
        "X-User-ID",
        "X-Session-Token",
        "X-Firebase-Token"
    ],
    "expose_headers": ["Authorization", "X-Total-Count", "X-Rate-Limit", "Content-Type"],
    "supports_credentials": True,
    "max_age": 3600
}})

# ✅ Handle CORS preflight requests with explicit route
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept,Origin,X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD")
        response.headers.add("Access-Control-Max-Age", "3600")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200


SUSPICIOUS_PAYLOAD_PATTERNS = [
    re.compile(r"(<script|javascript:|onerror=|onload=)", re.IGNORECASE),
    re.compile(r"(\$where|\$regex|\$ne|\$gt|\$lt|\$or)", re.IGNORECASE),
    re.compile(r"(union\s+select|drop\s+table|insert\s+into|delete\s+from)", re.IGNORECASE),
    re.compile(r"(\.\./|%2e%2e%2f|/etc/passwd)", re.IGNORECASE)
]


def _detect_suspicious_payload(payload_text):
    if not payload_text:
        return []
    matches = []
    for pattern in SUSPICIOUS_PAYLOAD_PATTERNS:
        if pattern.search(payload_text):
            matches.append(pattern.pattern)
    return matches


def _infer_event_type(path, method, status_code, suspicious=False):
    if suspicious:
        return "suspicious_payload"
    if status_code == 403:
        return "forbidden_access"
    if "/api/auth/register" in path:
        return "signup"
    if "/api/auth/login" in path or "/api/auth/verify" in path or "/api/auth/wallet-login" in path:
        return "signin"
    if "/api/admin" in path:
        return "admin_panel"
    if "join" in path or "enroll" in path:
        return "course_join"
    if "attend" in path:
        return "attendance"
    if method == "GET":
        return "page_visit"
    return "api_activity"


def _firewall_rule_matches(rule, ip, method, path):
    rule_ip = (rule.get("ip") or "").strip()
    rule_method = (rule.get("method") or "").strip().upper()
    path_pattern = (rule.get("path_pattern") or "").strip()

    if rule_ip and rule_ip != ip:
        return False
    if rule_method and rule_method != method.upper():
        return False
    if path_pattern and path_pattern not in path:
        return False
    return True


@app.before_request
def enforce_manual_firewall_rules():
    """Apply admin-defined firewall rules only when manually configured."""
    if request.method == "OPTIONS":
        return None

    # Keep firewall rule management reachable so admins can recover from bad rules.
    if request.path.startswith("/api/admin/firewall"):
        return None

    try:
        db = get_db()
        if db is None:
            return None

        ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() if request.headers.get("X-Forwarded-For") else (request.remote_addr or "unknown")
        method = request.method
        path = request.path

        rules = list(db.firewall_rules.find({"enabled": True}).sort("created_at", 1))
        for rule in rules:
            if not _firewall_rule_matches(rule, ip, method, path):
                continue

            action = (rule.get("action") or "block").strip().lower()
            if action == "allow":
                return None

            # Manual block rule matched.
            db.security_logs.insert_one({
                "timestamp": datetime.utcnow(),
                "event_type": "firewall_block",
                "action": f"{method} {path}",
                "status_code": 403,
                "severity": "warning",
                "path": path,
                "method": method,
                "ip": ip,
                "user_agent": request.headers.get("User-Agent", ""),
                "metadata": {
                    "rule_id": str(rule.get("_id")),
                    "rule_name": rule.get("name", ""),
                    "reason": "manual_firewall_rule"
                }
            })

            return jsonify({"error": "Blocked by firewall rule"}), 403
    except Exception as e:
        logger.debug(f"Firewall check skipped: {e}")

    return None


@app.before_request
def capture_request_start_and_payload():
    g.request_start_time = time.time()
    g.suspicious_matches = []
    if request.method == "OPTIONS":
        return None

    try:
        raw_payload = request.get_data(cache=True, as_text=True)[:4000]
    except Exception:
        raw_payload = ""

    request_json = None
    try:
        request_json = request.get_json(silent=True)
    except Exception:
        request_json = None

    request_form = {}
    try:
        request_form = {k: request.form.get(k) for k in request.form.keys()}
    except Exception:
        request_form = {}

    request_headers = {}
    try:
        for key, value in request.headers.items():
            lower = key.lower()
            if lower in {"authorization", "cookie", "set-cookie"}:
                request_headers[key] = "[redacted]"
            else:
                request_headers[key] = value
    except Exception:
        request_headers = {}

    g.request_payload_preview = raw_payload
    g.request_json_payload = request_json
    g.request_form_payload = request_form
    g.request_headers_snapshot = request_headers

    g.suspicious_matches = _detect_suspicious_payload(raw_payload)


@app.after_request
def write_request_audit_log(response):
    try:
        db = get_db()
        if db is None:
            return response

        start = getattr(g, "request_start_time", None)
        duration_ms = int((time.time() - start) * 1000) if start else 0

        ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() if request.headers.get("X-Forwarded-For") else (request.remote_addr or "unknown")
        suspicious_matches = getattr(g, "suspicious_matches", [])
        suspicious = len(suspicious_matches) > 0
        request_payload_preview = getattr(g, "request_payload_preview", "")
        request_json_payload = getattr(g, "request_json_payload", None)
        request_form_payload = getattr(g, "request_form_payload", {})
        request_headers_snapshot = getattr(g, "request_headers_snapshot", {})

        auth_user_id = None
        auth_wallet_address = None
        auth_email = None
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ", 1)[1]
                decoded = pyjwt.decode(
                    token,
                    options={"verify_signature": False},
                    algorithms=["HS256", "RS256"],
                )
                auth_user_id = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid")
                auth_wallet_address = decoded.get("wallet_address")
                auth_email = decoded.get("email")
        except Exception:
            auth_user_id = None

        response_body_preview = ""
        try:
            response_body_preview = response.get_data(as_text=True)[:4000]
        except Exception:
            response_body_preview = ""

        response_content_type = response.headers.get("Content-Type", "")
        parsed_response_json = None
        if response_body_preview and "json" in response_content_type.lower():
            try:
                parsed_response_json = json.loads(response_body_preview)
            except Exception:
                parsed_response_json = None

        system_usage = {}
        if psutil is not None:
            try:
                vm = psutil.virtual_memory()
                system_usage = {
                    "cpu_percent": psutil.cpu_percent(interval=None),
                    "memory_percent": vm.percent,
                    "memory_used_mb": round(vm.used / (1024 * 1024), 2),
                    "memory_available_mb": round(vm.available / (1024 * 1024), 2),
                }
            except Exception:
                system_usage = {}

        event_type = _infer_event_type(request.path, request.method, response.status_code, suspicious=suspicious)
        action = f"{request.method} {request.path}"

        log_doc = {
            "timestamp": datetime.utcnow(),
            "event_type": event_type,
            "action": action,
            "status_code": int(response.status_code),
            "severity": "warning" if suspicious or response.status_code >= 400 else "info",
            "path": request.path,
            "method": request.method,
            "query": dict(request.args),
            "ip": ip,
            "user_agent": request.headers.get("User-Agent", ""),
            "origin": request.headers.get("Origin", ""),
            "duration_ms": duration_ms,
            "metadata": {
                "suspicious_matches": suspicious_matches,
                "content_type": request.headers.get("Content-Type", ""),
                "request_body": request_payload_preview,
                "response_body": response_body_preview,
                "request_details": {
                    "query": dict(request.args),
                    "json": request_json_payload,
                    "form": request_form_payload,
                    "headers": request_headers_snapshot,
                    "content_length": request.content_length,
                },
                "response_details": {
                    "content_type": response_content_type,
                    "content_length": response.calculate_content_length(),
                    "json": parsed_response_json,
                },
                "usage": system_usage,
                "duration_ms": duration_ms,
                "auth_user_id": auth_user_id,
                "auth_wallet_address": auth_wallet_address,
                "auth_email": auth_email,
            }
        }

        db.security_logs.insert_one(log_doc)
    except Exception as e:
        logger.debug(f"Audit log write skipped: {e}")

    return response

# Enhanced logging with your configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('openlearnx.log')
    ]
)
logger = logging.getLogger(__name__)

# ✅ ENHANCED: Initialize services with your environment configuration
def initialize_services():
    """Initialize all services with your environment configuration"""
    services_initialized = {}
    
    # MongoDB Service with your URI
    try:
        mongo_service = MongoService(app.config['MONGODB_URI'])
        app.config['MONGO_SERVICE'] = mongo_service
        services_initialized['mongodb'] = True
        logger.info(f"✅ MongoService initialized with URI: {app.config['MONGODB_URI']}")
    except Exception as e:
        services_initialized['mongodb'] = False
        logger.error(f"❌ Failed MongoService init: {e}")

    # Web3 Service with your Anvil configuration
    try:
        web3_service = Web3Service(app.config['WEB3_PROVIDER_URL'], app.config['CONTRACT_ADDRESS'])
        app.config['WEB3_SERVICE'] = web3_service
        services_initialized['web3'] = True
        logger.info(f"✅ Web3Service initialized with Anvil: {app.config['WEB3_PROVIDER_URL']}")
        logger.info(f"✅ Contract Address: {app.config['CONTRACT_ADDRESS']}")
    except Exception as e:
        services_initialized['web3'] = False
        logger.error(f"❌ Failed Web3Service init: {e}")
    
    # Optional services
    if services_status['wallet']:
        app.config['WALLET_SERVICE'] = wallet_service
        logger.info("✅ Wallet service configured")
    if services_status['compiler']:
        app.config['REAL_COMPILER_SERVICE'] = real_compiler_service
        logger.info("✅ Real compiler service configured")
    if services_status['ai_quiz']:
        app.config['AI_QUIZ_SERVICE'] = ai_service
        logger.info("✅ AI Quiz service configured")
    
    return services_initialized

# Initialize services
service_status = initialize_services()

# ✅ ENHANCED: Dynamic blueprint registration with better error handling
def register_blueprints():
    """Register all blueprints with enhanced error handling"""
    blueprints_registered = []
    blueprints_failed = []
    
    blueprint_modules = {}
    
    # Import blueprints dynamically
    for bp_name, prefix in blueprints_to_register:
        try:
            if bp_name == 'dashboard' and not DASHBOARD_AVAILABLE:
                print(f"⚠️ Skipping {bp_name} - not available")
                continue
            
            if bp_name == 'certificate':
                if CERTIFICATE_BLUEPRINT_AVAILABLE:
                    blueprint_modules[bp_name] = (certificate_bp, prefix)
                    print(f"✅ Certificate blueprint loaded")
                else:
                    print(f"❌ Skipping certificate blueprint - not available")
                    continue
            else:
                module = __import__(f'routes.{bp_name}', fromlist=['bp'])
                blueprint_modules[bp_name] = (module.bp, prefix)
            
        except ImportError as e:
            blueprints_failed.append((prefix, f"Import error: {str(e)}"))
            logger.error(f"❌ Failed to import {bp_name}: {e}")
            continue
    
    # Register imported blueprints
    for bp_name, (blueprint, prefix) in blueprint_modules.items():
        try:
            app.register_blueprint(blueprint, url_prefix=prefix)
            blueprints_registered.append(prefix)
            logger.info(f"✅ Registered blueprint {prefix}")
        except Exception as e:
            blueprints_failed.append((prefix, str(e)))
            logger.error(f"❌ Blueprint {prefix} registration failed: {e}")
    
    return blueprints_registered, blueprints_failed

# Register blueprints
blueprints_registered, blueprints_failed = register_blueprints()

# ✅ FIXED: Database connection with proper None handling
def get_db():
    """Get MongoDB database connection"""
    try:
        client = MongoClient(app.config['MONGODB_URI'])
        db = client.openlearnx
        # Test the connection
        db.command('ismaster')
        return db
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

# ===================================================================
# ✅ REMOVED ALL CERTIFICATE ROUTES - NOW USING BLUEPRINT
# Certificate routes have been moved to routes/certificate.py blueprint
# This eliminates conflicts and async event loop issues
# ===================================================================

# ✅ ADD WALLET AUTHENTICATION ENDPOINT (Keep this in main app)
@app.route('/api/auth/wallet-login', methods=['POST', 'OPTIONS'])
def wallet_login():
    """Authenticate user with wallet signature"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.json
        address = data.get('address')
        signature = data.get('signature')
        timestamp = data.get('timestamp')
        
        if not address or not signature:
            return jsonify({"error": "Missing address or signature"}), 400
        
        # Verify the signature (implement your verification logic)
        is_valid = verify_wallet_signature(address, signature, timestamp)
        
        if not is_valid:
            return jsonify({"error": "Invalid signature"}), 401
        
        # Get database connection
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Find or create user
        user = db.users.find_one({"wallet_address": address})
        
        if user is None:
            # Create new user
            user_id = str(uuid.uuid4())
            user = {
                "user_id": user_id,
                "wallet_address": address,
                "login_method": "wallet",
                "created_at": datetime.now().isoformat(),
                "last_login": datetime.now().isoformat()
            }
            db.users.insert_one(user)
        else:
            # Update last login
            db.users.update_one(
                {"wallet_address": address},
                {"$set": {"last_login": datetime.now().isoformat()}}
            )
            user_id = user['user_id']
        
        # Generate JWT token
        token = create_access_token(identity=user_id)
        
        return jsonify({
            "success": True,
            "message": "Wallet authentication successful",
            "token": token,
            "user": {
                "user_id": user_id,
                "wallet_address": address,
                "login_method": "wallet"
            }
        })
        
    except Exception as e:
        logger.error(f"Wallet login error: {str(e)}")
        return jsonify({"error": "Authentication failed"}), 500

def verify_wallet_signature(address, signature, timestamp):
    """Verify wallet signature - implement based on your needs"""
    try:
        # For now, return True. In production, implement proper signature verification
        # You would recreate the signed message and verify it matches the signature
        return True
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        return False

# ===================================================================
# ✅ HEALTH ENDPOINTS
# ===================================================================

@app.route('/')
def health_root():
    return jsonify({
        "status": "OpenLearnX Professional Dashboard API",
        "version": "5.0.0 - BLUEPRINT-BASED CERTIFICATE SYSTEM",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "mongodb": service_status.get('mongodb', False),
            "web3": service_status.get('web3', False),
            "wallet": services_status['wallet'],
            "compiler": services_status['compiler'],
            "ai_quiz_service": services_status['ai_quiz'],
            "comprehensive_dashboard": DASHBOARD_AVAILABLE,
            "certificate_system": CERTIFICATE_BLUEPRINT_AVAILABLE,  # ✅ Blueprint-based
            "unique_certificate_urls": CERTIFICATE_BLUEPRINT_AVAILABLE,
            "certificate_sharing": CERTIFICATE_BLUEPRINT_AVAILABLE,
            "aes256_encryption": CERTIFICATE_BLUEPRINT_AVAILABLE
        },
        "endpoints": {
            "comprehensive_stats": "/api/dashboard/comprehensive-stats",
            "certificates": "/api/certificate/mint",  # ✅ Blueprint endpoint
            "certificate_test": "/api/certificate/test-db",  # ✅ Blueprint endpoint
            "unique_certificates": "/certificate/<share_code>",
            "health": "/api/health"
        }
    })

@app.route('/api/health')
def api_health():
    db = get_db()
    db_status = "connected" if db is not None else "disconnected"
    
    collections_count = {}
    if db is not None:
        try:
            db.command('ismaster')
            collections_count = {
                "users": db.users.count_documents({}),
                "user_stats": db.user_stats.count_documents({}),
                "user_courses": db.user_courses.count_documents({}),
                "user_quizzes": db.user_quizzes.count_documents({}),
                "user_submissions": db.user_submissions.count_documents({}),
                "user_achievements": db.user_achievements.count_documents({}),
                "certificates": db.certificates.count_documents({})
            }
        except Exception as e:
            db_status = f"error: {str(e)}"
            collections_count = {}
    
    status = "healthy" if service_status.get('mongodb') else "degraded"
    
    return jsonify({
        "status": status,
        "services": {
            "mongodb": db_status,
            "web3": service_status.get('web3', False),
            "wallet": services_status['wallet'],
            "compiler": services_status['compiler'],
            "ai_quiz_service": services_status['ai_quiz'],
            "comprehensive_dashboard": DASHBOARD_AVAILABLE,
            "certificate_system": CERTIFICATE_BLUEPRINT_AVAILABLE,  # ✅ Blueprint status
            "unique_urls": CERTIFICATE_BLUEPRINT_AVAILABLE,
            "share_tracking": CERTIFICATE_BLUEPRINT_AVAILABLE,
            "aes256_encryption": CERTIFICATE_BLUEPRINT_AVAILABLE
        },
        "collections": collections_count,
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed,
        "version": "5.0.0-blueprint-based-certificates"
    }), 200 if status == "healthy" else 503

# ===================================================================
# ✅ ERROR HANDLERS
# ===================================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Endpoint not found",
        "path": request.path,
        "method": request.method,
        "available_endpoints": [
            "/api/dashboard/comprehensive-stats",
            "/api/certificate/mint",       # ✅ Blueprint endpoint
            "/api/certificate/test-db",    # ✅ Blueprint endpoint
            "/api/certificate/<id>",       # ✅ Blueprint endpoint
            "/api/certificate/verify/<share_code>",  # ✅ Blueprint endpoint
            "/api/certificate/list-all",   # ✅ Blueprint endpoint
            "/api/auth/wallet-login",
            "/api/health"
        ],
        "suggestion": "Check the API documentation for valid endpoints"
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 Error: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "timestamp": datetime.now().isoformat(),
        "suggestion": "Check server logs for detailed error information",
        "support": "Contact support if this persists"
    }), 500

# ===================================================================
# ✅ APPLICATION STARTUP
# ===================================================================

if __name__ == "__main__":
    print("🚀 Starting OpenLearnX Professional Dashboard Backend v5.0.0")
    print("📊 Features: Comprehensive Analytics, Real-time Data, Blueprint-based Certificate System")
    print(f"🔗 MongoDB URI: {app.config['MONGODB_URI']}")
    print(f"🌐 Web3 Provider: {app.config['WEB3_PROVIDER_URL']}")
    print(f"📄 Contract Address: {app.config['CONTRACT_ADDRESS']}")
    print(f"🔐 JWT Expiration: {os.getenv('JWT_EXPIRATION_HOURS', 168)} hours")
    print(f"📊 Dashboard Cache: {app.config['DASHBOARD_CACHE_TIMEOUT']} seconds")
    
    print(f"\n📋 Service Status:")
    print(f"   - MongoDB: {'✅ Connected' if service_status.get('mongodb') else '❌ Failed'}")
    print(f"   - Web3/Anvil: {'✅ Connected' if service_status.get('web3') else '❌ Failed'}")
    print(f"   - Comprehensive Dashboard: {'✅ Available' if DASHBOARD_AVAILABLE else '❌ Unavailable'}")
    print(f"   - AI Quiz Service: {'✅ Available' if services_status['ai_quiz'] else '❌ Unavailable'}")
    print(f"   - Certificate System: {'✅ Blueprint Available' if CERTIFICATE_BLUEPRINT_AVAILABLE else '❌ Blueprint Missing'}")
    print(f"   - JWT Authentication: ✅ Configured")
    print(f"   - Enhanced Security: ✅ Timeout Protection")
    print(f"   - Blueprints: {len(blueprints_registered)} registered")
    
    if blueprints_failed:
        print(f"   - Failed blueprints: {len(blueprints_failed)}")
        for prefix, error in blueprints_failed:
            print(f"     ❌ {prefix}: {error}")
    
    print(f"\n🎯 Professional Dashboard Endpoints:")
    print(f"   - GET  /api/dashboard/comprehensive-stats")
    print(f"   - GET  /api/health")
    
    if CERTIFICATE_BLUEPRINT_AVAILABLE:
        print(f"\n🏆 Certificate System Endpoints (Blueprint-based):")
        print(f"   - GET  /api/certificate/test-db")
        print(f"   - POST /api/certificate/mint")
        print(f"   - GET  /api/certificate/test-generation")
        print(f"   - GET  /api/certificate/<certificate_id>")
        print(f"   - GET  /api/certificate/verify/<share_code>")
        print(f"   - GET  /api/certificate/list-all")
    else:
        print(f"\n❌ Certificate System: Blueprint not available")
        print(f"   - Create routes/certificate.py with the blueprint code")
    
    print(f"\n🔐 Authentication Endpoints:")
    print(f"   - POST /api/auth/wallet-login")
    
    print(f"\n🎓 BLUEPRINT-BASED CERTIFICATE SYSTEM:")
    print(f"   ✅ Isolated MongoDB connections (no async conflicts)")
    print(f"   ✅ Unique certificate ID generation")
    print(f"   ✅ Proper student name display")
    print(f"   ✅ Guaranteed database saving")
    print(f"   ✅ Enhanced error handling")
    print(f"   ✅ No event loop conflicts")
    
    # Set MongoDB URI as environment variable
    os.environ['MONGODB_URI'] = app.config['MONGODB_URI']
    
    try:
        app.run(
            host=app.config['HOST'],
            port=app.config['PORT'],
            debug=os.getenv('FLASK_ENV') == 'development',
            threaded=True,
            use_reloader=False  # ✅ Prevent double initialization in debug mode
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        import traceback
        traceback.print_exc()
