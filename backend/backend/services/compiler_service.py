import docker
import tempfile
import os  # ✅ Make sure this is imported
import subprocess
import time
from typing import Dict, List, Any
import json

class CompilerService:
    def __init__(self):
        self.client = docker.from_env()
        self.language_configs = {
            'python': {
                'image': 'python:3.9-alpine',
                'file_ext': '.py',
                'run_command': 'python /app/solution{ext}',
                'timeout': 10
            },
            'java': {
                'image': 'openjdk:11-alpine',
                'file_ext': '.java',
                'run_command': 'cd /app && javac Solution.java && java Solution',
                'timeout': 15
            },
            'c': {
                'image': 'gcc:9-alpine',
                'file_ext': '.c',
                'run_command': 'cd /app && gcc -o solution solution.c && ./solution',
                'timeout': 15
            },
            'bash': {
                'image': 'bash:5-alpine',
                'file_ext': '.sh',
                'run_command': 'bash /app/solution.sh',
                'timeout': 10
            }
        }

    # ... rest of your compiler service code

# Global compiler service instance
compiler_service = CompilerService()
