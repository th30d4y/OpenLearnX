import docker
import tempfile
import os
import subprocess
import time
import uuid
import json
import threading
from typing import Dict, List, Any, Optional
from datetime import datetime
import queue
import signal

class RealCompilerService:
    def __init__(self):
        self.client = docker.from_env()
        self.execution_queue = queue.Queue()
        self.active_executions = {}
        self.max_concurrent_executions = 5
        
        # Enhanced language configurations with real execution
        self.language_configs = {
            'python': {
                'image': 'python:3.11-slim',
                'file_ext': '.py',
                'compile_command': None,  # Python doesn't need compilation
                'run_command': 'python /app/code.py',
                'timeout': 30,
                'memory_limit': '256m',
                'cpu_limit': '0.5'
            },
            'java': {
                'image': 'openjdk:17-alpine',
                'file_ext': '.java',
                'compile_command': 'javac /app/Main.java',
                'run_command': 'java -cp /app Main',
                'timeout': 30,
                'memory_limit': '512m',
                'cpu_limit': '0.5'
            },
            'cpp': {
                'image': 'gcc:latest',
                'file_ext': '.cpp',
                'compile_command': 'g++ -o /app/program /app/code.cpp -std=c++17',
                'run_command': '/app/program',
                'timeout': 30,
                'memory_limit': '256m',
                'cpu_limit': '0.5'
            },
            'c': {
                'image': 'gcc:latest',
                'file_ext': '.c',
                'compile_command': 'gcc -o /app/program /app/code.c',
                'run_command': '/app/program',
                'timeout': 30,
                'memory_limit': '256m',
                'cpu_limit': '0.5'
            },
            'javascript': {
                'image': 'node:18-alpine',
                'file_ext': '.js',
                'compile_command': None,
                'run_command': 'node /app/code.js',
                'timeout': 30,
                'memory_limit': '256m',
                'cpu_limit': '0.5'
            },
            'bash': {
                'image': 'bash:5.2-alpine3.18',
                'file_ext': '.sh',
                'compile_command': None,
                'run_command': 'bash /app/code.sh',
                'timeout': 30,
                'memory_limit': '128m',
                'cpu_limit': '0.3'
            },
            'go': {
                'image': 'golang:1.21-alpine',
                'file_ext': '.go',
                'compile_command': 'go build -o /app/program /app/code.go',
                'run_command': '/app/program',
                'timeout': 30,
                'memory_limit': '512m',
                'cpu_limit': '0.5'
            },
            'rust': {
                'image': 'rust:1.75-alpine',
                'file_ext': '.rs',
                'compile_command': 'rustc /app/code.rs -o /app/program',
                'run_command': '/app/program',
                'timeout': 60,  # Rust compilation can be slow
                'memory_limit': '1g',
                'cpu_limit': '1.0'
            }
        }
        
        # Start execution worker
        self.start_execution_worker()

    def start_execution_worker(self):
        """Start background worker for code execution"""
        def worker():
            while True:
                try:
                    execution_task = self.execution_queue.get(timeout=1)
                    self._execute_task(execution_task)
                    self.execution_queue.task_done()
                except queue.Empty:
                    continue
                except Exception as e:
                    print(f"Execution worker error: {e}")
        
        worker_thread = threading.Thread(target=worker, daemon=True)
        worker_thread.start()

    def execute_code(self, code: str, language: str, input_data: str = "", 
                    execution_id: str = None) -> Dict[str, Any]:
        """Execute code with real output capture"""
        if language not in self.language_configs:
            return {"error": f"Language '{language}' not supported"}
        
        if not execution_id:
            execution_id = str(uuid.uuid4())
        
        config = self.language_configs[language]
        
        try:
            # Create execution context
            execution_context = {
                'execution_id': execution_id,
                'code': code,
                'language': language,
                'input_data': input_data,
                'config': config,
                'start_time': datetime.now(),
                'status': 'running'
            }
            
            self.active_executions[execution_id] = execution_context
            
            # Execute in Docker container
            result = self._execute_in_container(execution_context)
            
            # Update execution context
            execution_context['status'] = 'completed'
            execution_context['end_time'] = datetime.now()
            execution_context['result'] = result
            
            return {
                "success": True,
                "execution_id": execution_id,
                "output": result.get('output', ''),
                "error": result.get('error', ''),
                "execution_time": result.get('execution_time', 0),
                "memory_used": result.get('memory_used', 0),
                "exit_code": result.get('exit_code', 0),
                "language": language,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "error": f"Execution failed: {str(e)}",
                "execution_id": execution_id,
                "language": language
            }
        finally:
            # Clean up
            if execution_id in self.active_executions:
                del self.active_executions[execution_id]

    def _execute_in_container(self, context: Dict) -> Dict[str, Any]:
        """Execute code in secure Docker container"""
        code = context['code']
        language = context['language']
        input_data = context['input_data']
        config = context['config']
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Prepare code file
            filename = f"code{config['file_ext']}" if language != 'java' else "Main.java"
            file_path = os.path.join(temp_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(code)
            
            # Prepare input file
            input_file = os.path.join(temp_dir, 'input.txt')
            with open(input_file, 'w', encoding='utf-8') as f:
                f.write(input_data)
            
            try:
                start_time = time.time()
                
                # Create and run container
                container = self.client.containers.run(
                    config['image'],
                    command=self._build_execution_command(config, filename),
                    volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                    working_dir='/app',
                    mem_limit=config['memory_limit'],
                    cpu_period=100000,
                    cpu_quota=int(float(config['cpu_limit']) * 100000),
                    network_mode='none',  # No network access
                    remove=True,
                    detach=False,
                    stdin_open=True,
                    tty=False,
                    timeout=config['timeout'],
                    # Security options
                    cap_drop=['ALL'],
                    security_opt=['no-new-privileges'],
                    read_only=False,
                    tmpfs={'/tmp': 'rw,noexec,nosuid,size=100m'}
                )
                
                execution_time = time.time() - start_time
                output = container.decode('utf-8')
                
                return {
                    "output": output.strip(),
                    "error": "",
                    "exit_code": 0,
                    "execution_time": round(execution_time, 3),
                    "memory_used": self._get_memory_usage(container)
                }
                
            except docker.errors.ContainerError as e:
                return {
                    "output": "",
                    "error": f"Runtime error (exit code {e.exit_status}): {e.stderr.decode('utf-8') if e.stderr else 'Unknown error'}",
                    "exit_code": e.exit_status,
                    "execution_time": time.time() - start_time,
                    "memory_used": 0
                }
            except docker.errors.APIError as e:
                return {
                    "output": "",
                    "error": f"Docker API error: {str(e)}",
                    "exit_code": -1,
                    "execution_time": 0,
                    "memory_used": 0
                }
            except Exception as e:
                return {
                    "output": "",
                    "error": f"Execution error: {str(e)}",
                    "exit_code": -1,
                    "execution_time": 0,
                    "memory_used": 0
                }

    def _build_execution_command(self, config: Dict, filename: str) -> str:
        """Build the execution command for the container"""
        commands = []
        
        # Add compilation step if needed
        if config.get('compile_command'):
            commands.append(config['compile_command'])
        
        # Add execution command with input redirection
        run_cmd = config['run_command']
        if '<' not in run_cmd:  # Add input redirection if not present
            run_cmd += ' < /app/input.txt 2>&1'
        commands.append(run_cmd)
        
        # Combine commands
        return f"sh -c '{' && '.join(commands)}'"

    def _get_memory_usage(self, container) -> int:
        """Get memory usage from container stats"""
        try:
            stats = container.stats(stream=False)
            memory_usage = stats['memory']['usage']
            return memory_usage
        except:
            return 0

    def get_supported_languages(self) -> List[Dict[str, str]]:
        """Get list of supported languages with details"""
        return [
            {
                'id': lang_id,
                'name': lang_id.title(),
                'extension': config['file_ext'],
                'timeout': config['timeout'],
                'memory_limit': config['memory_limit']
            }
            for lang_id, config in self.language_configs.items()
        ]

    def get_execution_status(self, execution_id: str) -> Optional[Dict]:
        """Get status of a running execution"""
        return self.active_executions.get(execution_id)

    def cancel_execution(self, execution_id: str) -> bool:
        """Cancel a running execution"""
        if execution_id in self.active_executions:
            # Implementation would involve stopping the Docker container
            del self.active_executions[execution_id]
            return True
        return False

# Create global instance
real_compiler_service = RealCompilerService()
