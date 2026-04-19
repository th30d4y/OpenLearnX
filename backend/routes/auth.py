from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
import uuid
import jwt
import logging
from eth_account.messages import encode_defunct
from web3 import Web3
from activity_logger import log_user_activity

bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client.openlearnx

# JWT secret - must be set via environment variable
JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    import warnings
    import tempfile
    import stat
    import secrets as secrets_module
    warnings.warn("JWT_SECRET environment variable not set. Using persistent dev secret.", UserWarning)
    
    def _generate_and_store_secret():
        """Generate a random secret and store it with restrictive permissions."""
        return secrets_module.token_hex(32)
    
    # Use persistent file-based secret for development to avoid invalidating tokens on restart
    _secret_file = os.path.join(tempfile.gettempdir(), '.openlearnx_dev_jwt_secret_auth')
    try:
        if os.path.exists(_secret_file):
            with open(_secret_file, 'r') as f:
                JWT_SECRET = f.read().strip()
        if not JWT_SECRET:
            JWT_SECRET = _generate_and_store_secret()
            with open(_secret_file, 'w') as f:
                f.write(JWT_SECRET)
            # Set restrictive permissions (owner read/write only)
            os.chmod(_secret_file, stat.S_IRUSR | stat.S_IWUSR)
    except Exception:
        JWT_SECRET = _generate_and_store_secret()

@bp.route('/nonce', methods=['POST', 'OPTIONS'])
def get_nonce():
    """Generate nonce for MetaMask authentication"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        
        if not wallet_address:
            return jsonify({
                "success": False,
                "error": "Wallet address required"
            }), 400
        
        # Generate unique nonce
        nonce = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create message to sign
        message = f"Sign this message to authenticate with OpenLearnX:\n\nNonce: {nonce}\nTimestamp: {timestamp}\nAddress: {wallet_address}"
        
        logger.info(f"🔐 Generated nonce for wallet: {wallet_address}")
        
        return jsonify({
            "success": True,
            "nonce": nonce,
            "message": message,
            "timestamp": timestamp
        })
        
    except Exception as e:
        logger.error(f"❌ Error generating nonce: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/verify', methods=['POST', 'OPTIONS'])
def verify_signature():
    """Verify MetaMask signature and authenticate user"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        wallet_address = data.get('wallet_address')
        signature = data.get('signature')
        message = data.get('message')
        
        if not all([wallet_address, signature, message]):
            return jsonify({
                "success": False,
                "error": "Wallet address, signature, and message are required"
            }), 400
        
        # Verify the signature
        try:
            # Create the message hash that was signed
            message_hash = encode_defunct(text=message)
            
            # Recover the address from the signature
            w3 = Web3()
            recovered_address = w3.eth.account.recover_message(message_hash, signature=signature)
            
            # Check if recovered address matches the claimed address
            if recovered_address.lower() != wallet_address.lower():
                return jsonify({
                    "success": False,
                    "error": "Signature verification failed"
                }), 401
                
        except Exception as e:
            logger.error(f"❌ Signature verification error: {str(e)}")
            return jsonify({
                "success": False,
                "error": "Invalid signature"
            }), 401
        
        # Check if user exists, create if not
        user = db.users.find_one({"wallet_address": wallet_address.lower()})
        
        if not user:
            # Create new user
            user = {
                "wallet_address": wallet_address.lower(),
                "role": "student",
                "status": "active",
                "created_at": datetime.now(),
                "last_login": datetime.now(),
                "login_count": 1
            }
            result = db.users.insert_one(user)
            user["_id"] = str(result.inserted_id)
            logger.info(f"✅ Created new user: {wallet_address}")
            log_user_activity(
                db,
                wallet_address.lower(),
                "auth_register",
                "Account registered",
                "Created account via wallet authentication",
                {"auth_method": "wallet"},
            )
        else:
            account_status = str(user.get("status", "active")).lower().strip()
            if account_status == "banned":
                logger.warning(f"⛔ Banned wallet login blocked: {wallet_address}")
                log_user_activity(
                    db,
                    wallet_address.lower(),
                    "account_status",
                    "Login blocked",
                    "Login blocked because account is banned",
                    {"status": "banned"},
                )
                return jsonify({
                    "success": False,
                    "error": "Your account is banned. Contact admin."
                }), 403

            # Update existing user
            db.users.update_one(
                {"wallet_address": wallet_address.lower()},
                {
                    "$set": {"last_login": datetime.now()},
                    "$inc": {"login_count": 1}
                }
            )
            user["_id"] = str(user["_id"])
            logger.info(f"✅ Updated existing user: {wallet_address}")

        log_user_activity(
            db,
            wallet_address.lower(),
            "auth_login",
            "Login successful",
            "Wallet login completed successfully",
            {"auth_method": "wallet"},
        )
        
        # Generate JWT token
        token_payload = {
            "user_id": user["wallet_address"],
            "wallet_address": user["wallet_address"],
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        
        # Prepare user data for response
        user_response = {
            "id": user["wallet_address"],
            "wallet_address": user["wallet_address"],
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "bio": user.get("bio", ""),
            "avatar": user.get("avatar", ""),
            "role": user.get("role", "student"),
            "status": user.get("status", "active"),
            "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
            "last_login": user["last_login"].isoformat() if isinstance(user["last_login"], datetime) else str(user["last_login"])
        }
        
        logger.info(f"✅ Authentication successful for: {wallet_address}")
        
        return jsonify({
            "success": True,
            "token": token,
            "user": user_response,
            "message": "Authentication successful"
        })
        
    except Exception as e:
        logger.error(f"❌ Error verifying signature: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    """Register a new user with email and password"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        username = data.get('username', '').strip()
        
        if not email or not password:
            return jsonify({
                "success": False,
                "error": "Email and password are required"
            }), 400
        
        if len(password) < 6:
            return jsonify({
                "success": False,
                "error": "Password must be at least 6 characters"
            }), 400
        
        # Check if user already exists
        existing_user = db.users.find_one({"email": email})
        if existing_user:
            return jsonify({
                "success": False,
                "error": "Email already registered"
            }), 409
        
        # Hash password using simple approach for development
        # TODO: Use werkzeug.security.generate_password_hash for production
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Create new user
        user = {
            "email": email,
            "username": username or email.split("@")[0],
            "password_hash": password_hash,
            "name": "",
            "bio": "",
            "avatar": "",
            "role": "student",
            "status": "active",
            "created_at": datetime.now(),
            "last_login": datetime.now(),
            "login_count": 1,
            "auth_method": "email"
        }
        
        result = db.users.insert_one(user)
        user["_id"] = str(result.inserted_id)
        
        # Generate JWT token
        token_payload = {
            "user_id": str(result.inserted_id),
            "email": email,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        
        user_response = {
            "id": str(result.inserted_id),
            "email": email,
            "username": username or email.split("@")[0],
            "name": "",
            "bio": "",
            "avatar": "",
            "role": "student",
            "status": "active",
            "created_at": user["created_at"].isoformat(),
            "last_login": user["last_login"].isoformat()
        }

        log_user_activity(
            db,
            str(result.inserted_id),
            "auth_register",
            "Account registered",
            "Created account with email and password",
            {"auth_method": "email"},
        )
        
        logger.info(f"✅ New user registered: {email}")
        
        return jsonify({
            "success": True,
            "token": token,
            "user": user_response,
            "message": "Registration successful"
        }), 201
        
    except Exception as e:
        logger.error(f"❌ Error during registration: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """Login with email and password"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({
                "success": False,
                "error": "Email and password are required"
            }), 400
        
        # Find user by email
        user = db.users.find_one({"email": email})
        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401

        account_status = str(user.get("status", "active")).lower().strip()
        if account_status == "banned":
            logger.warning(f"⛔ Banned email login blocked: {email}")
            log_user_activity(
                db,
                str(user.get("_id")),
                "account_status",
                "Login blocked",
                "Login blocked because account is banned",
                {"status": "banned", "email": email},
            )
            return jsonify({
                "success": False,
                "error": "Your account is banned. Contact admin."
            }), 403

        if account_status == "suspended":
            log_user_activity(
                db,
                str(user.get("_id")),
                "account_status",
                "Login attempted while suspended",
                "User logged in while account status is suspended",
                {"status": "suspended", "email": email},
            )
        
        # Verify password
        import hashlib
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if password_hash != user.get('password_hash'):
            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401
        
        # Update last login
        db.users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {"last_login": datetime.now()},
                "$inc": {"login_count": 1}
            }
        )
        
        # Generate JWT token
        token_payload = {
            "user_id": str(user["_id"]),
            "email": email,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm="HS256")
        
        user_response = {
            "id": str(user["_id"]),
            "email": email,
            "username": user.get('username', ''),
            "name": user.get('name', ''),
            "bio": user.get('bio', ''),
            "avatar": user.get('avatar', ''),
            "role": user.get('role', 'student'),
            "status": user.get('status', 'active'),
            "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
            "last_login": user["last_login"].isoformat() if isinstance(user["last_login"], datetime) else str(user["last_login"])
        }

        log_user_activity(
            db,
            str(user.get("_id")),
            "auth_login",
            "Login successful",
            "Email login completed successfully",
            {"auth_method": "email", "email": email},
        )
        
        logger.info(f"✅ User logged in: {email}")
        
        return jsonify({
            "success": True,
            "token": token,
            "user": user_response,
            "message": "Login successful"
        })
        
    except Exception as e:
        logger.error(f"❌ Error during login: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/profile/update', methods=['POST', 'OPTIONS'])
def update_profile():
    """Update user profile (name, bio, avatar)"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authorization header required"
            }), 401
        
        token = auth_header.split('Bearer ')[1]
        
        # Verify and decode token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({
                "success": False,
                "error": "Invalid token"
            }), 401
        
        data = request.get_json()
        name = data.get('name', '').strip()
        bio = data.get('bio', '').strip()
        avatar = data.get('avatar', '').strip()
        
        # Update user profile
        from bson.objectid import ObjectId
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "name": name,
                    "bio": bio,
                    "avatar": avatar,
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        # Get updated user
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        user_response = {
            "id": str(user["_id"]),
            "email": user.get('email', ''),
            "username": user.get('username', ''),
            "name": user.get('name', ''),
            "bio": user.get('bio', ''),
            "avatar": user.get('avatar', ''),
            "role": user.get('role', 'student'),
            "status": user.get('status', 'active'),
            "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else str(user["created_at"]),
            "last_login": user["last_login"].isoformat() if isinstance(user["last_login"], datetime) else str(user["last_login"])
        }
        
        logger.info(f"✅ Profile updated for user: {user_id}")
        
        return jsonify({
            "success": True,
            "user": user_response,
            "message": "Profile updated successfully"
        })
        
    except Exception as e:
        logger.error(f"❌ Error updating profile: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
@bp.route('/metamask/add-email', methods=['POST', 'OPTIONS'])
def add_metamask_email():
    """Store contact email for MetaMask wallet"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authorization header required"
            }), 401
        
        token = auth_header.split('Bearer ')[1]
        
        # Verify and decode token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            wallet_address = payload.get('wallet_address')
            if not wallet_address:
                wallet_address = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({
                "success": False,
                "error": "Invalid token"
            }), 401
        
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        name = data.get('name', '').strip()
        
        if not email:
            return jsonify({
                "success": False,
                "error": "Email is required"
            }), 400
        
        # Validate email format
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            return jsonify({
                "success": False,
                "error": "Invalid email format"
            }), 400
        
        # Check if email already used by different wallet
        existing_user = db.users.find_one({"email": email, "wallet_address": {"$ne": wallet_address.lower()}})
        if existing_user:
            return jsonify({
                "success": False,
                "error": "Email already associated with another wallet"
            }), 409
        
        # Update user with email and name
        from bson.objectid import ObjectId
        
        # Try updating by wallet address first (for new users)
        result = db.users.update_one(
            {"wallet_address": wallet_address.lower()},
            {
                "$set": {
                    "email": email,
                    "name": name or "",
                    "updated_at": datetime.now()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404
        
        # Get updated user
        user = db.users.find_one({"wallet_address": wallet_address.lower()})
        
        user_response = {
            "id": str(user.get("_id", wallet_address)),
            "wallet_address": user.get("wallet_address", wallet_address),
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "bio": user.get("bio", ""),
            "avatar": user.get("avatar", ""),
            "role": user.get("role", "student"),
            "status": user.get("status", "active"),
            "created_at": user.get("created_at", datetime.now()).isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", datetime.now())),
            "last_login": user.get("last_login", datetime.now()).isoformat() if isinstance(user.get("last_login"), datetime) else str(user.get("last_login", datetime.now()))
        }
        
        logger.info(f"✅ Email added for MetaMask wallet: {wallet_address}")
        
        return jsonify({
            "success": True,
            "user": user_response,
            "message": "Email saved successfully"
        })
        
    except Exception as e:
        logger.error(f"❌ Error saving MetaMask email: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@bp.route('/verify-token', methods=['POST', 'OPTIONS'])
def verify_token():
    """Validate JWT token and return the latest user payload."""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})

    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({"valid": False, "error": "Authorization header required"}), 401

        token = auth_header.split('Bearer ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return jsonify({"valid": False, "error": "Invalid token"}), 401

        user = None
        wallet_address = payload.get('wallet_address')
        email = payload.get('email')
        user_id = payload.get('user_id')

        if wallet_address:
            user = db.users.find_one({"wallet_address": str(wallet_address).lower()})
        elif email:
            user = db.users.find_one({"email": str(email).lower()})
        elif user_id:
            try:
                from bson.objectid import ObjectId
                user = db.users.find_one({"_id": ObjectId(user_id)})
            except Exception:
                user = None

        if not user:
            return jsonify({"valid": False, "error": "User not found"}), 404

        status = str(user.get("status", "active")).lower().strip()
        if status == "banned":
            return jsonify({"valid": False, "error": "Account is banned"}), 403

        user_response = {
            "id": str(user.get("_id", user.get("wallet_address", ""))),
            "wallet_address": user.get("wallet_address", ""),
            "email": user.get("email", ""),
            "username": user.get("username", ""),
            "name": user.get("name", ""),
            "bio": user.get("bio", ""),
            "avatar": user.get("avatar", ""),
            "role": user.get("role", "student"),
            "status": user.get("status", "active"),
            "created_at": user.get("created_at", datetime.now()).isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", datetime.now())),
            "last_login": user.get("last_login", datetime.now()).isoformat() if isinstance(user.get("last_login"), datetime) else str(user.get("last_login", datetime.now())),
        }

        return jsonify({"valid": True, "user": user_response})
    except Exception as e:
        logger.error(f"❌ verify-token error: {str(e)}")
        return jsonify({"valid": False, "error": str(e)}), 500


@bp.route('/me', methods=['GET', 'OPTIONS'])
def get_me():
    """Return authenticated user profile for current token."""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})

    verify_resp = verify_token()
    try:
        body, status = verify_resp
        if status != 200:
            return body, status
        data = body.get_json()
        return jsonify({"success": True, "user": data.get("user", {})})
    except Exception:
        return verify_resp

@bp.route('/upload-image', methods=['POST', 'OPTIONS'])
def upload_image():
    """Upload and convert image (PNG/JPG only) to base64"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        # Get token from header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                "success": False,
                "error": "Authorization header required"
            }), 401
        
        token = auth_header.split('Bearer ')[1]
        
        # Verify and decode token
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get('user_id')
        except jwt.InvalidTokenError:
            return jsonify({
                "success": False,
                "error": "Invalid token"
            }), 401
        
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                "success": False,
                "error": "No file provided"
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        # Validate file type - only PNG and JPG
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({
                "success": False,
                "error": "Only PNG and JPG formats are allowed"
            }), 400
        
        # Validate file size (max 5MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Seek back to start
        
        max_size = 5 * 1024 * 1024  # 5MB
        if file_size > max_size:
            return jsonify({
                "success": False,
                "error": "File size must be less than 5MB"
            }), 400
        
        # Read file and convert to base64
        import base64
        file_data = file.read()
        base64_image = base64.b64encode(file_data).decode('utf-8')
        
        # Create data URL for the image
        mime_type = f"image/{file_ext if file_ext != 'jpg' else 'jpeg'}"
        data_url = f"data:{mime_type};base64,{base64_image}"
        
        logger.info(f"✅ Image uploaded for user: {user_id}, size: {file_size} bytes")
        
        return jsonify({
            "success": True,
            "image": data_url,
            "size": file_size,
            "message": "Image uploaded successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error uploading image: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
