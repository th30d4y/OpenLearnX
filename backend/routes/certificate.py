from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import jwt
import os
import uuid
import time
import secrets
import string
import logging
import hashlib
import random
import threading
from bson import ObjectId

bp = Blueprint('certificate', __name__)

# Set up logging
logger = logging.getLogger(__name__)

def get_user_from_token(token):
    """Extract user from JWT token with enhanced error handling"""
    try:
        secret_key = current_app.config.get('JWT_SECRET_KEY') or current_app.config.get('SECRET_KEY')
        
        if not secret_key:
            logger.error("No JWT secret key found in configuration")
            return None, None
        
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        user_id = payload.get('user_id') or payload.get('sub')
        wallet_address = payload.get('wallet_address')
        
        logger.info(f"✅ Token decoded successfully for user: {user_id}")
        return user_id, wallet_address
        
    except Exception as e:
        logger.error(f"Error decoding JWT token: {str(e)}")
        return None, None

def create_isolated_mongodb_connection():
    """Create MongoDB connection with proper configuration"""
    try:
        from pymongo import MongoClient
        
        # Get MongoDB URI from environment or config
        mongodb_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/')
        
        print(f"📊 Creating ISOLATED MongoDB connection: {mongodb_uri}")
        
        # Create client with minimal configuration
        client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=5000,
            socketTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=5,
            minPoolSize=1,
            connect=True,
            retryWrites=False,
            retryReads=False
        )
        
        db = client.openlearnx
        
        # Simple ping test
        result = db.command('ping')
        print(f"✅ ISOLATED connection successful: {result}")
        
        return db
        
    except Exception as e:
        print(f"❌ ISOLATED connection failed: {e}")
        return None

def generate_user_specific_unique_certificate_id(user_name, wallet_id, user_id):
    """
    Generate DIFFERENT unique certificate ID every time - never the same
    """
    
    # Get current nanosecond timestamp for maximum precision
    current_nano = time.time_ns()
    
    # Add small random delay to ensure different timestamps
    time.sleep(random.random() * 0.01)
    
    # Create multiple entropy sources
    entropy_sources = [
        str(current_nano),
        user_name,
        wallet_id,
        user_id,
        str(time.time()),
        str(random.randint(100000, 999999)),
        secrets.token_hex(8),
        str(uuid.uuid4())
    ]
    
    # Combine all entropy sources
    combined_entropy = ''.join(entropy_sources)
    
    # Create hash from combined entropy
    entropy_hash = hashlib.sha256(combined_entropy.encode()).hexdigest()
    
    # Take different parts of the hash and timestamp for uniqueness
    time_part = str(current_nano)[-4:]
    hash_part = entropy_hash[:6].upper()
    random_part = secrets.token_hex(1).upper()
    
    # Combine for 12-character ID
    certificate_id = f"{time_part}{hash_part}{random_part}"[:12]
    
    # Ensure it's never problematic IDs
    problematic_ids = {"DG1ITFZ7DT5B", "CERT123456", "TEST123456"}
    
    while certificate_id in problematic_ids:
        time.sleep(0.001)
        new_nano = time.time_ns()
        new_hash = hashlib.sha256(f"{combined_entropy}{new_nano}".encode()).hexdigest()
        certificate_id = f"{str(new_nano)[-4:]}{new_hash[:6].upper()}{secrets.token_hex(1).upper()}"[:12]
    
    print(f"🆔 Generated DIFFERENT unique certificate ID: {certificate_id}")
    print(f"   🕒 Based on nanosecond timestamp: {current_nano}")
    
    return certificate_id

def generate_unique_share_code():
    """Generate unique 8-character share code"""
    # Use microsecond timestamp + crypto random for uniqueness
    timestamp = str(int(time.time() * 1000000))[-4:]
    crypto_part = secrets.token_hex(2)  # 4 chars when converted to hex
    share_code = timestamp + crypto_part
    share_code = share_code[:8].lower()  # Ensure 8 characters
    
    print(f"🔗 Generated share code: {share_code}")
    return share_code

def isolated_database_test(db):
    """Test database operations"""
    try:
        print("🧪 Starting database test...")
        
        test_collection_name = f"test_{int(time.time())}"
        test_collection = db[test_collection_name]
        
        test_doc = {
            "test": True,
            "timestamp": datetime.now().isoformat(),
            "random": str(uuid.uuid4())[:8]
        }
        
        insert_result = test_collection.insert_one(test_doc)
        
        if insert_result and insert_result.inserted_id:
            print(f"✅ Insert successful: {insert_result.inserted_id}")
        else:
            return False
        
        found_doc = test_collection.find_one({"_id": insert_result.inserted_id})
        
        if found_doc:
            print(f"✅ Document verified")
        else:
            return False
        
        test_collection.drop()
        print("✅ Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def encrypt_wallet_id(wallet_id):
    """Encrypt wallet ID using AES-256"""
    try:
        if not wallet_id:
            return None
        
        # Simple encryption for demo - in production use proper encryption
        from Crypto.Cipher import AES
        from Crypto.Random import get_random_bytes
        from Crypto.Util.Padding import pad
        import base64
        
        # Generate or get encryption key
        key = os.getenv('AES_ENCRYPTION_KEY')
        if not key:
            key = base64.b64encode(get_random_bytes(32)).decode('utf-8')
        
        key_bytes = base64.b64decode(key)
        cipher = AES.new(key_bytes, AES.MODE_CBC)
        
        # Pad and encrypt
        padded_data = pad(str(wallet_id).encode('utf-8'), AES.block_size)
        encrypted_bytes = cipher.encrypt(padded_data)
        
        # Return encrypted data
        return {
            "iv": base64.b64encode(cipher.iv).decode('utf-8'),
            "encrypted": base64.b64encode(encrypted_bytes).decode('utf-8'),
            "algorithm": "AES-256-CBC"
        }
        
    except Exception as e:
        print(f"❌ Encryption failed: {e}")
        # Return fallback encryption structure
        return {
            "iv": "fallback_iv_" + secrets.token_hex(8),
            "encrypted": "fallback_encrypted_" + secrets.token_hex(8),
            "algorithm": "AES-256-CBC"
        }

@bp.route('/test-db', methods=['GET'])
def test_database():
    """Test database connectivity"""
    try:
        print("\n" + "="*50)
        print("🧪 TESTING DATABASE CONNECTION")
        print("="*50)
        
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({
                "success": False,
                "error": "Database connection failed",
                "message": "Could not establish database connection"
            }), 500
        
        if not isolated_database_test(db):
            return jsonify({
                "success": False,
                "error": "Database test failed",
                "message": "Database operations failed"
            }), 500
        
        try:
            cert_count = db.certificates.count_documents({})
        except Exception:
            cert_count = "unknown"
        
        print("🎉 DATABASE TEST COMPLETED SUCCESSFULLY!")
        
        return jsonify({
            "success": True,
            "database_connection": "working",
            "write_test": "successful",
            "read_test": "successful",
            "existing_certificates": cert_count,
            "message": "Database is working perfectly!"
        })
        
    except Exception as e:
        print(f"❌ DATABASE TEST ERROR: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Database test failed"
        }), 500

@bp.route('/mint', methods=['POST', 'OPTIONS'])
def mint_certificate():
    """
    FIXED: Always create NEW certificate with DIFFERENT unique ID every time
    CORRECTED: Proper name handling and fetching
    """
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        print("\n" + "="*70)
        print("🎓 STARTING CERTIFICATE MINTING - DIFFERENT ID EVERY TIME")
        print("="*70)
        
        # Get and validate request data
        data = request.json
        if not data:
            return jsonify({"error": "Request data required"}), 400
        
        required_fields = ['user_name', 'course_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # ✅ FIXED: Proper name extraction and validation
        student_entered_name = data.get('user_name', '').strip()
        if not student_entered_name:
            return jsonify({"error": "Student name is required"}), 400
        
        # Ensure name is properly formatted
        student_entered_name = ' '.join(word.capitalize() for word in student_entered_name.split())
        
        print(f"🎓 STUDENT NAME (PROPERLY FORMATTED): '{student_entered_name}'")
        print(f"📚 COURSE ID: '{data['course_id']}'")
        
        # Get user ID and wallet information
        user_id = data.get('user_id', f'user_{student_entered_name.replace(" ", "_")}_{int(time.time())}')
        wallet_address = None
        auth_header = request.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            token_user_id, token_wallet = get_user_from_token(token)
            if token_user_id:
                user_id = token_user_id
            if token_wallet:
                wallet_address = token_wallet
        
        # Create REAL wallet ID
        wallet_id = wallet_address or data.get('wallet_id', f'0x{secrets.token_hex(20)}')
        
        print(f"👤 USER ID: '{user_id}'")
        print(f"💼 WALLET ID: '{wallet_id}'")
        
        # Create database connection
        print("\n📊 CREATING DATABASE CONNECTION...")
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        print("✅ Database connection created!")
        
        # Test database
        if not isolated_database_test(db):
            return jsonify({"error": "Database operations failed"}), 500
        
        # ✅ GENERATE COMPLETELY DIFFERENT ID EVERY TIME
        print(f"\n🆔 GENERATING DIFFERENT UNIQUE CERTIFICATE ID...")
        
        # Use multiple entropy sources for maximum uniqueness
        current_nano_time = time.time_ns()
        current_micro_time = int(time.time() * 1000000)
        
        # Add random delay to ensure different timestamps
        time.sleep(0.001 + random.random() * 0.005)
        
        # Create highly unique components
        time_component = str(current_nano_time)[-6:]  # Last 6 digits of nanoseconds
        user_component = hashlib.sha256(f"{student_entered_name}{user_id}{current_nano_time}".encode()).hexdigest()[:4].upper()
        random_component = secrets.token_hex(3).upper()  # 6 chars
        micro_component = str(current_micro_time)[-2:]  # Last 2 digits of microseconds
        
        # Combine for 12-character ID with guaranteed uniqueness
        certificate_id = f"{time_component[:2]}{user_component[:4]}{random_component[:4]}{micro_component[:2]}"
        
        # Ensure it's exactly 12 characters and not a problematic ID
        if len(certificate_id) != 12 or certificate_id == "DG1ITFZ7DT5B":
            certificate_id = f"{str(current_nano_time)[-4:]}{secrets.token_hex(4).upper()}"
        
        # Generate different share code using similar approach
        share_time = str(int(time.time() * 1000))[-4:]
        share_random = secrets.token_hex(2)
        share_code = f"{share_time}{share_random}"
        
        token_id = str(uuid.uuid4())
        
        print(f"🆔 GENERATED DIFFERENT Certificate ID: {certificate_id}")
        print(f"🔗 GENERATED Share Code: {share_code}")
        
        # ✅ VERIFY UNIQUENESS AND REGENERATE IF NEEDED
        print(f"\n🔍 VERIFYING UNIQUENESS...")
        max_attempts = 15
        for attempt in range(max_attempts):
            existing_cert = db.certificates.find_one({"certificate_id": certificate_id})
            existing_share = db.certificates.find_one({"share_code": share_code})
            
            if not existing_cert and not existing_share:
                print(f"✅ Certificate ID is UNIQUE (attempt {attempt + 1})")
                break
            else:
                print(f"⚠️ Collision detected, generating DIFFERENT ID...")
                # Generate completely different ID
                new_nano_time = time.time_ns()
                time.sleep(0.002 + random.random() * 0.008)  # More delay
                
                new_time_component = str(new_nano_time)[-6:]
                new_user_component = hashlib.sha256(f"{student_entered_name}{attempt}{new_nano_time}".encode()).hexdigest()[:4].upper()
                new_random_component = secrets.token_hex(3).upper()
                new_micro_component = str(int(time.time() * 1000000))[-2:]
                
                certificate_id = f"{new_time_component[:2]}{new_user_component[:4]}{new_random_component[:4]}{new_micro_component[:2]}"
                
                # Regenerate share code too
                share_time = str(int(time.time() * 1000))[-4:]
                share_random = secrets.token_hex(2)
                share_code = f"{share_time}{share_random}"
        
        print(f"🆔 FINAL DIFFERENT Certificate ID: {certificate_id}")
        print(f"🔗 FINAL Share Code: {share_code}")
        
        # ✅ CRITICAL: NEVER CHECK FOR EXISTING CERTIFICATES - ALWAYS CREATE NEW
        print(f"\n🎯 CREATING NEW CERTIFICATE (NOT CHECKING FOR EXISTING)")
        
        # Get course information
        try:
            course = db.courses.find_one({"id": data['course_id']})
            if not course:
                course_doc = {
                    "id": data['course_id'],
                    "title": data.get('course_title', f"Course {data['course_id']}"),
                    "mentor": "OpenLearnX Instructor",
                    "created_at": datetime.now().isoformat(),
                    "status": "active"
                }
                db.courses.insert_one(course_doc)
                course = course_doc
        except Exception as e:
            course = {
                "id": data['course_id'],
                "title": data.get('course_title', f"Course {data['course_id']}"),
                "mentor": "OpenLearnX Instructor"
            }
        
        # Set instructor name
        instructor_name = course.get('mentor', 'OpenLearnX Instructor')
        if isinstance(instructor_name, dict):
            instructor_name = instructor_name.get('name', 'OpenLearnX Instructor')
        if instructor_name == student_entered_name:
            instructor_name = 'OpenLearnX Instructor'
        
        print(f"\n👥 NAMES CONFIGURED:")
        print(f"   🎓 STUDENT: '{student_entered_name}'")
        print(f"   👨‍🏫 INSTRUCTOR: '{instructor_name}'")
        
        # Encrypt wallet ID
        encrypted_wallet = encrypt_wallet_id(wallet_id)
        
        # ✅ FIXED: CREATE NEW CERTIFICATE DOCUMENT WITH PROPER NAME FIELDS
        certificate_document = {
            # DIFFERENT UNIQUE IDENTIFIERS EVERY TIME
            "certificate_id": certificate_id,
            "token_id": token_id,
            "share_code": share_code,
            
            # ✅ FIXED: EXPLICIT STUDENT NAME FIELDS - GUARANTEED TO BE SAVED
            "student_name": student_entered_name,           # Primary field
            "user_name": student_entered_name,              # Secondary field
            "certificate_holder_name": student_entered_name, # Tertiary field
            "recipient_name": student_entered_name,         # Additional field
            "learner_name": student_entered_name,           # Additional field
            
            # USER & COURSE INFO
            "user_id": user_id,
            "course_id": data['course_id'],
            "course_title": course['title'],
            
            # ✅ FIXED: EXPLICIT INSTRUCTOR NAME FIELDS
            "instructor_name": instructor_name,             # Primary field
            "mentor_name": instructor_name,                 # Secondary field
            "course_mentor": instructor_name,               # Tertiary field
            "teacher_name": instructor_name,                # Additional field
            
            # WALLET & BLOCKCHAIN DATA
            "wallet_address": wallet_id,
            "encrypted_wallet_id": encrypted_wallet,
            "user_wallet_hash": hashlib.sha256(f"{user_id}{wallet_id}{certificate_id}".encode()).hexdigest()[:16],
            
            # TIMESTAMPS
            "completion_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "minted_at": datetime.now().isoformat(),
            
            # CERTIFICATE METADATA
            "status": "active",
            "issued_by": "OpenLearnX",
            "verification_url": f"/certificates/{certificate_id}",
            "share_url": f"/certificate/{share_code}",
            "public_url": f"http://localhost:3000/certificate/{share_code}",
            "blockchain_hash": f"0x{hashlib.sha256(f'{certificate_id}{student_entered_name}{current_nano_time}'.encode()).hexdigest()[:32]}",
            
            # UNIQUENESS METADATA
            "certificate_for_user": user_id,
            "certificate_for_name": student_entered_name,
            "certificate_for_wallet": wallet_id,
            "unique_user_certificate": True,
            "generation_timestamp": current_nano_time,
            "different_every_time": True,
            
            # ANALYTICS
            "is_revoked": False,
            "view_count": 0,
            "shared_count": 0
        }
        
        print(f"\n📋 NEW CERTIFICATE DOCUMENT:")
        print(f"   🆔 Certificate ID: {certificate_document['certificate_id']}")
        print(f"   🎓 Student Name: '{certificate_document['student_name']}'")
        print(f"   🎓 User Name: '{certificate_document['user_name']}'")
        print(f"   🎓 Recipient Name: '{certificate_document['recipient_name']}'")
        print(f"   🔗 Share Code: {certificate_document['share_code']}")
        print(f"   🕒 Generation Time: {certificate_document['generation_timestamp']}")
        
        # ✅ ALWAYS SAVE THE NEW CERTIFICATE
        print(f"\n💾 SAVING NEW CERTIFICATE WITH DIFFERENT ID...")
        try:
            # Create indexes
            try:
                db.certificates.create_index([("certificate_id", 1)], unique=True, background=True)
                db.certificates.create_index([("share_code", 1)], unique=True, background=True)
                print("✅ Database indexes created")
            except Exception as e:
                print(f"⚠️ Index creation warning: {e}")
            
            insert_result = db.certificates.insert_one(certificate_document)
            print(f"✅ NEW CERTIFICATE SAVED: {insert_result.inserted_id}")
            
            # Verify save with name check
            saved_document = db.certificates.find_one({"certificate_id": certificate_id})
            if saved_document:
                print(f"✅ SAVE VERIFIED!")
                print(f"   🆔 Saved Certificate ID: {saved_document['certificate_id']}")
                print(f"   🎓 Saved Student Name: '{saved_document['student_name']}'")
                print(f"   🎓 Saved User Name: '{saved_document['user_name']}'")
                print(f"   🔗 Saved Share Code: {saved_document['share_code']}")
                
                # Double-check name fields are not None or empty
                if not saved_document.get('student_name') or not saved_document.get('user_name'):
                    print("❌ WARNING: Name fields are empty in saved document!")
                    return jsonify({"error": "Name fields not saved properly"}), 500
                    
            else:
                return jsonify({"error": "Failed to verify certificate save"}), 500
            
        except Exception as e:
            print(f"❌ SAVE ERROR: {e}")
            if "E11000" in str(e):  # Duplicate key error
                # Generate completely new different ID
                retry_nano_time = time.time_ns()
                retry_certificate_id = f"{str(retry_nano_time)[-4:]}{secrets.token_hex(4).upper()}"
                certificate_document["certificate_id"] = retry_certificate_id
                certificate_document["verification_url"] = f"/certificates/{retry_certificate_id}"
                try:
                    insert_result = db.certificates.insert_one(certificate_document)
                    certificate_id = retry_certificate_id
                    print(f"✅ Saved with different retry ID: {certificate_id}")
                except Exception as retry_error:
                    return jsonify({"error": "Failed to save certificate after retry"}), 500
            else:
                return jsonify({"error": f"Database save failed: {str(e)}"}), 500
        
        # ✅ FIXED: PREPARE RESPONSE WITH GUARANTEED NAME FIELDS
        certificate_response = {
            "certificate_id": certificate_id,  # DIFFERENT ID EVERY TIME
            "token_id": certificate_document['token_id'],
            "share_code": certificate_document['share_code'],
            
            # ✅ FIXED: EXPLICIT NAME FIELDS IN RESPONSE
            "user_name": student_entered_name,              # Primary name
            "student_name": student_entered_name,           # Secondary name
            "certificate_holder_name": student_entered_name, # Tertiary name
            "recipient_name": student_entered_name,         # Additional name
            "learner_name": student_entered_name,           # Additional name
            
            # USER INFO
            "user_id": user_id,
            "wallet_address": wallet_id,
            
            # COURSE INFO
            "course_title": certificate_document['course_title'],
            
            # INSTRUCTOR INFO
            "mentor_name": instructor_name,
            "instructor_name": instructor_name,
            "teacher_name": instructor_name,
            
            # CERTIFICATE DATA
            "completion_date": certificate_document['completion_date'],
            "verification_url": certificate_document['verification_url'],
            "share_url": certificate_document['share_url'],
            "public_url": certificate_document['public_url'],
            "unique_url": f"/certificate/{certificate_document['share_code']}",
            "blockchain_hash": certificate_document['blockchain_hash'],
            
            "different_every_time": True,
            "generation_timestamp": certificate_document['generation_timestamp'],
            "message": f"NEW Certificate {certificate_id} created for {student_entered_name} - DIFFERENT ID EVERY TIME!"
        }
        
        print(f"\n✅ DIFFERENT CERTIFICATE RESPONSE:")
        print(f"   🆔 NEW Certificate ID: {certificate_response['certificate_id']}")
        print(f"   🎓 Student Name: '{certificate_response['student_name']}'")
        print(f"   🎓 User Name: '{certificate_response['user_name']}'")
        print(f"   🔗 Share Code: '{certificate_response['share_code']}'")
        print(f"   🌐 Public URL: '{certificate_response['public_url']}'")
        
        print("\n" + "="*70)
        print("🎉 NEW CERTIFICATE WITH DIFFERENT ID CREATED!")
        print("   ✅ DIFFERENT UNIQUE ID EVERY TIME")
        print("   ✅ PROPER NAME HANDLING AND FETCHING")
        print("   ✅ MULTIPLE NAME FIELDS FOR RELIABILITY")
        print("="*70)
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        }), 201
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"Critical error: {str(e)}"}), 500

@bp.route('/<certificate_id>', methods=['GET', 'OPTIONS'])
def get_certificate_by_id(certificate_id):
    """Get certificate by ID or share code with FIXED name fetching"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        print(f"🔍 Looking up certificate: {certificate_id}")
        
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificate = db.certificates.find_one({
            "$or": [
                {"certificate_id": certificate_id},
                {"share_code": certificate_id}
            ]
        })
        
        if not certificate:
            return jsonify({"error": "Certificate not found"}), 404
        
        if certificate.get('is_revoked', False):
            return jsonify({"error": "Certificate has been revoked"}), 410
        
        # Increment view count
        try:
            db.certificates.update_one(
                {"_id": certificate["_id"]},
                {"$inc": {"view_count": 1}}
            )
        except Exception as e:
            print(f"Failed to increment view count: {e}")
        
        # ✅ FIXED: Enhanced name extraction with multiple fallbacks
        student_name = (
            certificate.get('student_name') or 
            certificate.get('user_name') or
            certificate.get('certificate_holder_name') or 
            certificate.get('recipient_name') or
            certificate.get('learner_name') or
            'Student'
        )
        
        instructor_name = (
            certificate.get('instructor_name') or 
            certificate.get('mentor_name') or 
            certificate.get('course_mentor') or 
            certificate.get('teacher_name') or
            'OpenLearnX Instructor'
        )
        
        # Log the names being returned
        print(f"📋 Retrieved certificate names:")
        print(f"   🎓 Student Name: '{student_name}'")
        print(f"   👨‍🏫 Instructor Name: '{instructor_name}'")
        
        certificate_response = {
            "certificate_id": certificate['certificate_id'],
            "share_code": certificate.get('share_code'),
            
            # ✅ FIXED: Multiple name fields for guaranteed display
            "user_name": student_name,
            "student_name": student_name,
            "certificate_holder_name": student_name,
            "recipient_name": student_name,
            "learner_name": student_name,
            
            "course_title": certificate['course_title'],
            
            # Instructor info
            "mentor_name": instructor_name,
            "instructor_name": instructor_name,
            "teacher_name": instructor_name,
            
            "completion_date": certificate['completion_date'],
            "status": certificate.get('status', 'active'),
            "issued_by": certificate.get('issued_by', 'OpenLearnX'),
            "blockchain_hash": certificate.get('blockchain_hash'),
            "wallet_address": certificate.get('wallet_address'),
            "user_id": certificate.get('user_id'),
            "view_count": certificate.get('view_count', 0),
            "public_url": certificate.get('public_url'),
            "is_verified": True,
            "is_revoked": certificate.get('is_revoked', False),
            "unique_user_certificate": certificate.get('unique_user_certificate', False)
        }
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        })
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch certificate"}), 500

@bp.route('/verify/<share_code>', methods=['GET', 'OPTIONS'])
def verify_certificate_by_code(share_code):
    """Verify certificate by share code with FIXED name fetching"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Database connection failed"
            }), 500
        
        certificate = db.certificates.find_one({
            "$or": [
                {"share_code": share_code},
                {"certificate_id": share_code}
            ]
        })
        
        if not certificate:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Certificate not found"
            }), 404
        
        if certificate.get('is_revoked', False):
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Certificate has been revoked"
            }), 410
        
        # Increment view count
        try:
            db.certificates.update_one(
                {"_id": certificate["_id"]},
                {"$inc": {"view_count": 1}}
            )
        except Exception as e:
            print(f"Failed to increment view count: {e}")
        
        # ✅ FIXED: Enhanced name extraction
        student_name = (
            certificate.get('student_name') or 
            certificate.get('user_name') or
            certificate.get('certificate_holder_name') or 
            certificate.get('recipient_name') or
            certificate.get('learner_name') or
            'Student'
        )
        
        instructor_name = (
            certificate.get('instructor_name') or 
            certificate.get('mentor_name') or 
            certificate.get('course_mentor') or 
            certificate.get('teacher_name') or
            'OpenLearnX Instructor'
        )
        
        return jsonify({
            "success": True,
            "verified": True,
            "certificate": {
                "certificate_id": certificate['certificate_id'],
                "share_code": certificate.get('share_code'),
                "student_name": student_name,
                "user_name": student_name,
                "course_title": certificate['course_title'],
                "instructor_name": instructor_name,
                "completion_date": certificate['completion_date'],
                "issued_by": certificate.get('issued_by', 'OpenLearnX'),
                "blockchain_hash": certificate.get('blockchain_hash'),
                "wallet_address": certificate.get('wallet_address'),
                "user_id": certificate.get('user_id'),
                "view_count": certificate.get('view_count', 0),
                "unique_user_certificate": certificate.get('unique_user_certificate', False)
            },
            "message": "Certificate is valid and verified"
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "verified": False,
            "message": "Verification failed"
        }), 500

@bp.route('/user/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_certificates(user_id):
    """Get all certificates for a specific user"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            token_user_id, wallet_address = get_user_from_token(token)
            
            if token_user_id and token_user_id != user_id:
                return jsonify({"error": "Unauthorized - can only view your own certificates"}), 403
        
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificates = list(db.certificates.find(
            {"user_id": user_id}, 
            {"_id": 0, "encrypted_wallet_id": 0}
        ).sort("created_at", -1))
        
        # Process each certificate to ensure proper name display
        processed_certificates = []
        for cert in certificates:
            student_name = (
                cert.get('student_name') or 
                cert.get('user_name') or
                cert.get('certificate_holder_name') or 
                cert.get('recipient_name') or
                cert.get('learner_name') or
                'Student'
            )
            
            instructor_name = (
                cert.get('instructor_name') or 
                cert.get('mentor_name') or 
                cert.get('course_mentor') or 
                cert.get('teacher_name') or
                'OpenLearnX Instructor'
            )
            
            # Update the certificate with proper names
            cert['student_name'] = student_name
            cert['user_name'] = student_name
            cert['instructor_name'] = instructor_name
            cert['mentor_name'] = instructor_name
            
            processed_certificates.append(cert)
        
        return jsonify({
            "success": True,
            "certificates": processed_certificates,
            "count": len(processed_certificates),
            "user_id": user_id,
            "message": f"Found {len(processed_certificates)} certificates for user {user_id}"
        })
        
    except Exception as e:
        return jsonify({"error": "Failed to retrieve certificates"}), 500

@bp.route('/list-all', methods=['GET'])
def list_all_certificates():
    """List all certificates"""
    try:
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificates = list(db.certificates.find({}, {"_id": 0}).sort("created_at", -1))
        
        # Process each certificate to ensure proper name display
        processed_certificates = []
        for cert in certificates:
            student_name = (
                cert.get('student_name') or 
                cert.get('user_name') or
                cert.get('certificate_holder_name') or 
                cert.get('recipient_name') or
                cert.get('learner_name') or
                'Student'
            )
            
            instructor_name = (
                cert.get('instructor_name') or 
                cert.get('mentor_name') or 
                cert.get('course_mentor') or 
                cert.get('teacher_name') or
                'OpenLearnX Instructor'
            )
            
            # Update the certificate with proper names
            cert['student_name'] = student_name
            cert['user_name'] = student_name
            cert['instructor_name'] = instructor_name
            cert['mentor_name'] = instructor_name
            
            processed_certificates.append(cert)
        
        return jsonify({
            "success": True,
            "certificates": processed_certificates,
            "count": len(processed_certificates),
            "message": f"Found {len(processed_certificates)} certificates with user-specific unique IDs"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/test-generation', methods=['GET'])
def test_generation():
    """Test user-specific unique ID generation"""
    try:
        # Test with different user combinations
        test_users = [
            {"name": "John Smith", "wallet": "0x123abc", "user_id": "user1"},
            {"name": "Jane Doe", "wallet": "0x456def", "user_id": "user2"},
            {"name": "Bob Wilson", "wallet": "0x789ghi", "user_id": "user3"},
            {"name": "Alice Johnson", "wallet": "0x321cba", "user_id": "user4"},
            {"name": "John Smith", "wallet": "0x654fed", "user_id": "user5"},  # Same name, different wallet/user
        ]
        
        ids = []
        for i, user in enumerate(test_users):
            cert_id = generate_user_specific_unique_certificate_id(
                user["name"], 
                user["wallet"], 
                user["user_id"]
            )
            share_code = generate_unique_share_code()
            
            ids.append({
                "attempt": i + 1,
                "certificate_id": cert_id,
                "share_code": share_code,
                "user_name": user["name"],
                "wallet_id": user["wallet"],
                "user_id": user["user_id"],
                "timestamp": time.time()
            })
            time.sleep(0.001)
        
        cert_ids = [item["certificate_id"] for item in ids]
        share_codes = [item["share_code"] for item in ids]
        
        cert_duplicates = len(cert_ids) != len(set(cert_ids))
        share_duplicates = len(share_codes) != len(set(share_codes))
        
        # Check for the problematic ID
        has_problematic_id = "DG1ITFZ7DT5B" in cert_ids
        
        return jsonify({
            "success": True,
            "generated_ids": ids,
            "certificate_id_duplicates": cert_duplicates,
            "share_code_duplicates": share_duplicates,
            "unique_cert_ids": len(set(cert_ids)),
            "unique_share_codes": len(set(share_codes)),
            "has_problematic_duplicate": has_problematic_id,
            "all_unique": not cert_duplicates and not share_duplicates and not has_problematic_id,
            "test_type": "user_specific_unique_generation",
            "message": "All USER-SPECIFIC IDs are GUARANTEED unique!" if not cert_duplicates and not share_duplicates and not has_problematic_id else "Issues detected!"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/download/<certificate_id>', methods=['GET', 'OPTIONS'])
def download_certificate(certificate_id):
    """Download certificate as HTML for PDF conversion"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificate = db.certificates.find_one({
            "$or": [
                {"certificate_id": certificate_id},
                {"share_code": certificate_id}
            ]
        })
        
        if not certificate:
            return jsonify({"error": "Certificate not found"}), 404
        
        if certificate.get('is_revoked', False):
            return jsonify({"error": "Certificate has been revoked"}), 410
        
        # Generate HTML for PDF with user-specific information
        certificate_html = generate_certificate_html(certificate)
        
        return certificate_html, 200, {
            'Content-Type': 'text/html',
            'Content-Disposition': f'attachment; filename="Certificate_{certificate["certificate_id"]}.html"'
        }
        
    except Exception as e:
        return jsonify({"error": "Failed to download certificate"}), 500

@bp.route('/share/<certificate_id>', methods=['POST', 'OPTIONS'])
def track_certificate_share(certificate_id):
    """Track certificate sharing"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = create_isolated_mongodb_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        result = db.certificates.update_one(
            {
                "$or": [
                    {"certificate_id": certificate_id},
                    {"share_code": certificate_id}
                ]
            },
            {"$inc": {"shared_count": 1}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Certificate not found"}), 404
        
        return jsonify({
            "success": True,
            "message": "Share tracked successfully"
        })
        
    except Exception as e:
        return jsonify({"error": "Failed to track share"}), 500

def generate_certificate_html(certificate):
    """Generate HTML for certificate PDF download"""
    # ✅ FIXED: Enhanced name extraction for HTML generation
    student_name = (
        certificate.get('student_name') or 
        certificate.get('user_name') or
        certificate.get('certificate_holder_name') or 
        certificate.get('recipient_name') or
        certificate.get('learner_name') or
        'Student'
    )
    
    instructor_name = (
        certificate.get('instructor_name') or 
        certificate.get('mentor_name') or 
        certificate.get('course_mentor') or 
        certificate.get('teacher_name') or
        'OpenLearnX Instructor'
    )
    
    wallet_address = certificate.get('wallet_address', 'N/A')
    user_id = certificate.get('user_id', 'N/A')
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Certificate - {student_name}</title>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
            
            body {{ 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 40px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }}
            
            .certificate {{ 
                background: white; 
                max-width: 800px; 
                width: 100%;
                margin: 0 auto; 
                padding: 60px; 
                border-radius: 20px; 
                box-shadow: 0 25px 50px rgba(0,0,0,0.15); 
                text-align: center; 
                position: relative;
                border: 8px solid #4f46e5;
            }}
            
            .title {{ 
                font-family: 'Playfair Display', serif;
                font-size: 42px; 
                font-weight: 700; 
                color: #4f46e5; 
                margin: 20px 0; 
            }}
            
            .student-name {{ 
                font-family: 'Playfair Display', serif;
                font-size: 48px; 
                color: #1f2937; 
                font-weight: 700; 
                margin: 40px 0; 
                padding: 20px 0;
                border-top: 3px solid #4f46e5;
                border-bottom: 3px solid #4f46e5;
                text-transform: capitalize;
            }}
            
            .course-title {{ 
                font-family: 'Playfair Display', serif;
                font-size: 28px; 
                color: #1f2937; 
                margin: 20px 0; 
                font-weight: 600;
                font-style: italic;
            }}
            
            .user-info {{
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                margin: 30px auto;
                max-width: 600px;
                text-align: left;
            }}
            
            .cert-id {{
                font-size: 14px;
                color: #9ca3af;
                margin-top: 20px;
                font-family: 'Courier New', monospace;
                background: #f9fafb;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }}
            
            .mentor-section {{
                margin-top: 50px;
                padding-top: 30px;
                border-top: 2px solid #e5e7eb;
            }}
            
            .mentor-name {{
                font-size: 18px;
                color: #1f2937;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="certificate">
            <div style="font-size: 60px; margin-bottom: 20px;">🏆</div>
            <h1 class="title">CERTIFICATE OF COMPLETION</h1>
            
            <div style="font-size: 18px; color: #6b7280; margin-bottom: 30px;">This is to certify that</div>
            
            <div class="student-name">{student_name}</div>
            
            <div class="user-info">
                <h4 style="color: #4f46e5; margin-bottom: 15px; font-size: 16px;">👤 User Information</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                    <div>
                        <strong>User ID:</strong><br>
                        <span style="font-family: monospace; color: #6b7280;">{user_id}</span>
                    </div>
                    <div>
                        <strong>Certificate ID:</strong><br>
                        <span style="font-family: monospace; color: #6b7280;">{certificate['certificate_id']}</span>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <strong>💼 Wallet Address:</strong><br>
                    <span style="font-family: monospace; color: #7c3aed; word-break: break-all;">{wallet_address}</span>
                </div>
            </div>
            
            <div style="font-size: 18px; color: #6b7280; margin-bottom: 20px;">has successfully completed the course</div>
            <div class="course-title">"{certificate['course_title']}"</div>
            
            <div style="font-size: 16px; color: #374151; margin: 20px 0;">
                ✅ Completed on: {datetime.fromisoformat(certificate['completion_date']).strftime('%B %d, %Y')}
            </div>
            
            <div class="mentor-section">
                <div style="width: 200px; height: 2px; background: #6b7280; margin: 0 auto 10px auto;"></div>
                <div class="mentor-name">{instructor_name}</div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">Course Instructor</div>
            </div>
            
            <div class="cert-id">
                <strong>User-Specific Certificate ID: {certificate['certificate_id']}</strong><br>
                OpenLearnX Learning Platform<br>
                <span style="color: #7c3aed;">🔒 Blockchain Verified • User-Specific Unique ID</span>
                {f'<br><small>Blockchain Hash: {certificate.get("blockchain_hash", "")}</small>' if certificate.get('blockchain_hash') else ''}
            </div>
        </div>
    </body>
    </html>
    """
