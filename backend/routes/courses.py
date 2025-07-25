from flask import Blueprint, jsonify, current_app
import asyncio
from bson import ObjectId

bp = Blueprint('courses', __name__)

# Remove trailing slash from route definition
@bp.route("/", methods=["GET"])
@bp.route("", methods=["GET"])  # Add this line to handle both cases
def list_courses():
    try:
        # Your existing course logic here
        # Mock data for now since you're having DB async issues
        courses = [
            {
                "id": "python-course",
                "title": "Python Programming Mastery",
                "subject": "Programming",
                "description": "Learn Python from basics to advanced concepts",
                "difficulty": "Beginner to Advanced",
                "progress": 0
            },
            {
                "id": "java-course",
                "title": "Java Development Bootcamp",
                "subject": "Programming",
                "description": "Master Java programming with object-oriented concepts",
                "difficulty": "Intermediate",
                "progress": 0
            },
            {
                "id": "ethical-hacking-course",
                "title": "Ethical Hacking & Cybersecurity",
                "subject": "Cybersecurity",
                "description": "Learn ethical hacking techniques and penetration testing",
                "difficulty": "Advanced",
                "progress": 0
            }
        ]
        return jsonify(courses)
    except Exception as e:
        print(f"Error in list_courses: {e}")
        return jsonify({"error": "Failed to fetch courses"}), 500
