from flask import Blueprint, request, jsonify
import subprocess
import tempfile
import os
import time
import docker
from datetime import datetime

bp = Blueprint('compiler', __name__)

def get_db():
    """Get MongoDB database connection"""
    from pymongo import MongoClient
    from flask import current_app
    client = MongoClient(current_app.config['MONGODB_URI'])
    return client.openlearnx

@bp.route('/execute', methods=['POST', 'OPTIONS'])
def execute_code():
    """Execute code in specified language with Docker support"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    try:
        data = request.get_json()
        language = data.get('language', 'python').lower()
        code = data.get('code', '').strip()
        input_data = data.get('input', '')
        
        print(f"🔧 Executing {language} code")
        print(f"📝 Code length: {len(code)} characters")
        
        if not code:
            return jsonify({"success": False, "error": "No code provided"}), 400
        
        # Execute based on language
        if language == 'python':
            return execute_python(code, input_data)
        elif language == 'java':
            return execute_java(code, input_data)
        elif language == 'javascript' or language == 'js':
            return execute_javascript(code, input_data)
        elif language == 'cpp' or language == 'c++':
            return execute_cpp(code, input_data)
        elif language == 'c':
            return execute_c(code, input_data)
        else:
            return jsonify({
                "success": False, 
                "error": f"Language '{language}' not supported. Available: python, java, javascript, cpp, c"
            }), 400
            
    except Exception as e:
        print(f"❌ Compiler error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Server error: {str(e)}"}), 500

def execute_python(code, input_data=""):
    """Execute Python code"""
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Execute with subprocess
            start_time = time.time()
            result = subprocess.run(
                ['python3', temp_file],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=10,  # 10 second timeout
                cwd=tempfile.gettempdir()
            )
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return jsonify({
                    "success": True,
                    "output": result.stdout or "Code executed successfully (no output)",
                    "error": result.stderr if result.stderr else None,
                    "language": "python",
                    "execution_time": round(execution_time, 3)
                })
            else:
                return jsonify({
                    "success": False,
                    "error": result.stderr or f"Process exited with code {result.returncode}",
                    "language": "python"
                })
                
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file)
            except:
                pass
                
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False, 
            "error": "Code execution timed out (10s limit)"
        }), 400
    except FileNotFoundError:
        return jsonify({
            "success": False, 
            "error": "Python interpreter not found. Please install Python 3."
        }), 500
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": f"Python execution error: {str(e)}"
        }), 500

def execute_java(code, input_data=""):
    """Execute Java code"""
    try:
        # Extract class name from code
        import re
        class_match = re.search(r'public\s+class\s+(\w+)', code)
        if not class_match:
            return jsonify({
                "success": False,
                "error": "No public class found. Java code must contain 'public class ClassName'"
            }), 400
        
        class_name = class_match.group(1)
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        java_file = os.path.join(temp_dir, f"{class_name}.java")
        
        try:
            # Write Java code to file
            with open(java_file, 'w') as f:
                f.write(code)
            
            # Compile Java code
            compile_result = subprocess.run(
                ['javac', java_file],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=temp_dir
            )
            
            if compile_result.returncode != 0:
                return jsonify({
                    "success": False,
                    "error": f"Compilation error:\n{compile_result.stderr}",
                    "language": "java"
                })
            
            # Execute Java code
            start_time = time.time()
            result = subprocess.run(
                ['java', class_name],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=10,
                cwd=temp_dir
            )
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return jsonify({
                    "success": True,
                    "output": result.stdout or "Code executed successfully (no output)",
                    "error": result.stderr if result.stderr else None,
                    "language": "java",
                    "execution_time": round(execution_time, 3)
                })
            else:
                return jsonify({
                    "success": False,
                    "error": result.stderr or f"Runtime error (exit code {result.returncode})",
                    "language": "java"
                })
                
        finally:
            # Clean up temp files
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
                
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False, 
            "error": "Code execution timed out"
        }), 400
    except FileNotFoundError:
        return jsonify({
            "success": False, 
            "error": "Java compiler/runtime not found. Please install JDK."
        }), 500
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": f"Java execution error: {str(e)}"
        }), 500

def execute_javascript(code, input_data=""):
    """Execute JavaScript code"""
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            # Add input handling if needed
            if input_data:
                js_code = f"""
const input = `{input_data}`;
const readline = {{ question: () => input }};
{code}
"""
            else:
                js_code = code
            
            f.write(js_code)
            temp_file = f.name
        
        try:
            # Execute with Node.js
            start_time = time.time()
            result = subprocess.run(
                ['node', temp_file],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=10,
                cwd=tempfile.gettempdir()
            )
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return jsonify({
                    "success": True,
                    "output": result.stdout or "Code executed successfully (no output)",
                    "error": result.stderr if result.stderr else None,
                    "language": "javascript",
                    "execution_time": round(execution_time, 3)
                })
            else:
                return jsonify({
                    "success": False,
                    "error": result.stderr or f"Runtime error (exit code {result.returncode})",
                    "language": "javascript"
                })
                
        finally:
            try:
                os.unlink(temp_file)
            except:
                pass
                
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False, 
            "error": "Code execution timed out"
        }), 400
    except FileNotFoundError:
        return jsonify({
            "success": False, 
            "error": "Node.js not found. Please install Node.js."
        }), 500
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": f"JavaScript execution error: {str(e)}"
        }), 500

def execute_cpp(code, input_data=""):
    """Execute C++ code"""
    try:
        # Create temporary files
        temp_dir = tempfile.mkdtemp()
        cpp_file = os.path.join(temp_dir, "main.cpp")
        exe_file = os.path.join(temp_dir, "main.exe") if os.name == 'nt' else os.path.join(temp_dir, "main")
        
        try:
            # Write C++ code to file
            with open(cpp_file, 'w') as f:
                f.write(code)
            
            # Compile C++ code
            compile_cmd = ['g++', '-o', exe_file, cpp_file, '-std=c++17']
            compile_result = subprocess.run(
                compile_cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=temp_dir
            )
            
            if compile_result.returncode != 0:
                return jsonify({
                    "success": False,
                    "error": f"Compilation error:\n{compile_result.stderr}",
                    "language": "cpp"
                })
            
            # Execute compiled program
            start_time = time.time()
            result = subprocess.run(
                [exe_file],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=10,
                cwd=temp_dir
            )
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return jsonify({
                    "success": True,
                    "output": result.stdout or "Code executed successfully (no output)",
                    "error": result.stderr if result.stderr else None,
                    "language": "cpp",
                    "execution_time": round(execution_time, 3)
                })
            else:
                return jsonify({
                    "success": False,
                    "error": result.stderr or f"Runtime error (exit code {result.returncode})",
                    "language": "cpp"
                })
                
        finally:
            # Clean up temp files
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
                
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False, 
            "error": "Code execution timed out"
        }), 400
    except FileNotFoundError:
        return jsonify({
            "success": False, 
            "error": "G++ compiler not found. Please install GCC/G++."
        }), 500
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": f"C++ execution error: {str(e)}"
        }), 500

def execute_c(code, input_data=""):
    """Execute C code"""
    try:
        # Create temporary files
        temp_dir = tempfile.mkdtemp()
        c_file = os.path.join(temp_dir, "main.c")
        exe_file = os.path.join(temp_dir, "main.exe") if os.name == 'nt' else os.path.join(temp_dir, "main")
        
        try:
            # Write C code to file
            with open(c_file, 'w') as f:
                f.write(code)
            
            # Compile C code
            compile_cmd = ['gcc', '-o', exe_file, c_file, '-std=c99']
            compile_result = subprocess.run(
                compile_cmd,
                capture_output=True,
                text=True,
                timeout=30,
                cwd=temp_dir
            )
            
            if compile_result.returncode != 0:
                return jsonify({
                    "success": False,
                    "error": f"Compilation error:\n{compile_result.stderr}",
                    "language": "c"
                })
            
            # Execute compiled program
            start_time = time.time()
            result = subprocess.run(
                [exe_file],
                input=input_data,
                text=True,
                capture_output=True,
                timeout=10,
                cwd=temp_dir
            )
            execution_time = time.time() - start_time
            
            if result.returncode == 0:
                return jsonify({
                    "success": True,
                    "output": result.stdout or "Code executed successfully (no output)",
                    "error": result.stderr if result.stderr else None,
                    "language": "c",
                    "execution_time": round(execution_time, 3)
                })
            else:
                return jsonify({
                    "success": False,
                    "error": result.stderr or f"Runtime error (exit code {result.returncode})",
                    "language": "c"
                })
                
        finally:
            # Clean up temp files
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
                
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False, 
            "error": "Code execution timed out"
        }), 400
    except FileNotFoundError:
        return jsonify({
            "success": False, 
            "error": "GCC compiler not found. Please install GCC."
        }), 500
    except Exception as e:
        return jsonify({
            "success": False, 
            "error": f"C execution error: {str(e)}"
        }), 500

@bp.route('/languages', methods=['GET', 'OPTIONS'])
def get_supported_languages():
    """Get list of supported programming languages"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")  
        response.headers.add("Access-Control-Allow-Methods", "GET,OPTIONS")
        return response
    
    try:
        languages = {
            "python": {
                "name": "Python",
                "version": "3.x",
                "extension": ".py",
                "available": check_language_availability("python3")
            },
            "java": {
                "name": "Java",
                "version": "JDK 8+",
                "extension": ".java",
                "available": check_language_availability("javac")
            },
            "javascript": {
                "name": "JavaScript",
                "version": "Node.js",
                "extension": ".js",
                "available": check_language_availability("node")
            },
            "cpp": {
                "name": "C++",
                "version": "GCC/G++",
                "extension": ".cpp",
                "available": check_language_availability("g++")
            },
            "c": {
                "name": "C",
                "version": "GCC",
                "extension": ".c",
                "available": check_language_availability("gcc")
            }
        }
        
        return jsonify({
            "success": True,
            "languages": languages,
            "total": len(languages),
            "available_count": sum(1 for lang in languages.values() if lang["available"])
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def check_language_availability(command):
    """Check if a language compiler/interpreter is available"""
    try:
        result = subprocess.run([command, '--version'], 
                              capture_output=True, 
                              timeout=5)
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False

@bp.route('/health', methods=['GET'])
def compiler_health():
    """Health check for compiler service"""
    try:
        languages_status = {
            "python": check_language_availability("python3"),
            "java": check_language_availability("javac"),
            "javascript": check_language_availability("node"),
            "cpp": check_language_availability("g++"),
            "c": check_language_availability("gcc")
        }
        
        available_languages = sum(languages_status.values())
        total_languages = len(languages_status)
        
        status = "healthy" if available_languages > 0 else "unavailable"
        
        return jsonify({
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "languages": languages_status,
            "available_languages": available_languages,
            "total_languages": total_languages,
            "docker_available": check_docker_availability()
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

def check_docker_availability():
    """Check if Docker is available for containerized execution"""
    try:
        client = docker.from_env()
        client.ping()
        return True
    except:
        return False
