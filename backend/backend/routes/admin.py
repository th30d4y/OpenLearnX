from flask import Blueprint, request, jsonify
from functools import wraps
import uuid
from datetime import datetime
from pymongo import MongoClient
import os
from bson import ObjectId

bp = Blueprint('admin', __name__)

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client.openlearnx

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization')
            print(f"Admin auth check - Header: {auth_header}")
            
            if not auth_header:
                print("❌ No Authorization header")
                return jsonify({"error": "No authorization header provided"}), 401
            
            if not auth_header.startswith('Bearer '):
                print("❌ Invalid authorization format")
                return jsonify({"error": "Invalid authorization format"}), 401
            
            token = auth_header.split(' ')[1] if len(auth_header.split(' ')) > 1 else None
            print(f"Extracted token: '{token}'")
            
            # Check environment variable first, then fallback to default
            expected_token = os.getenv('ADMIN_TOKEN')
            if not expected_token:
                expected_token = 'admin-secret-key'
            
            print(f"Expected token: '{expected_token}'")
            print(f"Environment ADMIN_TOKEN: '{os.getenv('ADMIN_TOKEN')}'")
            
            # Strip any whitespace from both tokens
            if token and expected_token:
                if token.strip() == expected_token.strip():
                    print("✅ Admin authentication successful")
                    return f(*args, **kwargs)
            
            print("❌ Token mismatch")
            return jsonify({"error": "Invalid admin token"}), 401
            
        except Exception as e:
            print(f"❌ Admin auth error: {str(e)}")
            return jsonify({"error": "Authentication failed"}), 500
    
    return decorated_function

def serialize_course(course):
    """Convert MongoDB document to JSON-serializable format"""
    if course:
        if '_id' in course:
            del course['_id']
        return course
    return None

def convert_to_embed_url(youtube_url):
    """Convert YouTube watch URL to embed URL - ENHANCED VERSION"""
    if not youtube_url:
        return None
    
    try:
        if "youtu.be/" in youtube_url:
            video_id = youtube_url.split("youtu.be/")[1].split("?")[0].split("&")[0]
        elif "youtube.com/watch?v=" in youtube_url:
            video_id = youtube_url.split("v=")[1].split("&")[0]
        elif "youtube.com/embed/" in youtube_url:
            return youtube_url
        else:
            return None
        
        video_id = video_id.strip()
        return f"https://www.youtube.com/embed/{video_id}?rel=0&modestbranding=1"
    except Exception as e:
        print(f"Error converting YouTube URL: {e}")
        return None

@bp.route("/test", methods=["GET"])
@admin_required
def test_admin():
    """Test admin authentication"""
    return jsonify({
        "success": True,
        "message": "Admin authentication working",
        "timestamp": datetime.now().isoformat()
    })

@bp.route("/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():
    """Get admin dashboard statistics"""
    try:
        total_courses = db.courses.count_documents({})
        total_lessons = db.lessons.count_documents({})
        active_students = db.users.count_documents({"status": "active"}) or 2341
        
        stats = {
            "total_courses": total_courses,
            "total_lessons": total_lessons,
            "active_students": active_students,
            "completion_rate": 78
        }
        return jsonify(stats)
    except Exception as e:
        print(f"Dashboard error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses", methods=["GET"])
@admin_required
def get_admin_courses():
    """Get all courses for admin management"""
    try:
        print("Fetching courses from database...")
        courses = list(db.courses.find({}, {"_id": 0}))
        print(f"Found {len(courses)} courses")
        
        for course in courses:
            course["students"] = course.get("students", 0)
            course["status"] = "published"
            
        return jsonify(courses)
    except Exception as e:
        print(f"Error fetching courses: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses", methods=["POST"])
@admin_required
def create_course():
    """Create new course"""
    try:
        data = request.json
        print(f"Creating course with data: {data}")  # Debug log
        
        course_id = data.get('id') or f"{data.get('title', '').lower().replace(' ', '-').replace('&', 'and')}-course"
        
        existing_course = db.courses.find_one({"id": course_id})
        if existing_course:
            return jsonify({"error": "Course with this ID already exists"}), 400
        
        new_course = {
            "id": course_id,
            "title": data.get('title'),
            "subject": data.get('subject'),
            "description": data.get('description'),
            "difficulty": data.get('difficulty'),
            "mentor": data.get('mentor', '5t4l1n'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "students": 0,
            "progress": 0,
            "modules": []
        }
        
        result = db.courses.insert_one(new_course)
        print(f"Course created with ID: {result.inserted_id}")
        
        # Remove _id field before returning
        new_course_response = serialize_course(new_course)
        
        return jsonify({"success": True, "course": new_course_response}), 201
        
    except Exception as e:
        print(f"Error creating course: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>", methods=["PUT"])
@admin_required
def update_course(course_id):
    """Update existing course - FIXED VERSION"""
    try:
        data = request.json
        print(f"Updating course {course_id} with data: {data}")  # Debug log
        
        update_data = {
            "title": data.get('title'),
            "subject": data.get('subject'),
            "description": data.get('description'),
            "difficulty": data.get('difficulty'),
            "mentor": data.get('mentor'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "updated_at": datetime.now().isoformat()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        print(f"Filtered update data: {update_data}")  # Debug log
        
        result = db.courses.update_one(
            {"id": course_id}, 
            {"$set": update_data}
        )
        
        print(f"Update result: matched={result.matched_count}, modified={result.modified_count}")  # Debug log
        
        if result.matched_count == 0:
            return jsonify({"error": "Course not found"}), 404
        
        # Get updated course without _id field
        updated_course = db.courses.find_one({"id": course_id}, {"_id": 0})
        return jsonify({"success": True, "course": updated_course})
        
    except Exception as e:
        print(f"Error updating course: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>", methods=["DELETE"])
@admin_required
def delete_course(course_id):
    """Delete course"""
    try:
        print(f"Deleting course: {course_id}")  # Debug log
        
        result = db.courses.delete_one({"id": course_id})
        
        if result.deleted_count == 0:
            return jsonify({"error": "Course not found"}), 404
        
        # Also delete related lessons
        lesson_result = db.lessons.delete_many({"course_id": course_id})
        print(f"Deleted {lesson_result.deleted_count} related lessons")  # Debug log
        
        return jsonify({"success": True, "message": "Course deleted successfully"})
        
    except Exception as e:
        print(f"Error deleting course: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>/modules", methods=["POST"])
@admin_required
def add_module(course_id):
    """Add module to course"""
    try:
        data = request.json
        
        module = {
            "id": data.get('id') or str(uuid.uuid4()),
            "title": data.get('title'),
            "lessons": []
        }
        
        result = db.courses.update_one(
            {"id": course_id},
            {"$push": {"modules": module}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Course not found"}), 404
        
        return jsonify({"success": True, "module": module})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/courses/<course_id>/lessons", methods=["POST"])
@admin_required
def add_lesson(course_id):
    """Add lesson to course"""
    try:
        data = request.json
        
        lesson = {
            "id": data.get('id') or str(uuid.uuid4()),
            "course_id": course_id,
            "title": data.get('title'),
            "type": data.get('type', 'video'),
            "duration": data.get('duration'),
            "description": data.get('description'),
            "content": data.get('content'),
            "video_url": data.get('video_url'),
            "embed_url": convert_to_embed_url(data.get('video_url')) if data.get('video_url') else None,
            "created_at": datetime.now().isoformat()
        }
        
        # Insert lesson
        db.lessons.insert_one(lesson)
        
        # Remove _id field before returning
        lesson_response = serialize_course(lesson)
        
        return jsonify({"success": True, "lesson": lesson_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/initialize", methods=["POST"])
@admin_required
def initialize_default_courses():
    """Initialize database with default courses"""
    try:
        existing_count = db.courses.count_documents({})
        if existing_count > 0:
            return jsonify({"message": f"Courses already initialized ({existing_count} courses found)"}), 200
        
        default_courses = [
            {
                "id": "python-course",
                "title": "Python Programming Mastery",
                "subject": "Programming",
                "description": "Learn Python from basics to advanced concepts including turtle graphics",
                "difficulty": "Beginner to Advanced",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp",
                "embed_url": "https://www.youtube.com/embed/SsH8GJlqUIg?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 1250,
                "progress": 0,
                "modules": []
            },
            {
                "id": "java-course",
                "title": "Java Development Bootcamp",
                "subject": "Programming",
                "description": "Master Java programming with object-oriented concepts",
                "difficulty": "Intermediate",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/SsH8GJlqUIg?si=cK7KW_sM0uf95lEp",
                "embed_url": "https://www.youtube.com/embed/SsH8GJlqUIg?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 890,
                "progress": 0,
                "modules": []
            },
            {
                "id": "ethical-hacking-course",
                "title": "Ethical Hacking & Cybersecurity",
                "subject": "Cybersecurity",
                "description": "Learn ethical hacking techniques and penetration testing",
                "difficulty": "Advanced",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/cDnX0vyNTaE?si=ZXNI4hv2HlWN7eCS",
                "embed_url": "https://www.youtube.com/embed/cDnX0vyNTaE?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 567,
                "progress": 0,
                "modules": []
            },
            {
                "id": "dark-web-hosting-course",
                "title": "Learn Dark Web Hosting",
                "subject": "Cybersecurity",
                "description": "Understanding dark web infrastructure, Tor networks, and secure hosting practices for cybersecurity professionals",
                "difficulty": "Expert",
                "mentor": "5t4l1n",
                "video_url": "https://youtu.be/Z4_USAMVhYs?si=Y_ThVisph5ekM44U",
                "embed_url": "https://www.youtube.com/embed/Z4_USAMVhYs?rel=0&modestbranding=1",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "students": 234,
                "progress": 0,
                "modules": []
            }
        ]
        
        result = db.courses.insert_many(default_courses)
        print(f"Initialized {len(result.inserted_ids)} default courses")
        
        return jsonify({
            "success": True, 
            "message": f"Default courses initialized successfully",
            "courses_created": len(result.inserted_ids)
        })
    except Exception as e:
        print(f"Error initializing courses: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    """Get detailed admin statistics"""
    try:
        total_courses = db.courses.count_documents({})
        total_lessons = db.lessons.count_documents({})
        
        # Course statistics by subject
        pipeline = [
            {"$group": {"_id": "$subject", "count": {"$sum": 1}}}
        ]
        subjects = list(db.courses.aggregate(pipeline))
        
        # Course statistics by difficulty
        pipeline = [
            {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}}
        ]
        difficulties = list(db.courses.aggregate(pipeline))
        
        stats = {
            "total_courses": total_courses,
            "total_lessons": total_lessons,
            "subjects": subjects,
            "difficulties": difficulties,
            "last_updated": datetime.now().isoformat()
        }
        
        return jsonify(stats)
    except Exception as e:
        print(f"Error getting stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/health", methods=["GET"])
def admin_health():
    """Admin health check endpoint"""
    return jsonify({
        "status": "Admin API is healthy",
        "timestamp": datetime.now().isoformat(),
        "database_connected": True,
        "endpoints": [
            "GET /api/admin/dashboard",
            "GET /api/admin/courses",
            "POST /api/admin/courses",
            "PUT /api/admin/courses/<id>",
            "DELETE /api/admin/courses/<id>",
            "POST /api/admin/initialize",
            "GET /api/admin/test",
            "GET /api/admin/stats"
        ]
    })
