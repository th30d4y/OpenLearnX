from flask import Blueprint, request, jsonify
from datetime import datetime
import os
import uuid
import time
import secrets
import string
import logging
from bson import ObjectId
from pymongo import MongoClient

# Import your certificate manager
from models.certificate import CertificateManager

bp = Blueprint('certificates', __name__)
cert_manager = CertificateManager()

# Set up logging
logger = logging.getLogger(__name__)

# ✅ FIXED: Database connection function
def get_db():
    """Get MongoDB database connection"""
    try:
        client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
        db = client.openlearnx
        # Test the connection
        db.command('ismaster')
        return db
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

@bp.route("/certificates", methods=["POST", "OPTIONS"])
def create_certificate():
    """Create a new certificate with GUARANTEED unique ID and fixed student name handling"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        data = request.json
        logger.info(f"📝 Certificate creation request: {data}")
        
        # Validate required fields
        required_fields = ['user_name', 'course_id', 'wallet_id', 'user_id']
        for field in required_fields:
            if not data.get(field):
                logger.error(f"❌ Missing required field: {field}")
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # ✅ CRITICAL FIX: Get the STUDENT's entered name (exactly as they typed it)
        student_entered_name = data.get('user_name', '').strip()
        if not student_entered_name:
            logger.error("❌ Student name cannot be empty")
            return jsonify({"error": "Student name is required"}), 400
        
        logger.info(f"🎓 Processing certificate for STUDENT: '{student_entered_name}'")
        
        # Get database connection
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # ✅ Check if certificate already exists for this user and course
        existing_certificate = db.certificates.find_one({
            "user_id": data['user_id'],
            "course_id": data['course_id']
        })
        
        if existing_certificate is not None:
            logger.info(f"📜 Certificate already exists for STUDENT: '{student_entered_name}'")
            return jsonify({
                "success": True,
                "certificate": {
                    "certificate_id": existing_certificate['certificate_id'],
                    "user_name": student_entered_name,  # ✅ FORCE RETURN STUDENT'S ENTERED NAME
                    "course_title": existing_certificate['course_title'],
                    "mentor_name": existing_certificate.get('mentor_name', existing_certificate.get('course_mentor', 'OpenLearnX Instructor')),
                    "completion_date": existing_certificate['completion_date'],
                    "share_code": existing_certificate.get('share_code'),
                    "public_url": existing_certificate.get('public_url'),
                    "unique_url": f"/certificate/{existing_certificate.get('share_code', existing_certificate['certificate_id'])}",
                    "message": "Certificate already exists!"
                }
            }), 200
        
        # Check if course exists
        try:
            course = db.courses.find_one({"id": data['course_id']})
            if course is None:
                return jsonify({"error": "Course not found"}), 404
        except Exception as e:
            logger.error(f"❌ Error finding course: {e}")
            return jsonify({"error": "Failed to verify course"}), 500
        
        # ✅ CRITICAL FIX: GUARANTEED UNIQUE ID GENERATION
        certificate_id = None
        share_code = None
        max_attempts = 50
        
        for attempt in range(max_attempts):
            # Generate new IDs using enhanced method
            temp_cert_id = generate_unique_certificate_id()
            temp_share_code = generate_unique_share_code()
            
            logger.info(f"🆔 Attempt {attempt + 1}: Generated cert_id={temp_cert_id}, share_code={temp_share_code}")
            
            # Check if IDs already exist in database
            existing_cert_id = db.certificates.find_one({"certificate_id": temp_cert_id})
            existing_share_code = db.certificates.find_one({"share_code": temp_share_code})
            
            if not existing_cert_id and not existing_share_code:
                certificate_id = temp_cert_id
                share_code = temp_share_code
                logger.info(f"✅ UNIQUE IDs confirmed: cert_id={certificate_id}, share_code={share_code}")
                break
            else:
                logger.warning(f"⚠️ ID collision detected on attempt {attempt + 1}")
                time.sleep(0.001)  # Small delay to ensure timestamp changes
        
        if not certificate_id or not share_code:
            logger.error(f"❌ Failed to generate unique IDs after {max_attempts} attempts")
            return jsonify({"error": "Failed to generate unique certificate ID"}), 500
        
        # Generate token ID
        token_id = str(uuid.uuid4())
        
        # Encrypt wallet ID
        encrypted_wallet = cert_manager.encrypt_wallet_id(data['wallet_id'])
        if not encrypted_wallet:
            return jsonify({"error": "Failed to encrypt wallet ID"}), 500
        
        # ✅ CRITICAL FIX: Extract INSTRUCTOR name from course (separate from student)
        instructor_name = course.get('mentor', 'OpenLearnX Instructor')
        if isinstance(instructor_name, dict):
            instructor_name = instructor_name.get('name', 'OpenLearnX Instructor')
        
        # ✅ PREVENT STUDENT NAME FROM BEING USED AS INSTRUCTOR NAME
        if instructor_name == student_entered_name:
            instructor_name = 'OpenLearnX Instructor'
        
        logger.info(f"🎓 FINAL VERIFICATION - STUDENT: '{student_entered_name}' | INSTRUCTOR: '{instructor_name}'")
        
        # ✅ Create certificate document with GUARANTEED UNIQUE IDs and proper field separation
        certificate = {
            "certificate_id": certificate_id,  # ✅ GUARANTEED UNIQUE
            "token_id": token_id,
            "share_code": share_code,  # ✅ GUARANTEED UNIQUE
            "student_name": student_entered_name,  # ✅ EXPLICIT STUDENT FIELD
            "user_name": student_entered_name,     # ✅ STUDENT'S ENTERED NAME
            "user_id": data['user_id'],
            "course_id": data['course_id'],
            "course_title": course['title'],
            "mentor_name": instructor_name,        # ✅ INSTRUCTOR NAME
            "instructor_name": instructor_name,    # ✅ EXPLICIT INSTRUCTOR FIELD
            "course_mentor": instructor_name,      # ✅ BACKWARD COMPATIBILITY
            "encrypted_wallet_id": encrypted_wallet,
            "completion_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": "active",
            "issued_by": "OpenLearnX",
            "verification_url": f"/certificates/{certificate_id}",
            "share_url": f"/certificate/{share_code}",
            "public_url": f"{request.host_url}certificate/{share_code}",
            "blockchain_hash": None,
            "is_revoked": False,
            "view_count": 0,
            "shared_count": 0
        }
        
        # ✅ Save to MongoDB with enhanced error handling
        try:
            # Create indexes for uniqueness
            db.certificates.create_index([("certificate_id", 1)], unique=True, background=True)
            db.certificates.create_index([("share_code", 1)], unique=True, background=True)
            
            result = db.certificates.insert_one(certificate)
            logger.info(f"✅ Certificate saved successfully for STUDENT: '{student_entered_name}' with unique ID: {certificate_id}")
            
        except Exception as e:
            logger.error(f"❌ Database save error: {e}")
            return jsonify({"error": "Failed to save certificate to database"}), 500
        
        # ✅ Return response with GUARANTEED STUDENT NAME and UNIQUE IDs
        certificate_response = {
            "certificate_id": certificate_id,      # ✅ GUARANTEED UNIQUE ID
            "token_id": token_id,
            "share_code": share_code,              # ✅ GUARANTEED UNIQUE SHARE CODE
            "user_name": student_entered_name,     # ✅ STUDENT'S ENTERED NAME (GUARANTEED)
            "student_name": student_entered_name,  # ✅ EXPLICIT STUDENT NAME
            "course_title": course['title'],
            "mentor_name": instructor_name,        # ✅ INSTRUCTOR NAME
            "instructor_name": instructor_name,    # ✅ EXPLICIT INSTRUCTOR NAME
            "course_mentor": instructor_name,      # ✅ BACKWARD COMPATIBILITY
            "completion_date": certificate['completion_date'],
            "verification_url": certificate['verification_url'],
            "share_url": certificate['share_url'],
            "public_url": certificate['public_url'],
            "unique_url": f"/certificate/{share_code}",
            "message": f"Certificate with UNIQUE ID {certificate_id} generated successfully for {student_entered_name}!"
        }
        
        logger.info(f"📤 RETURNING CERTIFICATE with unique ID: {certificate_id} for STUDENT: {student_entered_name}")
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        }), 201
        
    except Exception as e:
        logger.error(f"❌ Unexpected error creating certificate: {str(e)}")
        return jsonify({"error": "Failed to create certificate"}), 500

@bp.route("/certificates/<certificate_id>", methods=["GET", "OPTIONS"])
def get_certificate(certificate_id):
    """Get certificate by ID with proper field mapping"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificate = db.certificates.find_one({"certificate_id": certificate_id})
        
        if not certificate:
            return jsonify({"error": "Certificate not found"}), 404
        
        # Check if certificate is revoked
        if certificate.get('is_revoked', False):
            return jsonify({"error": "Certificate has been revoked"}), 410
        
        # ✅ Decrypt wallet ID for display
        decrypted_wallet = None
        if certificate.get('encrypted_wallet_id'):
            decrypted_wallet = cert_manager.decrypt_wallet_id(certificate['encrypted_wallet_id'])
        
        # ✅ Prepare response with proper field mapping (prioritize explicit fields)
        certificate_response = {
            "certificate_id": certificate['certificate_id'],
            "token_id": certificate.get('token_id'),
            "share_code": certificate.get('share_code'),
            # ✅ STUDENT NAME (prioritize explicit student_name field)
            "user_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
            "student_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
            # ✅ COURSE INFO
            "course_title": certificate['course_title'],
            # ✅ INSTRUCTOR NAME (prioritize explicit instructor_name field)
            "mentor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            "instructor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            "course_mentor": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            # ✅ OTHER INFO
            "completion_date": certificate['completion_date'],
            "status": certificate['status'],
            "wallet_id": decrypted_wallet,
            "issued_by": certificate.get('issued_by', 'OpenLearnX'),
            "verification_url": certificate.get('verification_url'),
            "share_url": certificate.get('share_url'),
            "public_url": certificate.get('public_url'),
            "unique_url": f"/certificate/{certificate.get('share_code', certificate_id)}",
            "view_count": certificate.get('view_count', 0),
            "blockchain_hash": certificate.get('blockchain_hash'),
            "is_verified": True,
            "is_revoked": certificate.get('is_revoked', False)
        }
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        })
        
    except Exception as e:
        logger.error(f"Error fetching certificate: {str(e)}")
        return jsonify({"error": "Failed to fetch certificate"}), 500

# ✅ UNIQUE CERTIFICATE VIEW ENDPOINT
@bp.route("/certificate/<share_code>", methods=["GET", "OPTIONS"])
def view_certificate_by_code(share_code):
    """View certificate by unique share code"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Find certificate by share code
        certificate = db.certificates.find_one({"share_code": share_code})
        
        if certificate is None:
            return jsonify({"error": "Certificate not found"}), 404
        
        # Check if certificate is revoked
        if certificate.get('is_revoked', False):
            return jsonify({"error": "Certificate has been revoked"}), 410
        
        # ✅ INCREMENT VIEW COUNT
        db.certificates.update_one(
            {"share_code": share_code},
            {"$inc": {"view_count": 1}}
        )
        
        # Decrypt wallet ID for display
        decrypted_wallet = None
        if certificate.get('encrypted_wallet_id') is not None:
            decrypted_wallet = cert_manager.decrypt_wallet_id(certificate['encrypted_wallet_id'])
        
        # ✅ PREPARE RESPONSE WITH GUARANTEED STUDENT NAME
        certificate_response = {
            "certificate_id": certificate['certificate_id'],
            "share_code": certificate['share_code'],
            "user_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
            "student_name": certificate.get('student_name', certificate.get('user_name', 'Student')),
            "course_title": certificate['course_title'],
            "mentor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            "instructor_name": certificate.get('instructor_name', certificate.get('mentor_name', certificate.get('course_mentor', 'OpenLearnX Instructor'))),
            "completion_date": certificate['completion_date'],
            "status": certificate['status'],
            "wallet_id": decrypted_wallet,
            "issued_by": certificate.get('issued_by', 'OpenLearnX'),
            "verification_url": certificate.get('verification_url'),
            "share_url": certificate.get('share_url'),
            "public_url": certificate.get('public_url'),
            "view_count": certificate.get('view_count', 0),
            "is_verified": True,
            "is_revoked": certificate.get('is_revoked', False)
        }
        
        return jsonify({
            "success": True,
            "certificate": certificate_response
        })
        
    except Exception as e:
        logger.error(f"Error fetching certificate by code: {str(e)}")
        return jsonify({"error": "Failed to fetch certificate"}), 500

@bp.route("/certificates/user/<user_id>", methods=["GET", "OPTIONS"])
def get_user_certificates(user_id):
    """Get all certificates for a user"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        certificates = list(db.certificates.find(
            {"user_id": user_id}, 
            {"_id": 0, "encrypted_wallet_id": 0}
        ))
        
        return jsonify({
            "success": True,
            "certificates": certificates,
            "count": len(certificates)
        })
        
    except Exception as e:
        logger.error(f"Error fetching user certificates: {str(e)}")
        return jsonify({"error": "Failed to fetch certificates"}), 500

# ✅ SHARE TRACKING ENDPOINT
@bp.route("/certificates/<certificate_id>/share", methods=["POST", "OPTIONS"])
def track_certificate_share(certificate_id):
    """Track certificate sharing"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Increment share count
        result = db.certificates.update_one(
            {"certificate_id": certificate_id},
            {"$inc": {"shared_count": 1}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Certificate not found"}), 404
        
        return jsonify({
            "success": True,
            "message": "Share tracked successfully"
        })
        
    except Exception as e:
        logger.error(f"Error tracking share: {str(e)}")
        return jsonify({"error": "Failed to track share"}), 500

@bp.route("/admin/certificates", methods=["GET", "OPTIONS"])
def get_all_certificates():
    """Admin endpoint to get all certificates"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        # Check admin authentication
        auth_header = request.headers.get('Authorization')
        if auth_header is None or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401
        
        token = auth_header.split(' ')[1]
        expected_token = os.getenv('ADMIN_TOKEN', 'admin-secret-key')
        
        if token != expected_token:
            return jsonify({"error": "Invalid admin token"}), 401
        
        db = get_db()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
        
        # Add pagination
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        skip = (page - 1) * limit
        
        certificates = list(db.certificates.find(
            {}, 
            {"_id": 0, "encrypted_wallet_id": 0}
        ).skip(skip).limit(limit).sort("created_at", -1))
        
        total = db.certificates.count_documents({})
        
        return jsonify({
            "success": True,
            "certificates": certificates,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching certificates: {str(e)}")
        return jsonify({"error": "Failed to fetch certificates"}), 500

# ✅ HELPER FUNCTIONS FOR UNIQUE ID GENERATION
def generate_unique_certificate_id():
    """Generate truly unique certificate ID with multiple randomness sources"""
    # High-precision timestamp (microseconds)
    timestamp_micro = str(int(time.time() * 1000000))[-8:]
    
    # Cryptographically secure random
    crypto_random = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    
    # Combined for uniqueness
    certificate_id = (timestamp_micro + crypto_random)[:12]
    
    # Ensure exactly 12 characters
    if len(certificate_id) < 12:
        certificate_id += ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(12 - len(certificate_id)))
    
    return certificate_id

def generate_unique_share_code():
    """Generate unique share code with timestamp"""
    # High precision timestamp
    timestamp = str(int(time.time_ns()))[-4:]
    
    # Cryptographically secure random
    crypto_random = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4))
    
    return timestamp + crypto_random
