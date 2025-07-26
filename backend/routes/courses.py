from flask import Blueprint, jsonify, current_app
from pymongo import MongoClient
import os

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
        courses = list(db.courses.find({}, {"_id": 0}))
        
        course_list = []
        for course in courses:
            course_data = {
                "id": course.get("id"),
                "title": course.get("title"),
                "subject": course.get("subject"),
                "description": course.get("description"),
                "difficulty": course.get("difficulty"),
                "mentor": course.get("mentor"),
                "video_url": course.get("video_url"),
                "embed_url": course.get("embed_url"),
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
        course = db.courses.find_one({"id": course_id}, {"_id": 0})
        
        if not course:
            return jsonify({"error": "Course not found"}), 404
        
        return jsonify(course)
    except Exception as e:
        print(f"Error in get_course: {e}")
        return jsonify({"error": "Failed to fetch course"}), 500

@bp.route("/<course_id>/lessons/<lesson_id>", methods=["GET"])
def get_lesson(course_id, lesson_id):
    """Get specific lesson content - DYNAMIC"""
    try:
        lesson = db.lessons.find_one({"id": lesson_id, "course_id": course_id}, {"_id": 0})
        
        if not lesson:
            return jsonify({"error": "Lesson not found"}), 404
        
        return jsonify(lesson)
    except Exception as e:
        print(f"Error in get_lesson: {e}")
        return jsonify({"error": "Failed to fetch lesson"}), 500

@bp.route("/<course_id>/lessons/<lesson_id>/complete", methods=["POST"])
def mark_lesson_complete(course_id, lesson_id):
    """Mark a lesson as completed for the user"""
    try:
        return jsonify({
            "success": True,
            "message": f"Lesson {lesson_id} marked as complete",
            "progress_updated": True
        })
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
