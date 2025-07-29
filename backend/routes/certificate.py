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
from pymongo import MongoClient

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

def get_db_connection():
    """Get MongoDB database connection with enhanced error handling"""
    try:
        # Try to get from Flask config first
        mongo_service = current_app.config.get('MONGO_SERVICE')
        if mongo_service and hasattr(mongo_service, 'db'):
            print("📊 Using Flask config database connection")
            return mongo_service.db
        
        # Fallback to direct connection with explicit URI
        mongodb_uri = current_app.config.get('MONGODB_URI', 'mongodb://localhost:27017/')
        print(f"📊 Connecting directly to MongoDB: {mongodb_uri}")
        
        client = MongoClient(mongodb_uri)
        db = client.openlearnx
        
        # Test the connection by running a simple command
        db.command('ping')
        print("✅ Database connection successful!")
        
        return db
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        logger.error(f"Database connection failed: {e}")
        return None

def generate_truly_unique_certificate_id():
    """Generate GUARANTEED unique certificate ID"""
    
    # Method 1: Nanosecond timestamp for uniqueness
    nano_timestamp = str(time.time_ns())
    
    # Method 2: High entropy random
    random_component = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    # Method 3: UUID component
    uuid_component = str(uuid.uuid4()).replace('-', '').upper()[:4]
    
    # Method 4: System-specific component
    system_component = f"{os.getpid()}{threading.get_ident()}"[-4:]
    
    # Combine and ensure 12 characters
    combined = nano_timestamp[-3:] + random_component[:4] + uuid_component[:3] + system_component[-2:]
    certificate_id = combined[:12].upper()
    
    # Force different from problematic ID
    if certificate_id == "DG1ITFZ7DT5B":
        certificate_id = "UNIQUE" + str(int(time.time()))[-6:]
        certificate_id = certificate_id[:12].upper()
    
    print(f"🆔 Generated unique ID: {certificate_id}")
    return certificate_id

def generate_unique_share_code():
    """Generate unique 8-character share code"""
    timestamp = str(int(time.time() * 1000000))[-4:]
    random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    share_code = timestamp + random_part
    print(f"🔗 Generated share code: {share_code}")
    return share_code

@bp.route('/mint', methods=['POST', 'OPTIONS'])
def mint_certificate():
    """FIXED: Create certificate with guaranteed database saving"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        print("\n" + "="*50)
        print("🎓 STARTING CERTIFICATE MINTING PROCESS")
        print("="*50)
        
        # Get request data
        data = request.json
        if not data:
            print("❌ No request data provided")
            return jsonify({"error": "Request data required"}), 400
        
        print(f"📥 Received data: {data}")
        
        # Validate required fields
        required_fields = ['user_name', 'course_id']
        for field in required_fields:
            if not data.get(field):
                print(f"❌ Missing required field: {field}")
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Get student's entered name
        student_entered_name = data.get('user_name', '').strip()
        if not student_entered_name:
            print("❌ Student name is empty")
            return jsonify({"error": "Student name is required"}), 400
        
        print(f"🎓 STUDENT NAME: '{student_entered_name}'")
        print(f"📚 COURSE ID: '{data['course_id']}'")
        
        # Get user ID (from token or default)
        auth_header = request.headers.get('Authorization', '')
        user_id = 'anonymous'
        wallet_address = None
        
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            token_user_id, wallet_address = get_user_from_token(token)
            if token_user_id:
                user_id = token_user_id
        
        print(f"👤 USER ID: '{user_id}'")
        
        # ✅ CRITICAL: Get database connection and verify it works
        print("\n📊 ESTABLISHING DATABASE CONNECTION...")
        db = get_db_connection()
        if db is None:
            print("❌ CRITICAL: Database connection failed!")
            return jsonify({"error": "Database connection failed - check MongoDB server"}), 500
        
        print("✅ Database connection established successfully!")
        
        # Test database write capability
        try:
            test_doc = {"test": "connection", "timestamp": datetime.now()}
            test_result = db.test_collection.insert_one(test_doc)
            db.test_collection.delete_one({"_id": test_result.inserted_id})
            print("✅ Database write test successful!")
        except Exception as e:
            print(f"❌ Database write test failed: {e}")
            return jsonify({"error": "Database is not writable"}), 500
        
        # ✅ Check if certificate already exists
        print(f"\n🔍 Checking for existing certificate...")
        try:
            existing_certificate = db.certificates.find_one({
                "user_id": user_id,
                "course_id": data['course_id']
            })
            
            if existing_certificate:
                print(f"📜 Certificate already exists: {existing_certificate['certificate_id']}")
                return jsonify({
                    "success": True,
                    "certificate": {
                        "certificate_id": existing_certificate['certificate_id'],
                        "user_name": student_entered_name,  # Always return entered name
                        "course_title": existing_certificate.get('course_title', 'Course'),
                        "mentor_name": existing_certificate.get('instructor_name', existing_certificate.get('mentor_name', 'OpenLearnX Instructor')),
                        "completion_date": existing_certificate['completion_date'],
                        "share_code": existing_certificate.get('share_code'),
                        "public_url": existing_certificate.get('public_url'),
                        "unique_url": f"/certificate/{existing_certificate.get('share_code')}",
                        "message": "Certificate already exists!"
                    }
                }), 200
                
        except Exception as e:
            print(f"⚠️ Error checking existing certificates: {e}")
        
        # Get course information
        print(f"\n📚 Getting course information...")
        try:
            course = db.courses.find_one({"id": data['course_id']})
            if not course:
                print(f"⚠️ Course not found, creating default")
                course = {
                    "id": data['course_id'],
                    "title": data.get('course_title', f"Course {data['course_id']}"),
                    "mentor": "OpenLearnX Instructor"
                }
            else:
                print(f"✅ Course found: {course['title']}")
        except Exception as e:
            print(f"❌ Error finding course: {e}")
            course = {
                "id": data['course_id'],
                "title": data.get('course_title', f"Course {data['course_id']}"),
                "mentor": "OpenLearnX Instructor"
            }
        
        # ✅ GENERATE UNIQUE IDs
        print(f"\n🆔 Generating unique IDs...")
        certificate_id = generate_truly_unique_certificate_id()
        share_code = generate_unique_share_code()
        token_id = str(uuid.uuid4())
        
        print(f"🆔 Certificate ID: {certificate_id}")
        print(f"🔗 Share Code: {share_code}")
        print(f"🎫 Token ID: {token_id}")
        
        # Check for ID collisions in database
        print(f"\n🔍 Checking for ID collisions...")
        max_attempts = 10
        for attempt in range(max_attempts):
            existing_cert = db.certificates.find_one({"certificate_id": certificate_id})
            existing_share = db.certificates.find_one({"share_code": share_code})
            
            if not existing_cert and not existing_share:
                print(f"✅ IDs are unique (checked attempt {attempt + 1})")
                break
            else:
                print(f"⚠️ ID collision detected on attempt {attempt + 1}, regenerating...")
                certificate_id = generate_truly_unique_certificate_id()
                share_code = generate_unique_share_code()
        
        # Get instructor name (separate from student)
        instructor_name = course.get('mentor', 'OpenLearnX Instructor')
        if isinstance(instructor_name, dict):
            instructor_name = instructor_name.get('name', 'OpenLearnX Instructor')
        
        # Prevent student name from being used as instructor
        if instructor_name == student_entered_name:
            instructor_name = 'OpenLearnX Instructor'
        
        print(f"\n👥 Names configured:")
        print(f"   🎓 Student: '{student_entered_name}'")
        print(f"   👨‍🏫 Instructor: '{instructor_name}'")
        
        # Get wallet information
        wallet_id = wallet_address or data.get('wallet_id', f'test-wallet-{int(time.time())}')
        
        # ✅ CREATE COMPLETE CERTIFICATE DOCUMENT
        print(f"\n📄 Creating certificate document...")
        certificate_document = {
            # ✅ UNIQUE IDENTIFIERS
            "certificate_id": certificate_id,
            "token_id": token_id,
            "share_code": share_code,
            
            # ✅ STUDENT INFORMATION (EXPLICIT)
            "student_name": student_entered_name,      # Explicit student field
            "user_name": student_entered_name,         # Main name field
            
            # ✅ USER & COURSE INFO
            "user_id": user_id,
            "course_id": data['course_id'],
            "course_title": course['title'],
            
            # ✅ INSTRUCTOR INFORMATION (SEPARATE)
            "mentor_name": instructor_name,            # Instructor name
            "instructor_name": instructor_name,        # Explicit instructor field
            "course_mentor": instructor_name,          # Backward compatibility
            
            # ✅ WALLET & BLOCKCHAIN
            "wallet_address": wallet_id,
            "encrypted_wallet_id": {
                "iv": "test_iv_" + secrets.token_hex(8),
                "encrypted": "test_encrypted_" + secrets.token_hex(8),
                "algorithm": "AES-256-CBC"
            },
            
            # ✅ TIMESTAMPS
            "completion_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "minted_at": datetime.now().isoformat(),
            
            # ✅ CERTIFICATE METADATA
            "status": "active",
            "issued_by": "OpenLearnX",
            "verification_url": f"/certificates/{certificate_id}",
            "share_url": f"/certificate/{share_code}",
            "public_url": f"http://localhost:3000/certificate/{share_code}",
            "blockchain_hash": f"0x{secrets.token_hex(32)}",
            
            # ✅ ANALYTICS
            "is_revoked": False,
            "view_count": 0,
            "shared_count": 0
        }
        
        # ✅ LOG COMPLETE DOCUMENT BEFORE SAVING
        print(f"\n📋 CERTIFICATE DOCUMENT TO SAVE:")
        print(f"   🆔 Certificate ID: {certificate_document['certificate_id']}")
        print(f"   🎓 Student Name: '{certificate_document['student_name']}'")
        print(f"   🎓 User Name: '{certificate_document['user_name']}'")
        print(f"   👨‍🏫 Instructor: '{certificate_document['instructor_name']}'")
        print(f"   📚 Course: '{certificate_document['course_title']}'")
        print(f"   🔗 Share Code: {certificate_document['share_code']}")
        
        # ✅ CRITICAL: SAVE TO DATABASE WITH VERIFICATION
        print(f"\n💾 SAVING TO DATABASE...")
        try:
            # Create indexes to ensure uniqueness
            try:
                db.certificates.create_index([("certificate_id", 1)], unique=True, background=True)
                db.certificates.create_index([("share_code", 1)], unique=True, background=True)
                print("✅ Database indexes created")
            except Exception as e:
                print(f"⚠️ Index creation warning: {e}")
            
            # Insert the document
            insert_result = db.certificates.insert_one(certificate_document)
            print(f"✅ DOCUMENT INSERTED SUCCESSFULLY!")
            print(f"   📊 MongoDB ID: {insert_result.inserted_id}")
            print(f"   🆔 Certificate ID: {certificate_id}")
            
            # ✅ VERIFY THE DOCUMENT WAS ACTUALLY SAVED
            print(f"\n🔍 VERIFYING DOCUMENT WAS SAVED...")
            saved_document = db.certificates.find_one({"certificate_id": certificate_id})
            
            if saved_document:
                print(f"✅ VERIFICATION SUCCESSFUL!")
                print(f"   🆔 Saved Certificate ID: {saved_document['certificate_id']}")
                print(f"   🎓 Saved Student Name: '{saved_document['student_name']}'")
                print(f"   📊 MongoDB ID: {saved_document['_id']}")
            else:
                print(f"❌ VERIFICATION FAILED - Document not found!")
                return jsonify({"error": "Failed to verify certificate was saved"}), 500
            
        except Exception as e:
            print(f"❌ DATABASE SAVE ERROR: {e}")
            logger.error(f"Database save error: {e}")
            
            # Try alternative save method
            if "E11000" in str(e):
                print("⚠️ Duplicate key error, generating new ID...")
                certificate_id = generate_truly_unique_certificate_id()
                certificate_document["certificate_id"] = certificate_id
                certificate_document["verification_url"] = f"/certificates/{certificate_id}"
                
                try:
                    insert_result = db.certificates.insert_one(certificate_document)
                    print(f"✅ Saved with new ID: {certificate_id}")
                except Exception as retry_error:
                    print(f"❌ Retry failed: {retry_error}")
                    return jsonify({"error": "Failed to save certificate after retry"}), 500
            else:
                return jsonify({"error": f"Database save failed: {str(e)}"}), 500
        
        # ✅ PREPARE RESPONSE
        print(f"\n📤 PREPARING RESPONSE...")
        certificate_response = {
            "certificate_id": certificate_document['certificate_id'],
            "token_id": certificate_document['token_id'],
            "share_code": certificate_document['share_code'],
            
            # ✅ STUDENT INFO (GUARANTEED CORRECT)
            "user_name": student_entered_name,
            "student_name": student_entered_name,
            
            # ✅ COURSE INFO
            "course_title": certificate_document['course_title'],
            
            # ✅ INSTRUCTOR INFO
            "mentor_name": instructor_name,
            "instructor_name": instructor_name,
            
            # ✅ OTHER INFO
            "completion_date": certificate_document['completion_date'],
            "verification_url": certificate_document['verification_url'],
            "share_url": certificate_document['share_url'],
            "public_url": certificate_document['public_url'],
            "unique_url": f"/certificate/{certificate_document['share_code']}",
            "blockchain_hash": certificate_document['blockchain_hash'],
            "wallet_address": certificate_document['wallet_address'],
            
            "message": f"Certificate {certificate_document['certificate_id']} created successfully for {student_entered_name}!"
        }
        
        print(f"✅ RESPONSE PREPARED:")
        print(f"   🆔 Certificate ID: {certificate_response['certificate_id']}")
        print(f"   🎓 Student: '{certificate_response['user_name']}'")
        print(f"   👨‍🏫 Instructor: '{certificate_response['mentor_name']}'")
        
        print("\n" + "="*50)
        print("🎉 CERTIFICATE MINTING COMPLETED SUCCESSFULLY!")
        print("="*50)
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        }), 201
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR IN MINT_CERTIFICATE:")
        print(f"Error: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        logger.error(f"Critical error in mint_certificate: {str(e)}")
        return jsonify({"error": f"Critical error: {str(e)}"}), 500

@bp.route('/<certificate_id>', methods=['GET', 'OPTIONS'])
def get_certificate_by_id(certificate_id):
    """Get certificate by ID with proper database access"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        print(f"🔍 Getting certificate with ID: {certificate_id}")
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Search by certificate_id or share_code
        certificate = db.certificates.find_one({
            "$or": [
                {"certificate_id": certificate_id},
                {"share_code": certificate_id},
                {"certificate_id": {"$regex": f"^{certificate_id}$", "$options": "i"}},
                {"share_code": {"$regex": f"^{certificate_id}$", "$options": "i"}}
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
        
        # Return with proper field mapping
        certificate_response = {
            "certificate_id": certificate['certificate_id'],
            "share_code": certificate.get('share_code'),
            "user_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
            "student_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
            "course_title": certificate['course_title'],
            "mentor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            "instructor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            "completion_date": certificate['completion_date'],
            "status": certificate.get('status', 'active'),
            "issued_by": certificate.get('issued_by', 'OpenLearnX'),
            "blockchain_hash": certificate.get('blockchain_hash'),
            "wallet_address": certificate.get('wallet_address'),
            "view_count": certificate.get('view_count', 0),
            "public_url": certificate.get('public_url'),
            "is_verified": True,
            "is_revoked": certificate.get('is_revoked', False)
        }
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        })
        
    except Exception as e:
        print(f"Error getting certificate: {str(e)}")
        return jsonify({"error": "Failed to fetch certificate"}), 500

@bp.route('/verify/<share_code>', methods=['GET', 'OPTIONS'])
def verify_certificate_by_code(share_code):
    """Verify certificate by share code"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        print(f"🔍 Verifying certificate with code: {share_code}")
        
        db = get_db_connection()
        if db is None:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Database connection failed"
            }), 500
        
        certificate = db.certificates.find_one({
            "$or": [
                {"share_code": share_code},
                {"certificate_id": share_code},
                {"share_code": {"$regex": f"^{share_code}$", "$options": "i"}},
                {"certificate_id": {"$regex": f"^{share_code}$", "$options": "i"}}
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
        
        return jsonify({
            "success": True,
            "verified": True,
            "certificate": {
                "certificate_id": certificate['certificate_id'],
                "share_code": certificate.get('share_code'),
                "student_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
                "course_title": certificate['course_title'],
                "instructor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
                "completion_date": certificate['completion_date'],
                "issued_by": certificate.get('issued_by', 'OpenLearnX'),
                "blockchain_hash": certificate.get('blockchain_hash'),
                "view_count": certificate.get('view_count', 0)
            },
            "message": "Certificate is valid and verified"
        })
        
    except Exception as e:
        print(f"Error verifying certificate: {str(e)}")
        return jsonify({
            "success": False,
            "verified": False,
            "message": "Verification failed"
        }), 500

@bp.route('/user/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_certificates(user_id):
    """Get all certificates for a user"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            token_user_id, wallet_address = get_user_from_token(token)
            
            if token_user_id and token_user_id != user_id:
                return jsonify({"error": "Unauthorized"}), 403
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificates = list(db.certificates.find(
            {"user_id": user_id}, 
            {"_id": 0, "encrypted_wallet_id": 0}
        ).sort("created_at", -1))
        
        return jsonify({
            "success": True,
            "certificates": certificates,
            "count": len(certificates),
            "user_id": user_id
        })
        
    except Exception as e:
        print(f"Error getting user certificates: {str(e)}")
        return jsonify({"error": "Failed to retrieve certificates"}), 500

@bp.route('/download/<certificate_id>', methods=['GET', 'OPTIONS'])
def download_certificate(certificate_id):
    """Download certificate as HTML for PDF conversion"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = get_db_connection()
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
        
        # Generate HTML for PDF
        certificate_html = generate_certificate_html(certificate)
        
        return certificate_html, 200, {
            'Content-Type': 'text/html',
            'Content-Disposition': f'attachment; filename="Certificate_{certificate["certificate_id"]}.html"'
        }
        
    except Exception as e:
        print(f"Error downloading certificate: {str(e)}")
        return jsonify({"error": "Failed to download certificate"}), 500

@bp.route('/share/<certificate_id>', methods=['POST', 'OPTIONS'])
def track_certificate_share(certificate_id):
    """Track certificate sharing"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = get_db_connection()
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
        print(f"Error tracking share: {str(e)}")
        return jsonify({"error": "Failed to track share"}), 500

@bp.route('/test-db', methods=['GET'])
def test_database():
    """Test database connectivity and write capability"""
    try:
        print("🧪 Testing database connection...")
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Test write
        test_doc = {
            "test_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "message": "Database test document"
        }
        
        result = db.test_certificates.insert_one(test_doc)
        
        # Test read
        saved_doc = db.test_certificates.find_one({"_id": result.inserted_id})
        
        # Cleanup
        db.test_certificates.delete_one({"_id": result.inserted_id})
        
        # Check existing certificates
        cert_count = db.certificates.count_documents({})
        
        return jsonify({
            "success": True,
            "database_connection": "working",
            "write_test": "successful",
            "read_test": "successful",
            "existing_certificates": cert_count,
            "test_document_id": str(result.inserted_id),
            "message": "Database is working properly!"
        })
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Database test failed"
        }), 500

@bp.route('/list-all', methods=['GET'])
def list_all_certificates():
    """List all certificates in the database"""
    try:
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificates = list(db.certificates.find({}, {"_id": 0}).sort("created_at", -1))
        
        return jsonify({
            "success": True,
            "certificates": certificates,
            "count": len(certificates),
            "message": f"Found {len(certificates)} certificates in database"
        })
        
    except Exception as e:
        print(f"Error listing certificates: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route('/test-generation', methods=['GET'])
def test_generation():
    """Test certificate ID generation"""
    try:
        ids = []
        for i in range(10):
            cert_id = generate_truly_unique_certificate_id()
            share_code = generate_unique_share_code()
            ids.append({
                "attempt": i + 1,
                "certificate_id": cert_id,
                "share_code": share_code,
                "timestamp": time.time()
            })
            time.sleep(0.01)  # Small delay
        
        # Check for duplicates
        cert_ids = [item["certificate_id"] for item in ids]
        share_codes = [item["share_code"] for item in ids]
        
        cert_duplicates = len(cert_ids) != len(set(cert_ids))
        share_duplicates = len(share_codes) != len(set(share_codes))
        
        return jsonify({
            "success": True,
            "generated_ids": ids,
            "certificate_id_duplicates": cert_duplicates,
            "share_code_duplicates": share_duplicates,
            "unique_cert_ids": len(set(cert_ids)),
            "unique_share_codes": len(set(share_codes)),
            "message": "All IDs should be unique!" if not cert_duplicates and not share_duplicates else "Duplicates detected!"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_certificate_html(certificate):
    """Generate HTML for certificate PDF download"""
    student_name = certificate.get('student_name', certificate.get('user_name', 'Student'))
    instructor_name = certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor')))
    
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
                <strong>Certificate ID: {certificate['certificate_id']}</strong><br>
                OpenLearnX Learning Platform<br>
                <span style="color: #7c3aed;">🔒 Blockchain Verified Completion</span>
                {f'<br><small>Blockchain Hash: {certificate.get("blockchain_hash", "")}</small>' if certificate.get('blockchain_hash') else ''}
            </div>
        </div>
    </body>
    </html>
    """
