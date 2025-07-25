from flask import Blueprint, jsonify

bp = Blueprint('quizzes', __name__)

# Handle both with and without trailing slash
@bp.route("/", methods=["GET"])
@bp.route("", methods=["GET"])  # Add this line
def list_quizzes():
    quizzes = [
        {
            "id": "python-quiz",
            "title": "Python Fundamentals Quiz",
            "topic": "Programming",
            "difficulty": "Easy",
            "recent_performance": 85
        },
        {
            "id": "java-quiz", 
            "title": "Java OOP Concepts Quiz",
            "topic": "Programming",
            "difficulty": "Medium",
            "recent_performance": 78
        },
        {
            "id": "security-quiz",
            "title": "Cybersecurity Basics Quiz", 
            "topic": "Security",
            "difficulty": "Hard",
            "recent_performance": 72
        }
    ]
    return jsonify(quizzes)
