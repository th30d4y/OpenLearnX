from flask import Blueprint, jsonify, current_app, request
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime
from activity_logger import log_user_activity, resolve_user_identity

bp = Blueprint('courses', __name__)

# MongoDB connection
mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client.openlearnx

@bp.route("/", methods=["GET"])
@bp.route("", methods=["GET"])
def list_courses():
    """Get all courses - DYNAMIC from database"""
    try:
        courses = list(db.courses.find({}))
        
        course_list = []
        for course in courses:
            # Handle both old format (id field) and new format (_id field)
            course_id = course.get("id") or str(course.get("_id", ""))
            modules_count = len(course.get("modules", []))
            if modules_count == 0 and course_id:
                modules_count = db.modules.count_documents({"course_id": course_id})
            course_data = {
                "id": course_id,
                "title": course.get("title", ""),
                "subject": course.get("subject", ""),
                "description": course.get("description", ""),
                "difficulty": course.get("difficulty", ""),
                "mentor": course.get("mentor", course.get("instructor", "")),
                "video_url": course.get("video_url", ""),
                "embed_url": course.get("embed_url", ""),
                "thumbnail": course.get("thumbnail", ""),
                "instructor": course.get("instructor", ""),
                "duration_hours": course.get("duration_hours", 0),
                "level": course.get("level", ""),
                "modules": modules_count,
                "progress": course.get("progress", 0)
            }
            course_list.append(course_data)
        
        return jsonify(course_list)
    except Exception as e:
        print(f"Error in list_courses: {e}")
        return jsonify({"error": "Failed to fetch courses"}), 500

@bp.route("/<course_id>", methods=["GET"])
def get_course(course_id):
    """Get specific course details - DYNAMIC"""
    try:
        # Try multiple ways to find the course
        course = None
        
        # First try as string _id (new UUID format)
        course = db.courses.find_one({"_id": course_id})
        
        # If not found, try as ObjectId (old format)
        if not course:
            try:
                course = db.courses.find_one({"_id": ObjectId(course_id)})
            except:
                pass
        
        # If still not found, try as 'id' field (legacy)
        if not course:
            course = db.courses.find_one({"id": course_id})
        
        if not course:
            return jsonify({"error": "Course not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        course_id_value = course.get("id") or str(course.get("_id"))
        course["id"] = course_id_value
        course["_id"] = str(course.get("_id"))
        if not course.get("mentor"):
            course["mentor"] = course.get("instructor", "")
        
        return jsonify(course)
    except Exception as e:
        print(f"Error in get_course: {e}")
        return jsonify({"error": "Failed to fetch course"}), 500

@bp.route("/<course_id>/modules", methods=["GET"])
def get_course_modules(course_id):
    """Get modules for a course from modules collection or embedded structure."""
    try:
        modules = list(db.modules.find({"course_id": course_id}).sort("order", 1))
        if not modules:
            course = db.courses.find_one({"id": course_id})
            if not course:
                try:
                    course = db.courses.find_one({"_id": ObjectId(course_id)})
                except Exception:
                    course = None
            if course:
                embedded = course.get("modules", [])
                for module in embedded:
                    module["course_id"] = course_id
                return jsonify({"success": True, "modules": embedded})

        for module in modules:
            if "_id" in module:
                module["id"] = str(module["_id"])
                del module["_id"]

        return jsonify({"success": True, "modules": modules})
    except Exception as e:
        print(f"Error fetching modules: {e}")
        return jsonify({"error": "Failed to fetch modules"}), 500

@bp.route("/modules/<module_id>/lessons", methods=["GET"])
def get_public_module_lessons(module_id):
    """Get lessons for a module for public course pages."""
    try:
        lessons = list(db.lessons.find({"module_id": module_id}).sort("order", 1))
        for lesson in lessons:
            if "_id" in lesson:
                lesson["id"] = str(lesson["_id"])
                del lesson["_id"]
        return jsonify({"success": True, "lessons": lessons})
    except Exception as e:
        print(f"Error fetching lessons: {e}")
        return jsonify({"error": "Failed to fetch lessons"}), 500

@bp.route("/<course_id>/lessons/<lesson_id>", methods=["GET"])
def get_lesson(course_id, lesson_id):
    """Get specific lesson content - DYNAMIC"""
    try:
        # Find course with either format
        course = None
        course = db.courses.find_one({"_id": course_id})
        if not course:
            try:
                course = db.courses.find_one({"_id": ObjectId(course_id)})
            except:
                pass
        if not course:
            course = db.courses.find_one({"id": course_id})
        
        if not course:
            return jsonify({"error": "Course not found"}), 404
        
        # Search for lesson in embedded modules structure
        for module in course.get("modules", []):
            for lesson in module.get("lessons", []):
                if lesson.get("lesson_id") == lesson_id or lesson.get("id") == lesson_id:
                    return jsonify(lesson)
        
        # Fallback: check lessons collection
        lesson = db.lessons.find_one({"id": lesson_id, "course_id": course_id})
        if lesson:
            lesson["_id"] = str(lesson.get("_id", ""))
            return jsonify(lesson)
        
        return jsonify({"error": "Lesson not found"}), 404
    except Exception as e:
        print(f"Error in get_lesson: {e}")
        return jsonify({"error": "Failed to fetch lesson"}), 500

@bp.route("/<course_id>/lessons/<lesson_id>/complete", methods=["POST"])
def mark_lesson_complete(course_id, lesson_id):
    """Mark a lesson as completed for the user"""
    try:
        identity = resolve_user_identity(request, db)
        user_id = identity.get("user_id")

        if not user_id:
            return jsonify({"success": False, "error": "Authentication required"}), 401

        if user_id:
            # Find course with new or old format
            course = db.courses.find_one({"_id": course_id}, {"title": 1})
            if not course:
                try:
                    course = db.courses.find_one({"_id": ObjectId(course_id)}, {"title": 1})
                except:
                    pass
            if not course:
                course = db.courses.find_one({"id": course_id}, {"title": 1})
            
            course = course or {}
            
            # Find lesson title from embedded structure or lessons collection
            lesson_title = lesson_id
            course_full = None
            if course:
                course_full = db.courses.find_one({"_id": course.get("_id")})
            
            if course_full:
                for module in course_full.get("modules", []):
                    for lesson in module.get("lessons", []):
                        if lesson.get("lesson_id") == lesson_id or lesson.get("id") == lesson_id:
                            lesson_title = lesson.get("title", lesson_id)
                            break
            
            db.user_courses.update_one(
                {"user_id": user_id, "course_id": course_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "course_id": course_id,
                        "last_activity_at": datetime.utcnow(),
                        "completed_at": datetime.utcnow(),
                        "completed": True,
                    },
                    "$addToSet": {"lessons_completed": lesson_id},
                },
                upsert=True,
            )

            log_user_activity(
                db,
                user_id,
                "course",
                "Lesson completed",
                f"Completed lesson '{lesson_title}' in course '{course.get('title', course_id)}'",
                {"course_id": course_id, "lesson_id": lesson_id},
                points_earned=10,
            )

        return jsonify({
            "success": True,
            "message": f"Lesson {lesson_id} marked as complete",
            "progress_updated": True
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<course_id>/activity", methods=["POST"])
def log_course_activity(course_id):
    """Log course interactions like view/start for real dashboard activity."""
    try:
        identity = resolve_user_identity(request, db)
        user_id = identity.get("user_id")
        if not user_id:
            return jsonify({"success": False, "error": "Authentication required"}), 401

        data = request.get_json(silent=True) or {}
        action = str(data.get("action") or "view").strip().lower()
        lesson_id = str(data.get("lesson_id") or "").strip()

        course = db.courses.find_one({"id": course_id}, {"title": 1}) or {}
        lesson_title = lesson_id
        if lesson_id:
            lesson = db.lessons.find_one({"id": lesson_id, "course_id": course_id}, {"title": 1}) or {}
            lesson_title = lesson.get("title", lesson_id)

        if action == "start":
            title = "Course started"
            description = f"Started course '{course.get('title', course_id)}'"
        elif action == "lesson_view":
            title = "Lesson viewed"
            description = f"Viewed lesson '{lesson_title}' in course '{course.get('title', course_id)}'"
        else:
            title = "Course viewed"
            description = f"Opened course '{course.get('title', course_id)}'"

        log_user_activity(
            db,
            user_id,
            "course",
            title,
            description,
            {"course_id": course_id, "lesson_id": lesson_id, "action": action},
        )

        db.user_courses.update_one(
            {"user_id": user_id, "course_id": course_id},
            {
                "$set": {
                    "user_id": user_id,
                    "course_id": course_id,
                    "last_activity_at": datetime.utcnow(),
                },
                "$setOnInsert": {
                    "started_at": datetime.utcnow(),
                    "completed": False,
                    "lessons_completed": [],
                },
            },
            upsert=True,
        )

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/<course_id>/register", methods=["POST"])
def register_course(course_id):
    """Register/enroll a user in a course and log a dashboard notification."""
    try:
        identity = resolve_user_identity(request, db)
        user_id = identity.get("user_id")
        if not user_id:
            return jsonify({"success": False, "error": "Authentication required"}), 401

        course = db.courses.find_one({"id": course_id}, {"title": 1})
        if not course:
            try:
                course = db.courses.find_one({"_id": ObjectId(course_id)}, {"title": 1})
            except Exception:
                course = None
        course_title = course.get("title") if course else course_id

        db.user_courses.update_one(
            {"user_id": user_id, "course_id": course_id},
            {
                "$set": {
                    "user_id": user_id,
                    "course_id": course_id,
                    "enrolled": True,
                    "enrolled_at": datetime.utcnow(),
                    "last_activity_at": datetime.utcnow(),
                },
                "$setOnInsert": {"completed": False, "lessons_completed": []},
            },
            upsert=True,
        )

        log_user_activity(
            db,
            user_id,
            "course",
            "Course registered",
            f"Registered for course '{course_title}'",
            {"course_id": course_id},
        )

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/<course_id>/registration", methods=["GET"])
def get_course_registration(course_id):
    """Check whether the current user is registered for a course."""
    try:
        identity = resolve_user_identity(request, db)
        user_id = identity.get("user_id")
        if not user_id:
            return jsonify({"success": False, "registered": False, "error": "Authentication required"}), 401

        record = db.user_courses.find_one({"user_id": user_id, "course_id": course_id})
        return jsonify({"success": True, "registered": bool(record)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/<course_id>/progress", methods=["GET"])
def get_course_progress(course_id):
    """Get user's progress in a specific course"""
    try:
        progress = {
            "course_id": course_id,
            "completion_percentage": 25,
            "lessons_completed": [],
            "total_lessons": 4,
            "last_accessed": "2025-01-26T23:30:00Z",
            "time_spent": "2 hours 15 minutes"
        }
        return jsonify(progress)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
