import ast
import os
import queue
import re
import tempfile
import threading
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import docker


class RealCompilerService:
    def __init__(self):
        self.client = None
        self.execution_queue = queue.Queue()
        self.active_executions: Dict[str, Dict[str, Any]] = {}
        self.max_code_size = 20000
        self.docker_available = False

        # Docker is mandatory for secure execution.
        self.language_configs = {
            # Interpreted Languages
            "python": {
                "image": "python:3.11-alpine",
                "file_name": "code.py",
                "compile_command": None,
                "run_command": "python /workspace/code.py",
                "timeout": 8,
                "memory_limit": "128m",
                "cpu_limit": 0.35,
            },
            "javascript": {
                "image": "node:20-alpine",
                "file_name": "code.js",
                "compile_command": None,
                "run_command": "node /workspace/code.js",
                "timeout": 8,
                "memory_limit": "128m",
                "cpu_limit": 0.35,
            },
            "bash": {
                "image": "ubuntu:22.04",
                "file_name": "code.sh",
                "compile_command": None,
                "run_command": "bash /workspace/code.sh",
                "timeout": 10,
                "memory_limit": "64m",
                "cpu_limit": 0.25,
            },
            "ruby": {
                "image": "ruby:3.2-alpine",
                "file_name": "code.rb",
                "compile_command": None,
                "run_command": "ruby /workspace/code.rb",
                "timeout": 10,
                "memory_limit": "128m",
                "cpu_limit": 0.35,
            },
            "php": {
                "image": "php:8.2-alpine",
                "file_name": "code.php",
                "compile_command": None,
                "run_command": "php /workspace/code.php",
                "timeout": 8,
                "memory_limit": "128m",
                "cpu_limit": 0.35,
            },
            "r": {
                "image": "rocker/r-base:latest",
                "file_name": "code.R",
                "compile_command": None,
                "run_command": "Rscript /workspace/code.R",
                "timeout": 15,
                "memory_limit": "256m",
                "cpu_limit": 0.6,
            },
            "julia": {
                "image": "julia:1.9-alpine",
                "file_name": "code.jl",
                "compile_command": None,
                "run_command": "julia /workspace/code.jl",
                "timeout": 15,
                "memory_limit": "256m",
                "cpu_limit": 0.6,
            },
            "perl": {
                "image": "perl:5.36-alpine",
                "file_name": "code.pl",
                "compile_command": None,
                "run_command": "perl /workspace/code.pl",
                "timeout": 10,
                "memory_limit": "128m",
                "cpu_limit": 0.35,
            },
            "lua": {
                "image": "lua:5.4",
                "file_name": "code.lua",
                "compile_command": None,
                "run_command": "lua /workspace/code.lua",
                "timeout": 8,
                "memory_limit": "64m",
                "cpu_limit": 0.25,
            },
            
            # Compiled Languages
            "c": {
                "image": "gcc:13",
                "file_name": "code.c",
                "compile_command": "gcc -O2 -o /workspace/program /workspace/code.c",
                "run_command": "/workspace/program",
                "timeout": 10,
                "memory_limit": "192m",
                "cpu_limit": 0.5,
            },
            "cpp": {
                "image": "gcc:13",
                "file_name": "code.cpp",
                "compile_command": "g++ -O2 -std=c++17 -o /workspace/program /workspace/code.cpp",
                "run_command": "/workspace/program",
                "timeout": 10,
                "memory_limit": "256m",
                "cpu_limit": 0.5,
            },
            "java": {
                "image": "openjdk:17-alpine",
                "file_name": "Main.java",
                "compile_command": "javac /workspace/Main.java",
                "run_command": "java -cp /workspace Main",
                "timeout": 12,
                "memory_limit": "256m",
                "cpu_limit": 0.5,
            },
            "go": {
                "image": "golang:1.22-alpine",
                "file_name": "code.go",
                "compile_command": "go build -o /workspace/program /workspace/code.go",
                "run_command": "/workspace/program",
                "timeout": 14,
                "memory_limit": "256m",
                "cpu_limit": 0.6,
            },
            "rust": {
                "image": "rust:1.77-alpine",
                "file_name": "code.rs",
                "compile_command": "rustc -O /workspace/code.rs -o /workspace/program",
                "run_command": "/workspace/program",
                "timeout": 20,
                "memory_limit": "512m",
                "cpu_limit": 0.8,
            },
            "kotlin": {
                "image": "openjdk:17-alpine",
                "file_name": "code.kt",
                "compile_command": "apt-get update && apt-get install -y kotlin && kotlinc /workspace/code.kt -include-runtime -d /workspace/program.jar",
                "run_command": "java -jar /workspace/program.jar",
                "timeout": 15,
                "memory_limit": "256m",
                "cpu_limit": 0.6,
            },
            "swift": {
                "image": "swift:5.9-alpine",
                "file_name": "code.swift",
                "compile_command": "swiftc -O /workspace/code.swift -o /workspace/program",
                "run_command": "/workspace/program",
                "timeout": 15,
                "memory_limit": "256m",
                "cpu_limit": 0.6,
            },
            "typescript": {
                "image": "node:20-alpine",
                "file_name": "code.ts",
                "compile_command": "npm install -g typescript && tsc /workspace/code.ts --outDir /workspace",
                "run_command": "node /workspace/code.js",
                "timeout": 10,
                "memory_limit": "256m",
                "cpu_limit": 0.5,
            },
            "csharp": {
                "image": "mcr.microsoft.com/dotnet/sdk:7.0-alpine",
                "file_name": "Program.cs",
                "compile_command": "dotnet new console -o /workspace && cp /workspace/Program.cs /workspace/Program.cs.bak && dotnet build /workspace -c Release",
                "run_command": "dotnet /workspace/bin/Release/net7.0/workspace.dll",
                "timeout": 15,
                "memory_limit": "512m",
                "cpu_limit": 0.7,
            },
            "scala": {
                "image": "openjdk:17-alpine",
                "file_name": "code.scala",
                "compile_command": "apt-get update && apt-get install -y scala && scalac /workspace/code.scala",
                "run_command": "scala -cp /workspace code",
                "timeout": 15,
                "memory_limit": "256m",
                "cpu_limit": 0.6,
            },
            "groovy": {
                "image": "openjdk:17-alpine",
                "file_name": "code.groovy",
                "compile_command": "apt-get update && apt-get install -y groovy",
                "run_command": "groovy /workspace/code.groovy",
                "timeout": 12,
                "memory_limit": "256m",
                "cpu_limit": 0.5,
            },
        }

        self.blocked_python_modules = {
            "os",
            "socket",
            "subprocess",
            "pty",
            "multiprocessing",
            "ctypes",
            "resource",
            "pwd",
            "grp",
            "signal",
            "fcntl",
            "selectors",
            "pathlib",
            "shutil",
        }
        self.blocked_python_calls = {
            "eval",
            "exec",
            "compile",
            "__import__",
            "open",
            "globals",
            "locals",
            "vars",
            "getattr",
            "setattr",
            "delattr",
        }
        self.blocked_python_attrs = {
            "fork",
            "forkpty",
            "spawn",
            "spawnl",
            "spawnlp",
            "spawnv",
            "spawnvp",
            "system",
            "popen",
            "execl",
            "execle",
            "execlp",
            "execv",
            "execve",
            "execvp",
            "setsid",
            "dup2",
        }
        self.blocked_patterns = {
            "python": [
                r"\b__import__\s*\(",
                r"\b__builtins__\b",
                r"\[[\'\"]__import__[\'\"]\]",
                r"\beval\s*\(",
                r"\bexec\s*\(",
                r"\bopen\s*\(",
                r"\bcompile\s*\(",
                r"\bos\.",
                r"\bsocket\.",
                r"\bsubprocess\.",
            ],
            "javascript": [
                r"require\s*\(\s*['\"]child_process['\"]\s*\)",
                r"require\s*\(\s*['\"]net['\"]\s*\)",
                r"require\s*\(\s*['\"]dgram['\"]\s*\)",
                r"process\.env",
                r"process\.binding",
                r"fs\.readFile|fs\.writeFile|fs\.open|fs\.create",
                r"eval\s*\(",
                r"Function\s*\(",
            ],
            "bash": [
                r"\b\$\(.*\)",
                r"\`.*\`",
                r">\s*/dev/",
                r"rm\s+-rf",
                r"dd\s+if=",
            ],
            "ruby": [
                r"\beval\s*\(",
                r"\b`.*`",
                r"\bsystem\s*\(",
                r"\bexec\s*\(",
                r"\bsocket\.",
            ],
            "php": [
                r"\beval\s*\(",
                r"\bsystem\s*\(",
                r"\bpassthru\s*\(",
                r"\bshell_exec\s*\(",
                r"\bproc_open\s*\(",
                r"\bfopen\s*\(",
                r"\bfile_get_contents\s*\(",
            ],
            "r": [
                r"\bsystem\s*\(",
                r"\bsystem2\s*\(",
                r"\bsource\s*\(",
                r"\bdyn\.load\s*\(",
                r"\b\.Call\s*\(",
            ],
            "julia": [
                r"\brun\s*\(",
                r"\b@system\s*",
                r"\bccall\s*\(",
                r"\bdlopen\s*\(",
                r"\bsocket\(",
            ],
            "perl": [
                r"\beval\s*\{",
                r"\bsystem\s*\(",
                r"\bexec\s*\(",
                r"\bopen\s*\(",
                r"\bsocket\s*\(",
            ],
            "lua": [
                r"\bos\.execute\s*\(",
                r"\bloadstring\s*\(",
                r"\bdebug\.getfenv\s*\(",
                r"\bio\.open\s*\(",
            ],
            "java": [
                r"Runtime\.getRuntime\s*\(",
                r"ProcessBuilder\s*\(",
                r"java\.net\.",
                r"java\.nio\.file\.",
                r"System\.getenv\s*\(",
                r"System\.load\s*\(",
                r"System\.loadLibrary\s*\(",
            ],
            "c": [
                r"\bsystem\s*\(",
                r"\bpopen\s*\(",
                r"\bfork\s*\(",
                r"\bexec[a-z]*\s*\(",
                r"\bsocket\s*\(",
                r"\bopen\s*\(",
                r"\bfopen\s*\(",
            ],
            "cpp": [
                r"\bsystem\s*\(",
                r"\bpopen\s*\(",
                r"\bfork\s*\(",
                r"\bexec[a-z]*\s*\(",
                r"\bsocket\s*\(",
                r"\bopen\s*\(",
            ],
            "go": [
                r"\bexec\.Command\s*\(",
                r"\bnet\.",
                r"\bos\.StartProcess\s*\(",
                r"\bos\.Exec\s*\(",
                r"\bos\.Open\s*\(",
            ],
            "rust": [
                r"std::process::Command",
                r"std::net::",
                r"unsafe\s*\{",
                r"std::fs::File::open",
            ],
            "kotlin": [
                r"Runtime\.getRuntime\s*\(",
                r"ProcessBuilder\s*\(",
                r"Runtime\.exec\s*\(",
            ],
            "swift": [
                r"Process\(\)",
                r"FileHandle\.open",
                r"Darwin\.system",
            ],
            "typescript": [
                r"require\s*\(\s*['\"]child_process['\"]\s*\)",
                r"eval\s*\(",
                r"Function\s*\(",
            ],
            "csharp": [
                r"System\.Diagnostics\.Process\.Start",
                r"System\.Net\.",
                r"System\.IO\.File\.",
                r"Assembly\.Load",
            ],
            "scala": [
                r"scala\.sys\.process\.Process",
                r"Runtime\.getRuntime\s*\(",
                r"java\.net\.",
            ],
            "groovy": [
                r"\bexecute\s*\(",
                r"\bsystem\s*\(",
                r"ProcessGroovyMethods\.getText\s*\(",
            ],
        }

        self.start_execution_worker()

    def _get_docker_client(self):
        if self.client is None:
            try:
                self.client = docker.from_env()
                self.client.ping()
                self.docker_available = True
            except Exception:
                self.docker_available = False
                self.client = None
        return self.client

    def start_execution_worker(self):
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

    def _execute_task(self, _execution_task):
        # Queue worker placeholder kept for backward compatibility.
        return None

    def execute_code(self, code: str, language: str, input_data: str = "", execution_id: str = None) -> Dict[str, Any]:
        language = (language or "").lower().strip()
        
        # Language aliases mapping
        language_aliases = {
            "js": "javascript",
            "ts": "typescript",
            "py": "python",
            "c++": "cpp",
            "cs": "csharp",
            "rb": "ruby",
            "pl": "perl",
            "kt": "kotlin",
            "swift": "swift",
            "scala": "scala",
            "groovy": "groovy",
            "sh": "bash",
            "bash": "bash",
            "r": "r",
            "lua": "lua",
            "julia": "julia",
            "go": "go",
            "rust": "rust",
            "java": "java",
            "c": "c",
        }
        
        # Convert alias to actual language name
        if language in language_aliases:
            language = language_aliases[language]

        if language not in self.language_configs:
            supported = ", ".join(sorted(self.language_configs.keys()))
            return {"error": f"Language '{language}' not supported. Supported: {supported}"}

        if not execution_id:
            execution_id = str(uuid.uuid4())

        if not code or not code.strip():
            return {"error": "No code provided", "execution_id": execution_id, "language": language}

        if len(code) > self.max_code_size:
            return {
                "error": f"Code too large. Maximum size is {self.max_code_size} characters.",
                "execution_id": execution_id,
                "language": language,
                "blocked": True,
            }

        ok, violations = self._validate_code_static(code, language)
        if not ok:
            return {
                "error": "Code rejected by security policy",
                "execution_id": execution_id,
                "language": language,
                "blocked": True,
                "security_violations": violations,
            }

        config = self.language_configs[language]
        execution_context = {
            "execution_id": execution_id,
            "code": code,
            "language": language,
            "input_data": input_data or "",
            "config": config,
            "start_time": datetime.utcnow(),
            "status": "running",
        }

        try:
            self.active_executions[execution_id] = execution_context
            result = self._execute_in_container(execution_context)
            execution_context["status"] = "completed"
            execution_context["end_time"] = datetime.utcnow()
            execution_context["result"] = result

            if result.get("error"):
                return {
                    "success": False,
                    "execution_id": execution_id,
                    "output": result.get("output", ""),
                    "error": result.get("error", ""),
                    "execution_time": result.get("execution_time", 0),
                    "memory_used": result.get("memory_used", 0),
                    "exit_code": result.get("exit_code", -1),
                    "language": language,
                    "timestamp": datetime.utcnow().isoformat(),
                }

            return {
                "success": True,
                "execution_id": execution_id,
                "output": result.get("output", ""),
                "error": "",
                "execution_time": result.get("execution_time", 0),
                "memory_used": result.get("memory_used", 0),
                "exit_code": result.get("exit_code", 0),
                "language": language,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            return {
                "error": f"Execution failed: {str(e)}",
                "execution_id": execution_id,
                "language": language,
            }
        finally:
            self.active_executions.pop(execution_id, None)

    def _validate_code_static(self, code: str, language: str) -> Tuple[bool, List[str]]:
        violations: List[str] = []

        # Generic payload patterns often used for sandbox escape and exfiltration.
        generic_patterns = [
            r"/bin/sh",
            r"/bin/bash",
            r"nc\s+-l|nc\s+-e",
            r"reverse\s*shell",
            r"bash\s+-i",
            r"wget\s+http|curl\s+http",
        ]
        for pattern in generic_patterns:
            if re.search(pattern, code, flags=re.IGNORECASE):
                violations.append(f"Blocked high-risk pattern: {pattern}")

        if language == "python":
            try:
                tree = ast.parse(code)
            except SyntaxError as e:
                return False, [f"Python syntax error: {e}"]

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        base = alias.name.split(".")[0]
                        if base in self.blocked_python_modules:
                            violations.append(f"Blocked module import: {base}")

                if isinstance(node, ast.ImportFrom):
                    if node.module:
                        base = node.module.split(".")[0]
                        if base in self.blocked_python_modules:
                            violations.append(f"Blocked module import: {base}")

                if isinstance(node, ast.Call):
                    fn = node.func
                    if isinstance(fn, ast.Name) and fn.id in self.blocked_python_calls:
                        violations.append(f"Blocked function call: {fn.id}")
                    if isinstance(fn, ast.Attribute) and fn.attr in self.blocked_python_attrs:
                        violations.append(f"Blocked dangerous call: {fn.attr}")

                # Reject any access to __builtins__ regardless of call site shape.
                if isinstance(node, ast.Name) and node.id == "__builtins__":
                    violations.append("Blocked access to __builtins__")
                if isinstance(node, ast.Attribute) and node.attr == "__builtins__":
                    violations.append("Blocked access to __builtins__")

                # Reject subscript selecting '__import__' as a string key,
                # e.g. __builtins__.__dict__['__import__'].
                if isinstance(node, ast.Subscript):
                    slice_node = node.slice
                    # ast.Index wrapper was removed in Python 3.9; handle both.
                    if isinstance(slice_node, ast.Index):
                        slice_node = slice_node.value  # type: ignore[attr-defined]
                    if (
                        isinstance(slice_node, ast.Constant)
                        and slice_node.value == "__import__"
                    ):
                        violations.append("Blocked indirect __import__ access via subscript")

        for pattern in self.blocked_patterns.get(language, []):
            if re.search(pattern, code, flags=re.IGNORECASE | re.MULTILINE):
                violations.append(f"Blocked pattern for {language}: {pattern}")

        return len(violations) == 0, violations

    def _execute_in_container(self, context: Dict[str, Any]) -> Dict[str, Any]:
        docker_client = self._get_docker_client()
        if docker_client is None or not self.docker_available:
            return {
                "output": "",
                "error": "Docker service is not available. Secure execution requires Docker.",
                "exit_code": -1,
                "execution_time": 0,
                "memory_used": 0,
            }

        code = context["code"]
        language = context["language"]
        input_data = context["input_data"]
        config = context["config"]

        with tempfile.TemporaryDirectory(prefix="openlearnx_exec_") as temp_dir:
            os.chmod(temp_dir, 0o755)
            code_path = os.path.join(temp_dir, config["file_name"])
            with open(code_path, "w", encoding="utf-8") as f:
                f.write(code)
            os.chmod(code_path, 0o644)

            input_path = os.path.join(temp_dir, "input.txt")
            with open(input_path, "w", encoding="utf-8") as f:
                f.write(input_data)
            os.chmod(input_path, 0o644)

            container = None
            start = time.time()
            try:
                cpu_quota = int(float(config["cpu_limit"]) * 100000)
                container = docker_client.containers.run(
                    config["image"],
                    command=self._build_execution_command(config),
                    volumes={temp_dir: {"bind": "/workspace", "mode": "rw"}},
                    working_dir="/workspace",
                    mem_limit=config["memory_limit"],
                    memswap_limit=config["memory_limit"],
                    cpu_period=100000,
                    cpu_quota=cpu_quota,
                    pids_limit=64,
                    network_mode="none",
                    detach=True,
                    stdin_open=False,
                    tty=False,
                    cap_drop=["ALL"],
                    security_opt=["no-new-privileges:true"],
                    read_only=True,
                    user="65534:65534",
                    tmpfs={
                        "/tmp": "rw,noexec,nosuid,size=64m",
                    },
                    labels={
                        "openlearnx.sandbox": "true",
                        "openlearnx.execution_id": context["execution_id"],
                    },
                )

                wait_result = container.wait(timeout=config["timeout"] + 2)
                logs = container.logs(stdout=True, stderr=True).decode("utf-8", errors="replace")
                status_code = int(wait_result.get("StatusCode", -1))
                execution_time = round(time.time() - start, 3)
                memory_used = self._get_memory_usage(container)

                if status_code != 0:
                    return {
                        "output": "",
                        "error": self._sanitize_error_output(language, logs.strip() or f"Runtime exited with code {status_code}"),
                        "exit_code": status_code,
                        "execution_time": execution_time,
                        "memory_used": memory_used,
                    }

                return {
                    "output": logs.strip(),
                    "error": "",
                    "exit_code": 0,
                    "execution_time": execution_time,
                    "memory_used": memory_used,
                }

            except Exception as e:
                if container is not None:
                    try:
                        container.kill()
                    except Exception:
                        pass
                return {
                    "output": "",
                    "error": self._sanitize_error_output(language, f"Execution failed or timed out: {str(e)}"),
                    "exit_code": -1,
                    "execution_time": round(time.time() - start, 3),
                    "memory_used": 0,
                }
            finally:
                if container is not None:
                    try:
                        container.remove(force=True)
                    except Exception:
                        pass

    def _sanitize_error_output(self, language: str, raw_error: str) -> str:
        if not raw_error:
            return "Runtime error"

        text = str(raw_error)
        # Avoid leaking container-internal paths.
        text = re.sub(r"/workspace/", "", text)
        lines = [line.rstrip() for line in text.splitlines() if line.strip()]

        if language == "python":
            cleaned: List[str] = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("Traceback"):
                    continue
                if stripped.startswith("File "):
                    continue
                if stripped.startswith("^"):
                    continue
                cleaned.append(stripped)

            for line in reversed(cleaned):
                if "Error" in line or "Exception" in line:
                    return line
            if cleaned:
                return cleaned[-1]
            return "Python runtime error"

        # Keep non-python errors concise.
        tail = lines[-3:] if len(lines) > 3 else lines
        sanitized = "\n".join(tail).strip()
        return sanitized or "Runtime error"

    def _build_execution_command(self, config: Dict[str, Any]) -> str:
        commands: List[str] = []
        if config.get("compile_command"):
            commands.append(config["compile_command"])

        run_cmd = config["run_command"]
        if "< /workspace/input.txt" not in run_cmd:
            run_cmd = f"{run_cmd} < /workspace/input.txt"

        # ulimit adds an additional in-container CPU-time and file-size restriction.
        shell_cmd = " && ".join(commands + [run_cmd])
        return f"sh -c 'ulimit -t {config['timeout']} -f 1024; {shell_cmd} 2>&1'"

    def _get_memory_usage(self, container) -> int:
        try:
            stats = container.stats(stream=False)
            return int(stats.get("memory_stats", {}).get("usage", 0))
        except Exception:
            return 0

    def get_supported_languages(self) -> List[Dict[str, str]]:
        return [
            {
                "id": lang_id,
                "name": lang_id.title(),
                "extension": os.path.splitext(config["file_name"])[1],
                "timeout": config["timeout"],
                "memory_limit": config["memory_limit"],
            }
            for lang_id, config in self.language_configs.items()
        ]

    def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        return self.active_executions.get(execution_id)

    def cancel_execution(self, execution_id: str) -> bool:
        if execution_id in self.active_executions:
            del self.active_executions[execution_id]
            return True
        return False


try:
    real_compiler_service = RealCompilerService()
except Exception as e:
    print(f"WARNING: Failed to initialize RealCompilerService: {e}")
    real_compiler_service = RealCompilerService()
