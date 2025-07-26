from flask import Blueprint, request, jsonify, session
from services.real_compiler_service import real_compiler_service
import uuid
from datetime import datetime

bp = Blueprint('compiler', __name__)

@bp.route("/languages", methods=["GET"])
def get_supported_languages():
    """Get list of supported programming languages"""
    try:
        languages = real_compiler_service.get_supported_languages()
        return jsonify({
            "success": True,
            "languages": languages,
            "total_languages": len(languages)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/execute", methods=["POST"])
def execute_code():
    """Execute code and return real output"""
    try:
        data = request.json
        
        # Validate input
        code = data.get('code', '').strip()
        language = data.get('language', 'python')
        input_data = data.get('input', '')
        
        if not code:
            return jsonify({"error": "No code provided"}), 400
        
        if language not in [lang['id'] for lang in real_compiler_service.get_supported_languages()]:
            return jsonify({"error": f"Language '{language}' not supported"}), 400
        
        # Generate execution ID
        execution_id = str(uuid.uuid4())
        
        # Execute code
        result = real_compiler_service.execute_code(
            code=code,
            language=language,
            input_data=input_data,
            execution_id=execution_id
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Execution failed: {str(e)}"}), 500

@bp.route("/execute-async", methods=["POST"])
def execute_code_async():
    """Start asynchronous code execution"""
    try:
        data = request.json
        execution_id = str(uuid.uuid4())
        
        # Add to execution queue
        real_compiler_service.execution_queue.put({
            'execution_id': execution_id,
            'code': data.get('code'),
            'language': data.get('language', 'python'),
            'input_data': data.get('input', ''),
            'callback_url': data.get('callback_url')
        })
        
        return jsonify({
            "success": True,
            "execution_id": execution_id,
            "message": "Code execution started",
            "status_url": f"/api/compiler/status/{execution_id}"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/status/<execution_id>", methods=["GET"])
def get_execution_status(execution_id):
    """Get status of code execution"""
    try:
        status = real_compiler_service.get_execution_status(execution_id)
        
        if status:
            return jsonify({
                "success": True,
                "execution_id": execution_id,
                "status": status['status'],
                "start_time": status['start_time'].isoformat(),
                "language": status['language']
            })
        else:
            return jsonify({
                "success": False,
                "error": "Execution not found"
            }), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/cancel/<execution_id>", methods=["POST"])
def cancel_execution(execution_id):
    """Cancel a running execution"""
    try:
        success = real_compiler_service.cancel_execution(execution_id)
        
        return jsonify({
            "success": success,
            "message": "Execution cancelled" if success else "Execution not found"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/test", methods=["POST"])
def test_compiler():
    """Test compiler with sample code"""
    try:
        language = request.json.get('language', 'python')
        
        test_codes = {
            'python': 'print("Hello from OpenLearnX Python Compiler!")\nprint("Current time:", __import__("datetime").datetime.now())',
            'java': 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from OpenLearnX Java Compiler!");\n    }\n}',
            'cpp': '#include <iostream>\nint main() {\n    std::cout << "Hello from OpenLearnX C++ Compiler!" << std::endl;\n    return 0;\n}',
            'javascript': 'console.log("Hello from OpenLearnX JavaScript Compiler!");',
            'go': 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello from OpenLearnX Go Compiler!")\n}',
            'rust': 'fn main() {\n    println!("Hello from OpenLearnX Rust Compiler!");\n}'
        }
        
        test_code = test_codes.get(language, test_codes['python'])
        
        result = real_compiler_service.execute_code(
            code=test_code,
            language=language,
            input_data=""
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route("/stats", methods=["GET"])
def get_compiler_stats():
    """Get compiler service statistics"""
    try:
        active_executions = len(real_compiler_service.active_executions)
        queue_size = real_compiler_service.execution_queue.qsize()
        supported_languages = len(real_compiler_service.language_configs)
        
        return jsonify({
            "success": True,
            "stats": {
                "active_executions": active_executions,
                "queue_size": queue_size,
                "supported_languages": supported_languages,
                "max_concurrent": real_compiler_service.max_concurrent_executions
            },
            "uptime": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
