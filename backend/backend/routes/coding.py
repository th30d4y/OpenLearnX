from flask import Blueprint, request, jsonify, session
from functools import wraps
import subprocess
import tempfile
import os
import time
import uuid
from datetime import datetime
import docker
import psutil

bp = Blueprint('coding', __name__)

def secure_execution_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user is in secure coding mode
        if not session.get('secure_coding_mode'):
            return jsonify({"error": "Secure coding mode required"}), 403
        return f(*args, **kwargs)
    return decorated_function

@bp.route("/start-session", methods=["POST"])
def start_coding_session():
    """Start a secure coding session"""
    try:
        data = request.json
        course_id = data.get('course_id')
        lesson_id = data.get('lesson_id')
        
        session_id = str(uuid.uuid4())
        session['coding_session_id'] = session_id
        session['secure_coding_mode'] = True
        session['start_time'] = datetime.now().isoformat()
        session['course_id'] = course_id
        session['lesson_id'] = lesson_id
        
        return jsonify({
            "success": True,
            "session_id": session_id,
            "message": "Secure coding session started",
            "restrictions": {
                "copy_paste_disabled": True,
                "browser_locked": True,
                "extensions_blocked": True,
                "virtual_detection": True
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/execute", methods=["POST"])
@secure_execution_required
def execute_code():
    """Execute code securely in isolated environment"""
    try:
        data = request.json
        code = data.get('code')
        language = data.get('language', 'python')
        test_cases = data.get('test_cases', [])
        
        if not code:
            return jsonify({"error": "No code provided"}), 400
        
        # Log coding attempt
        log_coding_attempt(session['coding_session_id'], code, language)
        
        # Execute code in secure container
        result = execute_in_container(code, language, test_cases)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/submit-test", methods=["POST"])
@secure_execution_required
def submit_coding_test():
    """Submit coding test for evaluation"""
    try:
        data = request.json
        code = data.get('code')
        problem_id = data.get('problem_id')
        
        # Validate against test cases
        test_result = validate_test_submission(code, problem_id)
        
        # Store submission
        submission_id = store_submission(
            session['coding_session_id'],
            session['course_id'],
            problem_id,
            code,
            test_result
        )
        
        return jsonify({
            "success": True,
            "submission_id": submission_id,
            "score": test_result['score'],
            "passed_tests": test_result['passed'],
            "total_tests": test_result['total'],
            "feedback": test_result['feedback']
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def execute_in_container(code, language, test_cases):
    """Execute code in secure Docker container"""
    try:
        client = docker.from_env()
        
        # Language-specific container configuration
        containers = {
            'python': 'python:3.9-alpine',
            'java': 'openjdk:11-alpine',
            'javascript': 'node:16-alpine'
        }
        
        if language not in containers:
            return {"error": "Unsupported language"}
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{get_file_extension(language)}', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Run container with security restrictions
            container = client.containers.run(
                containers[language],
                command=get_run_command(language, temp_file),
                volumes={os.path.dirname(temp_file): {'bind': '/app', 'mode': 'ro'}},
                working_dir='/app',
                mem_limit='128m',
                cpu_period=100000,
                cpu_quota=50000,  # 50% CPU limit
                network_mode='none',  # No network access
                remove=True,
                timeout=10,  # 10 second timeout
                detach=False
            )
            
            output = container.decode('utf-8')
            
            # Run test cases if provided
            test_results = []
            if test_cases:
                for test in test_cases:
                    test_result = run_test_case(code, language, test)
                    test_results.append(test_result)
            
            return {
                "success": True,
                "output": output,
                "test_results": test_results,
                "execution_time": "< 10s"
            }
            
        finally:
            os.unlink(temp_file)
            
    except docker.errors.ContainerError as e:
        return {"error": f"Runtime error: {e}"}
    except docker.errors.ImageNotFound:
        return {"error": "Language runtime not available"}
    except Exception as e:
        return {"error": f"Execution failed: {str(e)}"}

def get_file_extension(language):
    extensions = {
        'python': 'py',
        'java': 'java',
        'javascript': 'js'
    }
    return extensions.get(language, 'txt')

def get_run_command(language, filename):
    commands = {
        'python': f'python /app/{os.path.basename(filename)}',
        'java': f'javac /app/{os.path.basename(filename)} && java -cp /app {os.path.splitext(os.path.basename(filename))[0]}',
        'javascript': f'node /app/{os.path.basename(filename)}'
    }
    return commands.get(language)

def log_coding_attempt(session_id, code, language):
    """Log all coding attempts for monitoring"""
    from pymongo import MongoClient
    
    client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
    db = client.openlearnx
    
    db.coding_logs.insert_one({
        "session_id": session_id,
        "code": code,
        "language": language,
        "timestamp": datetime.now(),
        "ip_address": request.remote_addr,
        "user_agent": request.headers.get('User-Agent')
    })

def validate_test_submission(code, problem_id):
    """Validate code against predefined test cases"""
    # Load test cases for the problem
    test_cases = get_problem_test_cases(problem_id)
    
    passed = 0
    total = len(test_cases)
    feedback = []
    
    for i, test_case in enumerate(test_cases):
        result = run_test_case(code, 'python', test_case)
        if result['passed']:
            passed += 1
            feedback.append(f"Test {i+1}: ✅ Passed")
        else:
            feedback.append(f"Test {i+1}: ❌ Failed - {result['error']}")
    
    score = (passed / total) * 100
    
    return {
        "score": score,
        "passed": passed,
        "total": total,
        "feedback": feedback
    }

def get_problem_test_cases(problem_id):
    """Get test cases for a specific problem"""
    # This would load from your database
    test_cases_db = {
        "python-basics-1": [
            {"input": "hello", "expected_output": "HELLO"},
            {"input": "world", "expected_output": "WORLD"}
        ],
        "java-oop-1": [
            {"input": "5", "expected_output": "25"},
            {"input": "10", "expected_output": "100"}
        ]
    }
    return test_cases_db.get(problem_id, [])
