import os
import asyncio
import logging
import uuid
import random
import string
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, create_access_token
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
import hashlib
import time
import signal
import io
from contextlib import redirect_stdout, redirect_stderr

# Load environment variables
load_dotenv()

# Services
from mongo_service import MongoService
from web3_service import Web3Service

# ✅ CORRECTED: Import dashboard blueprint with comprehensive endpoints
try:
    from routes.dashboard import bp as dashboard_bp
    DASHBOARD_AVAILABLE = True
    print("✅ Dashboard routes with comprehensive analytics available")
except ImportError:
    dashboard_bp = None
    DASHBOARD_AVAILABLE = False
    print("⚠️ Dashboard routes not available")

# Blueprints - Updated order and error handling
blueprints_to_register = [
    ('auth', '/api/auth'),
    ('test_flow', '/api/test'),
    ('certificate', '/api/certificate'), 
    ('dashboard', '/api/dashboard'),  # ✅ Dashboard with comprehensive features
    ('courses', '/api/courses'),
    ('quizzes', '/api/quizzes'),
    ('admin', '/api/admin'),
    ('exam', '/api/exam'),
    ('compiler', '/api/compiler'),
    ('adaptive_quiz', '/api/adaptive-quiz'),
]

# Optional services with better error handling
services_status = {}

try:
    from services.wallet_service import wallet_service
    services_status['wallet'] = True
except ImportError as e:
    wallet_service = None
    services_status['wallet'] = False
    print(f"⚠️ Wallet service unavailable: {str(e)}")

try:
    from services.real_compiler_service import real_compiler_service
    services_status['compiler'] = True
except ImportError as e:
    real_compiler_service = None
    services_status['compiler'] = False
    print(f"⚠️ Real compiler service unavailable: {str(e)}")

# ✅ AI Quiz Service Integration with graceful fallback
try:
    from services.ai_quiz_service import AdaptiveQuizMasterLLM
    ai_service = AdaptiveQuizMasterLLM()
    services_status['ai_quiz'] = True
    print("🤖 AI Quiz Service initialized successfully")
except Exception as e:
    ai_service = None
    services_status['ai_quiz'] = False
    print(f"⚠️ AI Quiz Service unavailable: {str(e)}")
    print("🔄 Server will continue without AI features")

# Utility functions
def generate_room_code(length=6):
    """Generate unique room code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def check_docker_availability():
    """Check if Docker is available"""
    try:
        import docker
        docker.from_env().ping()
        return True
    except:
        return False

# ✅ ENHANCED: Flask app configuration with your .env variables
app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'your-super-secret-key-change-this-in-production-openlearnx-2024'),
    MONGODB_URI=os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'),
    WEB3_PROVIDER_URL=os.getenv('WEB3_PROVIDER_URL', 'http://127.0.0.1:8545'),
    CONTRACT_ADDRESS=os.getenv('CONTRACT_ADDRESS', '0x739f0aCef964f87Bc7974D972a811f8417d74B4C'),
    DEPLOYER_PRIVATE_KEY=os.getenv('DEPLOYER_PRIVATE_KEY'),
    MINTER_PRIVATE_KEY=os.getenv('MINTER_PRIVATE_KEY'),
    ADMIN_TOKEN=os.getenv('ADMIN_TOKEN', 'admin-secret-key'),
    # ✅ JWT Configuration from your .env
    JWT_SECRET_KEY=os.getenv('JWT_SECRET_KEY', 'openlearnx-jwt-secret-key-change-in-production'),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=int(os.getenv('JWT_EXPIRATION_HOURS', 168))),
    # ✅ IPFS Configuration from your .env
    IPFS_GATEWAY=os.getenv('IPFS_GATEWAY', 'https://ipfs.infura.io:5001'),
    IPFS_PROJECT_ID=os.getenv('IPFS_PROJECT_ID'),
    IPFS_PROJECT_SECRET=os.getenv('IPFS_PROJECT_SECRET'),
    # ✅ Server Configuration from your .env
    PORT=int(os.getenv('PORT', 5000)),
    HOST=os.getenv('HOST', '0.0.0.0'),
    # ✅ Dashboard specific configs
    DASHBOARD_CACHE_TIMEOUT=int(os.getenv('DASHBOARD_CACHE_TIMEOUT', 300)),
    MAX_ACTIVITY_RECORDS=int(os.getenv('MAX_ACTIVITY_RECORDS', 1000))
)

# ✅ Initialize JWT with your configuration
jwt = JWTManager(app)

# ✅ ENHANCED CORS configuration for professional dashboard
CORS(app, resources={r"/api/*": {
    "origins": [
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Development
        "https://openlearnx.vercel.app"  # Production (if deployed)
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "allow_headers": [
        "Content-Type", 
        "Authorization", 
        "Accept", 
        "Origin", 
        "X-Requested-With",
        "X-User-ID",  # Custom header for user identification
        "X-Session-Token",
        "X-Firebase-Token"  # Firebase authentication
    ],
    "supports_credentials": True,
    "expose_headers": ["Authorization", "X-Total-Count", "X-Rate-Limit"]
}})

# Enhanced logging with your configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('openlearnx.log')
    ]
)
logger = logging.getLogger(__name__)

# ✅ ENHANCED: Initialize services with your environment configuration
def initialize_services():
    """Initialize all services with your environment configuration"""
    services_initialized = {}
    
    # MongoDB Service with your URI
    try:
        mongo_service = MongoService(app.config['MONGODB_URI'])
        app.config['MONGO_SERVICE'] = mongo_service
        services_initialized['mongodb'] = True
        logger.info(f"✅ MongoService initialized with URI: {app.config['MONGODB_URI']}")
    except Exception as e:
        services_initialized['mongodb'] = False
        logger.error(f"❌ Failed MongoService init: {e}")

    # Web3 Service with your Anvil configuration
    try:
        web3_service = Web3Service(app.config['WEB3_PROVIDER_URL'], app.config['CONTRACT_ADDRESS'])
        app.config['WEB3_SERVICE'] = web3_service
        services_initialized['web3'] = True
        logger.info(f"✅ Web3Service initialized with Anvil: {app.config['WEB3_PROVIDER_URL']}")
        logger.info(f"✅ Contract Address: {app.config['CONTRACT_ADDRESS']}")
    except Exception as e:
        services_initialized['web3'] = False
        logger.error(f"❌ Failed Web3Service init: {e}")
    
    # Optional services
    if services_status['wallet']:
        app.config['WALLET_SERVICE'] = wallet_service
        logger.info("✅ Wallet service configured")
    if services_status['compiler']:
        app.config['REAL_COMPILER_SERVICE'] = real_compiler_service
        logger.info("✅ Real compiler service configured")
    if services_status['ai_quiz']:
        app.config['AI_QUIZ_SERVICE'] = ai_service
        logger.info("✅ AI Quiz service configured")
    
    return services_initialized

# Initialize services
service_status = initialize_services()

# ✅ ENHANCED: Dynamic blueprint registration with better error handling
def register_blueprints():
    """Register all blueprints with enhanced error handling"""
    blueprints_registered = []
    blueprints_failed = []
    
    blueprint_modules = {}
    
    # Import blueprints dynamically
    for bp_name, prefix in blueprints_to_register:
        try:
            if bp_name == 'dashboard' and not DASHBOARD_AVAILABLE:
                print(f"⚠️ Skipping {bp_name} - not available")
                continue
                
            module = __import__(f'routes.{bp_name}', fromlist=['bp'])
            blueprint_modules[bp_name] = (module.bp, prefix)
            
        except ImportError as e:
            blueprints_failed.append((prefix, f"Import error: {str(e)}"))
            logger.error(f"❌ Failed to import {bp_name}: {e}")
            continue
    
    # Register imported blueprints
    for bp_name, (blueprint, prefix) in blueprint_modules.items():
        try:
            app.register_blueprint(blueprint, url_prefix=prefix)
            blueprints_registered.append(prefix)
            logger.info(f"✅ Registered blueprint {prefix}")
        except Exception as e:
            blueprints_failed.append((prefix, str(e)))
            logger.error(f"❌ Blueprint {prefix} registration failed: {e}")
    
    return blueprints_registered, blueprints_failed

# Register blueprints
blueprints_registered, blueprints_failed = register_blueprints()

# Database connection
def get_db():
    """Get MongoDB database connection"""
    try:
        client = MongoClient(app.config['MONGODB_URI'])
        return client.openlearnx
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

# ===================================================================
# ✅ COMPREHENSIVE DASHBOARD API ENDPOINTS (Direct Integration)
# ===================================================================

@app.route('/api/dashboard/comprehensive-stats', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_comprehensive_stats():
    """Get comprehensive user statistics for professional dashboard"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        # Get user ID from JWT or Firebase token
        current_user = get_jwt_identity()
        firebase_token = request.headers.get('X-Firebase-Token')
        user_id = current_user or request.headers.get('X-User-ID') or 'demo_user'
        
        logger.info(f"📊 Fetching comprehensive stats for user: {user_id}")
        
        db = get_db()
        if not db:
            raise Exception("Database connection failed")
        
        # Fetch real user data with comprehensive analytics
        user_stats = db.user_stats.find_one({"user_id": user_id})
        courses = list(db.user_courses.find({"user_id": user_id}))
        quizzes = list(db.user_quizzes.find({"user_id": user_id}))
        coding_submissions = list(db.user_submissions.find({"user_id": user_id}))
        blockchain_data = db.user_blockchain.find_one({"user_id": user_id})
        achievements = list(db.user_achievements.find({"user_id": user_id}))
        
        # Calculate real-time statistics
        current_time = datetime.now()
        join_date = user_stats.get('join_date', current_time - timedelta(days=30)) if user_stats else current_time - timedelta(days=30)
        days_since_join = (current_time - join_date).days if (current_time - join_date).days > 0 else 30
        
        # ✅ ENHANCED: Calculate coding streak with proper logic
        coding_streak = calculate_coding_streak(db, user_id)
        longest_streak = max(user_stats.get('longest_streak', coding_streak) if user_stats else coding_streak, coding_streak)
        
        # ✅ ENHANCED: Weekly activity calculation
        weekly_activity = calculate_weekly_activity(db, user_id)
        
        # ✅ ENHANCED: Skill levels calculation
        skill_levels = calculate_skill_levels(courses, quizzes, coding_submissions)
        
        # ✅ COMPREHENSIVE: Professional statistics
        comprehensive_stats = {
            "total_xp": calculate_total_xp(courses, quizzes, coding_submissions, achievements),
            "courses_completed": len([c for c in courses if c.get('completed', False)]),
            "coding_problems_solved": len(coding_submissions),
            "quiz_accuracy": calculate_quiz_accuracy(quizzes),
            "coding_streak": coding_streak,
            "longest_streak": longest_streak,
            "total_courses": len(courses),
            "total_quizzes": len(quizzes),
            "global_rank": calculate_global_rank(db, user_id),
            "weekly_activity": weekly_activity,
            "monthly_goals": {
                "target": 20,
                "completed": len([a for a in courses + quizzes + coding_submissions 
                               if datetime.fromisoformat(str(a.get('completed_at', current_time))).month == current_time.month])
            },
            "blockchain": {
                "wallet_connected": bool(blockchain_data and blockchain_data.get('wallet_address')),
                "total_earned": blockchain_data.get('total_earned', 0) if blockchain_data else 0,
                "transactions": len(blockchain_data.get('transactions', [])) if blockchain_data else 0,
                "certificates": len([a for a in achievements if a.get('type') == 'certificate']),
                "verified_achievements": len([a for a in achievements if a.get('blockchain_verified', False)])
            },
            "learning_analytics": {
                "time_spent_hours": calculate_total_time_spent(courses, quizzes, coding_submissions),
                "average_session_minutes": calculate_average_session_time(db, user_id),
                "completion_rate": calculate_completion_rate(courses, quizzes),
                "favorite_topics": calculate_favorite_topics(courses, quizzes),
                "skill_levels": skill_levels
            },
            "recent_achievements": [
                {
                    "id": str(a.get('_id', uuid.uuid4())),
                    "title": a.get('title', 'Achievement'),
                    "description": a.get('description', 'Great work!'),
                    "earned_at": a.get('earned_at', current_time).isoformat() if isinstance(a.get('earned_at'), datetime) else str(a.get('earned_at', current_time.isoformat())),
                    "points": a.get('points', 100),
                    "rarity": a.get('rarity', 'common')
                } for a in achievements[-5:]  # Last 5 achievements
            ]
        }
        
        # ✅ Update user activity timestamp
        update_user_activity(db, user_id)
        
        logger.info(f"✅ Comprehensive stats calculated for user {user_id}")
        return jsonify({
            "success": True,
            "data": comprehensive_stats,
            "timestamp": current_time.isoformat(),
            "user_id": user_id,
            "cache_duration": app.config['DASHBOARD_CACHE_TIMEOUT']
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching comprehensive stats: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "fallback_available": True
        }), 500

@app.route('/api/dashboard/recent-activity', methods=['GET', 'OPTIONS'])
@jwt_required(optional=True)
def get_recent_activity():
    """Get recent user activity for professional dashboard"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        current_user = get_jwt_identity()
        user_id = current_user or request.headers.get('X-User-ID') or 'demo_user'
        
        logger.info(f"📋 Fetching recent activity for user: {user_id}")
        
        db = get_db()
        if not db:
            raise Exception("Database connection failed")
        
        activities = []
        max_records = app.config['MAX_ACTIVITY_RECORDS']
        
        # ✅ ENHANCED: Fetch recent activities with better formatting
        activity_sources = [
            (db.user_courses, "course", "Course Activity", 100),
            (db.user_quizzes, "quiz", "Quiz Activity", 50),
            (db.user_submissions, "coding", "Coding Challenge", 75),
            (db.user_achievements, "achievement", "Achievement", 200),
            (db.user_certificates, "certificate", "Certificate", 300)
        ]
        
        for collection, activity_type, default_title, default_points in activity_sources:
            try:
                recent_items = collection.find(
                    {"user_id": user_id}
                ).sort([("completed_at", -1), ("submitted_at", -1), ("earned_at", -1), ("issued_at", -1)]).limit(max_records // len(activity_sources))
                
                for item in recent_items:
                    # Determine the completion date field
                    completed_at = (
                        item.get('completed_at') or 
                        item.get('submitted_at') or 
                        item.get('earned_at') or 
                        item.get('issued_at') or 
                        datetime.now()
                    )
                    
                    if isinstance(completed_at, str):
                        try:
                            completed_at = datetime.fromisoformat(completed_at)
                        except:
                            completed_at = datetime.now()
                    
                    activities.append({
                        "id": str(item.get('_id', uuid.uuid4())),
                        "type": activity_type,
                        "title": item.get('title', item.get('name', default_title)),
                        "description": format_activity_description(item, activity_type),
                        "completed_at": completed_at.isoformat(),
                        "points_earned": item.get('points', item.get('points_earned', default_points)),
                        "success_rate": item.get('score', item.get('completion_percentage', 100)),
                        "difficulty": item.get('difficulty', 'Intermediate'),
                        "blockchain_verified": item.get('blockchain_verified', False)
                    })
            except Exception as e:
                logger.warning(f"⚠️ Failed to fetch {activity_type} activities: {e}")
                continue
        
        # Sort all activities by completion date
        activities.sort(key=lambda x: x['completed_at'], reverse=True)
        
        logger.info(f"✅ Found {len(activities)} recent activities for user {user_id}")
        return jsonify({
            "success": True,
            "data": activities[:50],  # Return last 50 activities
            "total_count": len(activities)
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching recent activity: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/dashboard/global-leaderboard', methods=['GET', 'OPTIONS'])
def get_global_leaderboard():
    """Get global leaderboard for professional dashboard"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        logger.info("🏆 Fetching global leaderboard")
        
        db = get_db()
        if not db:
            raise Exception("Database connection failed")
        
        # ✅ ENHANCED: Calculate leaderboard with comprehensive metrics
        pipeline = [
            {
                "$lookup": {
                    "from": "user_profiles",
                    "localField": "user_id",
                    "foreignField": "user_id",
                    "as": "profile"
                }
            },
            {
                "$addFields": {
                    "profile": {"$arrayElemAt": ["$profile", 0]}
                }
            },
            {
                "$project": {
                    "user_id": 1,
                    "total_xp": {"$ifNull": ["$total_xp", 0]},
                    "current_streak": {"$ifNull": ["$current_streak", 0]},
                    "username": {"$ifNull": ["$profile.display_name", {"$concat": ["User", {"$substr": ["$user_id", -4, -1]}]}]},
                    "avatar": {"$ifNull": ["$profile.avatar_url", {"$concat": ["https://api.dicebear.com/7.x/avataaars/svg?seed=", "$user_id"]}]},
                    "badges": {"$ifNull": ["$profile.badges", []]}
                }
            },
            {"$sort": {"total_xp": -1}},
            {"$limit": 100}
        ]
        
        leaderboard_data = list(db.user_stats.aggregate(pipeline))
        
        leaderboard = []
        for rank, user_data in enumerate(leaderboard_data, 1):
            leaderboard.append({
                "rank": rank,
                "username": user_data.get("username"),
                "total_xp": user_data.get("total_xp", 0),
                "streak": user_data.get("current_streak", 0),
                "avatar": user_data.get("avatar"),
                "badges": user_data.get("badges", [])
            })
        
        logger.info(f"✅ Global leaderboard generated with {len(leaderboard)} users")
        return jsonify({
            "success": True,
            "data": leaderboard
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching global leaderboard: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/dashboard/update-streak', methods=['POST', 'OPTIONS'])
@jwt_required(optional=True)
def update_daily_streak():
    """Update user's daily coding streak"""
    if request.method == "OPTIONS":
        return jsonify({'status': 'ok'})
    
    try:
        current_user = get_jwt_identity()
        user_id = current_user or request.headers.get('X-User-ID') or 'demo_user'
        
        logger.info(f"🔥 Updating streak for user: {user_id}")
        
        db = get_db()
        if not db:
            raise Exception("Database connection failed")
        
        current_streak = update_user_streak(db, user_id)
        
        return jsonify({
            "success": True,
            "current_streak": current_streak,
            "message": f"Streak updated to {current_streak} days!",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Error updating streak: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ===================================================================
# ✅ ENHANCED HELPER FUNCTIONS FOR REAL DATA CALCULATION
# ===================================================================

def calculate_total_xp(courses, quizzes, submissions, achievements):
    """Calculate total experience points"""
    course_xp = len(courses) * 100
    quiz_xp = sum([q.get('score', 0) for q in quizzes])
    coding_xp = len(submissions) * 75
    achievement_xp = sum([a.get('points', 0) for a in achievements])
    
    return course_xp + quiz_xp + coding_xp + achievement_xp

def calculate_coding_streak(db, user_id):
    """Calculate current coding streak for user with enhanced logic"""
    try:
        submissions = list(db.user_submissions.find(
            {"user_id": user_id}
        ).sort("submitted_at", -1))
        
        if not submissions:
            return 0
        
        current_date = datetime.now().date()
        streak = 0
        checked_dates = set()
        
        # Check consecutive days
        for submission in submissions:
            submission_date = submission.get('submitted_at')
            if isinstance(submission_date, str):
                try:
                    submission_date = datetime.fromisoformat(submission_date).date()
                except:
                    continue
            elif isinstance(submission_date, datetime):
                submission_date = submission_date.date()
            else:
                continue
            
            if submission_date in checked_dates:
                continue
            checked_dates.add(submission_date)
            
            expected_date = current_date - timedelta(days=streak)
            
            if submission_date == expected_date:
                streak += 1
            else:
                break
        
        return streak
    except Exception as e:
        logger.error(f"Error calculating coding streak: {e}")
        return 0

def calculate_weekly_activity(db, user_id):
    """Calculate activity for last 7 days with enhanced metrics"""
    try:
        current_date = datetime.now()
        weekly_activity = []
        
        for i in range(7):
            day_start = current_date - timedelta(days=6-i)
            day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # Count activities for this day across all collections
            activity_count = 0
            
            # Course activities
            activity_count += db.user_courses.count_documents({
                "user_id": user_id,
                "completed_at": {"$gte": day_start, "$lt": day_end}
            })
            
            # Quiz activities
            activity_count += db.user_quizzes.count_documents({
                "user_id": user_id,
                "completed_at": {"$gte": day_start, "$lt": day_end}
            })
            
            # Coding activities
            activity_count += db.user_submissions.count_documents({
                "user_id": user_id,
                "submitted_at": {"$gte": day_start, "$lt": day_end}
            })
            
            weekly_activity.append(activity_count)
        
        return weekly_activity
    except Exception as e:
        logger.error(f"Error calculating weekly activity: {e}")
        return [0] * 7

def calculate_quiz_accuracy(quizzes):
    """Calculate average quiz accuracy with enhanced logic"""
    if not quizzes:
        return 0
    
    scores = [q.get('score', 0) for q in quizzes if q.get('score') is not None]
    return sum(scores) / len(scores) if scores else 0

def calculate_global_rank(db, user_id):
    """Calculate user's global rank with enhanced algorithm"""
    try:
        user_stats = db.user_stats.find_one({"user_id": user_id})
        if not user_stats:
            return 999
        
        user_xp = user_stats.get('total_xp', 0)
        higher_ranked = db.user_stats.count_documents({
            "total_xp": {"$gt": user_xp}
        })
        
        return higher_ranked + 1
    except Exception as e:
        logger.error(f"Error calculating global rank: {e}")
        return 999

def calculate_skill_levels(courses, quizzes, submissions):
    """Calculate skill levels based on activities with enhanced categorization"""
    skills = {
        'Frontend': 0,
        'Backend': 0,
        'Blockchain': 0,
        'AI/ML': 0,
        'DevOps': 0,
        'Database': 0,
        'Mobile': 0
    }
    
    # Enhanced skill categorization
    skill_keywords = {
        'Frontend': ['react', 'frontend', 'css', 'html', 'javascript', 'vue', 'angular', 'ui', 'ux'],
        'Backend': ['backend', 'api', 'server', 'node', 'express', 'django', 'flask', 'spring'],
        'Blockchain': ['blockchain', 'web3', 'smart', 'solidity', 'ethereum', 'crypto', 'defi'],
        'AI/ML': ['ai', 'ml', 'machine', 'learning', 'neural', 'tensorflow', 'pytorch', 'data'],
        'DevOps': ['devops', 'docker', 'deploy', 'kubernetes', 'aws', 'azure', 'cloud', 'ci/cd'],
        'Database': ['database', 'sql', 'mongodb', 'postgres', 'mysql', 'redis', 'nosql'],
        'Mobile': ['mobile', 'android', 'ios', 'react-native', 'flutter', 'swift', 'kotlin']
    }
    
    # Calculate based on course topics
    for course in courses:
        topic = course.get('topic', 'general').lower()
        for skill, keywords in skill_keywords.items():
            if any(keyword in topic for keyword in keywords):
                skills[skill] += 15
    
    # Calculate based on coding submissions
    for submission in submissions:
        language = submission.get('language', '').lower()
        problem_type = submission.get('problem_type', '').lower()
        
        if language in ['javascript', 'typescript']:
            skills['Frontend'] += 8
        elif language in ['python', 'java', 'node']:
            skills['Backend'] += 8
        elif language in ['solidity']:
            skills['Blockchain'] += 10
        elif language in ['python'] and 'ml' in problem_type:
            skills['AI/ML'] += 10
    
    # Calculate based on quiz topics
    for quiz in quizzes:
        topic = quiz.get('topic', 'general').lower()
        score = quiz.get('score', 0)
        for skill, keywords in skill_keywords.items():
            if any(keyword in topic for keyword in keywords):
                skills[skill] += int(score * 0.1)  # Weighted by quiz score
    
    # Normalize to 0-100 scale
    max_skill = max(skills.values()) if skills.values() else 1
    for skill in skills:
        raw_score = skills[skill]
        normalized_score = min(100, int((raw_score / max_skill) * 100)) if max_skill > 0 else 0
        # Add some base progression for any activity
        skills[skill] = max(normalized_score, min(25, raw_score))
    
    return skills

def calculate_total_time_spent(courses, quizzes, submissions):
    """Calculate total time spent learning with enhanced estimation"""
    course_time = len(courses) * 2.5  # 2.5 hours per course
    quiz_time = len(quizzes) * 0.75   # 45 minutes per quiz
    coding_time = len(submissions) * 1.5  # 1.5 hours per coding session
    
    return int(course_time + quiz_time + coding_time)

def calculate_average_session_time(db, user_id):
    """Calculate average session time with enhanced tracking"""
    try:
        # If session tracking exists
        sessions = list(db.user_sessions.find({"user_id": user_id}))
        if sessions:
            total_time = sum([s.get('duration_minutes', 45) for s in sessions])
            return int(total_time / len(sessions))
        
        # Fallback: estimate based on activity frequency
        total_activities = (
            db.user_courses.count_documents({"user_id": user_id}) +
            db.user_quizzes.count_documents({"user_id": user_id}) +
            db.user_submissions.count_documents({"user_id": user_id})
        )
        
        if total_activities > 50:
            return 65  # Heavy user
        elif total_activities > 20:
            return 45  # Regular user
        else:
            return 30  # Light user
            
    except Exception as e:
        return 40

def calculate_completion_rate(courses, quizzes):
    """Calculate overall completion rate with enhanced logic"""
    total_started = len(courses) + len(quizzes)
    if total_started == 0:
        return 0
    
    completed_courses = len([c for c in courses if c.get('completed', False)])
    # Quizzes are considered completed if taken (existence implies completion)
    completed_quizzes = len(quizzes)
    
    completed_total = completed_courses + completed_quizzes
    return (completed_total / total_started * 100) if total_started > 0 else 0

def calculate_favorite_topics(courses, quizzes):
    """Calculate user's favorite learning topics with enhanced analysis"""
    topics = {}
    
    # Weight by completion and performance
    for course in courses:
        topic = course.get('topic', 'General')
        weight = 2 if course.get('completed', False) else 1
        topics[topic] = topics.get(topic, 0) + weight
    
    for quiz in quizzes:
        topic = quiz.get('topic', 'General')
        score = quiz.get('score', 0)
        weight = max(1, int(score / 25))  # Higher weight for better scores
        topics[topic] = topics.get(topic, 0) + weight
    
    # Return top 5 topics
    sorted_topics = sorted(topics.items(), key=lambda x: x[1], reverse=True)
    return [topic for topic, count in sorted_topics[:5]]

def update_user_streak(db, user_id):
    """Update and return current user streak with enhanced logic"""
    try:
        current_date = datetime.now().date()
        
        # Check if user has activity today
        today_start = datetime.combine(current_date, datetime.min.time())
        today_end = datetime.combine(current_date + timedelta(days=1), datetime.min.time())
        
        today_activity = (
            db.user_courses.count_documents({
                "user_id": user_id,
                "completed_at": {"$gte": today_start, "$lt": today_end}
            }) +
            db.user_quizzes.count_documents({
                "user_id": user_id,
                "completed_at": {"$gte": today_start, "$lt": today_end}
            }) +
            db.user_submissions.count_documents({
                "user_id": user_id,
                "submitted_at": {"$gte": today_start, "$lt": today_end}
            })
        )
        
        current_streak = calculate_coding_streak(db, user_id)
        
        if today_activity > 0:
            new_streak = current_streak + 1 if current_streak > 0 else 1
            
            # Update user stats
            db.user_stats.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "current_streak": new_streak,
                        "last_activity_date": current_date,
                        "updated_at": datetime.now()
                    },
                    "$max": {"longest_streak": new_streak}
                },
                upsert=True
            )
            
            logger.info(f"✅ Streak updated for user {user_id}: {new_streak} days")
            return new_streak
        else:
            return current_streak
            
    except Exception as e:
        logger.error(f"Error updating user streak: {e}")
        return 0

def update_user_activity(db, user_id):
    """Update user's last activity timestamp"""
    try:
        db.user_stats.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "last_seen": datetime.now(),
                    "updated_at": datetime.now()
                }
            },
            upsert=True
        )
    except Exception as e:
        logger.error(f"Error updating user activity: {e}")

def format_activity_description(item, activity_type):
    """Format activity description based on type"""
    if activity_type == "course":
        return f"Completed course: {item.get('description', 'Course module completed')}"
    elif activity_type == "quiz":
        score = item.get('score', 0)
        return f"Quiz completed with {score}% accuracy"
    elif activity_type == "coding":
        language = item.get('language', 'Python')
        return f"Solved coding challenge in {language}"
    elif activity_type == "achievement":
        return item.get('description', 'New achievement unlocked!')
    elif activity_type == "certificate":
        return f"Earned certificate: {item.get('description', 'Professional certification')}"
    else:
        return "Activity completed"

# ===================================================================
# ✅ ENHANCED DYNAMIC SCORING SYSTEM
# ===================================================================

def calculate_dynamic_score(code, language, problem):
    """Enhanced dynamic scoring with better error handling and feedback"""
    
    # Handle both old and new problem formats
    test_cases = problem.get('test_cases', [])
    total_points = problem.get('total_points', 100)
    
    # ✅ FIXED: Handle empty test cases properly
    if not test_cases:
        test_cases = [{
            "input": "",
            "expected_output": "",
            "description": "Basic execution test",
            "points": total_points
        }]
    
    start_time = time.time()
    passed_tests = 0
    total_tests = len(test_cases)
    test_results = []
    points_earned = 0
    
    logger.info(f"🧮 Enhanced Dynamic scoring - {total_tests} test cases, {total_points} total points")
    
    try:
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get('input', '')
            expected_output = test_case.get('expected_output', '').strip()
            test_points = test_case.get('points', total_points // total_tests)
            
            logger.info(f"📋 Test {i+1}: Input='{test_input}', Expected='{expected_output}', Points={test_points}")
            
            try:
                stdout_buffer = io.StringIO()
                stderr_buffer = io.StringIO()
                
                # ✅ ENHANCED: Safer execution environment
                exec_globals = {
                    "__builtins__": {
                        'print': print,
                        'len': len,
                        'str': str,
                        'int': int,
                        'float': float,
                        'list': list,
                        'dict': dict,
                        'tuple': tuple,
                        'set': set,
                        'range': range,
                        'enumerate': enumerate,
                        'zip': zip,
                        'sum': sum,
                        'max': max,
                        'min': min,
                        'sorted': sorted,
                        'abs': abs,
                        'round': round,
                    },
                    "__name__": "__main__"
                }
                
                # Handle input simulation
                if test_input:
                    input_lines = test_input.split('\n') if '\n' in test_input else [test_input]
                    input_iter = iter(input_lines)
                    exec_globals['input'] = lambda prompt='': next(input_iter, '')
                else:
                    exec_globals['input'] = lambda prompt='': ''
                
                # ✅ ADDED: Timeout protection (Unix-like systems only)
                try:
                    def timeout_handler(signum, frame):
                        raise TimeoutError("Code execution timed out")
                    
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(5)  # 5 second timeout
                except:
                    # Skip timeout on Windows
                    pass
                
                try:
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(code, exec_globals)
                finally:
                    try:
                        signal.alarm(0)  # Cancel timeout
                    except:
                        pass
                
                actual_output = stdout_buffer.getvalue().strip()
                stderr_content = stderr_buffer.getvalue().strip()
                
                logger.info(f"🔍 Test {i+1} - Actual: '{actual_output}', Expected: '{expected_output}'")
                
                # ✅ ENHANCED: Better output comparison
                is_correct = False
                if expected_output == "":
                    # For basic execution tests, just check if code runs without error
                    is_correct = stderr_content == ""
                else:
                    # Multiple comparison strategies
                    comparisons = [
                        actual_output == expected_output,
                        actual_output.replace(' ', '') == expected_output.replace(' ', ''),
                        actual_output.lower().strip() == expected_output.lower().strip(),
                        # ✅ ADDED: Flexible numeric comparison
                        _compare_numeric_output(actual_output, expected_output)
                    ]
                    is_correct = any(comparisons)
                
                if is_correct:
                    passed_tests += 1
                    points_earned += test_points
                    test_results.append({
                        "test_number": i + 1,
                        "passed": True,
                        "input": test_input,
                        "expected_output": expected_output,
                        "actual_output": actual_output,
                        "points_earned": test_points,
                        "description": test_case.get('description', f'Test case {i+1}'),
                        "execution_time": round(time.time() - start_time, 3)
                    })
                    logger.info(f"✅ Test {i+1} PASSED - {test_points} points earned")
                else:
                    test_results.append({
                        "test_number": i + 1,
                        "passed": False,
                        "input": test_input,
                        "expected_output": expected_output,
                        "actual_output": actual_output,
                        "points_earned": 0,
                        "error": f"Output mismatch. Got '{actual_output}', expected '{expected_output}'",
                        "description": test_case.get('description', f'Test case {i+1}'),
                        "stderr": stderr_content if stderr_content else None
                    })
                    logger.info(f"❌ Test {i+1} FAILED - Expected '{expected_output}', got '{actual_output}'")
            
            except TimeoutError:
                logger.warning(f"⏰ Test {i+1} TIMEOUT")
                test_results.append({
                    "test_number": i + 1,
                    "passed": False,
                    "input": test_input,
                    "expected_output": expected_output,
                    "actual_output": "Execution timed out",
                    "points_earned": 0,
                    "error": "Code execution exceeded time limit (5 seconds)",
                    "description": test_case.get('description', f'Test case {i+1}'),
                    "error_type": "TimeoutError"
                })
            except Exception as e:
                logger.error(f"❌ Test {i+1} EXCEPTION - {str(e)}")
                test_results.append({
                    "test_number": i + 1,
                    "passed": False,
                    "input": test_input,
                    "expected_output": expected_output,
                    "actual_output": f"Runtime Error: {str(e)}",
                    "points_earned": 0,
                    "error": str(e),
                    "description": test_case.get('description', f'Test case {i+1}'),
                    "error_type": type(e).__name__
                })
    
    except Exception as e:
        logger.error(f"❌ Scoring system error: {str(e)}")
        test_results = [{
            "test_number": 1,
            "passed": False,
            "input": "",
            "expected_output": "Code should execute without errors",
            "actual_output": f"Scoring error: {str(e)}",
            "points_earned": 0,
            "error": str(e),
            "description": "Scoring system error",
            "error_type": type(e).__name__
        }]
        total_tests = 1
    
    execution_time = time.time() - start_time
    final_score = int((points_earned / total_points) * 100) if total_points > 0 else 0
    
    logger.info(f"🏆 FINAL SCORE: {final_score}% ({points_earned}/{total_points} points, {passed_tests}/{total_tests} tests)")
    
    return {
        'score': final_score,
        'passed_tests': passed_tests,
        'total_tests': total_tests,
        'test_results': test_results,
        'execution_time': round(execution_time, 3),
        'details': {
            'points_earned': points_earned,
            'total_points': total_points,
            'scoring_method': 'enhanced_dynamic_v3',
            'language': language,
            'security_mode': 'restricted'
        }
    }

def _compare_numeric_output(actual, expected):
    """Helper function to compare numeric outputs with tolerance"""
    try:
        actual_num = float(actual)
        expected_num = float(expected)
        return abs(actual_num - expected_num) < 1e-6
    except (ValueError, TypeError):
        return False

# ===================================================================
# ✅ AI QUIZ ENDPOINTS (ENHANCED)
# ===================================================================

@app.route('/api/quizzes/generate-ai', methods=['POST', 'OPTIONS'])
def generate_ai_quiz_direct():
    """Generate AI-powered quiz using the integrated AI service"""
    if request.method == "OPTIONS":
        response = jsonify({'status': 'ok'})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST,OPTIONS")
        return response
    
    if not services_status['ai_quiz']:
        return jsonify({
            "success": False,
            "error": "AI Quiz service is not available. Please check if the AI models are properly installed."
        }), 503
    
    try:
        data = request.get_json()
        topic = data.get('topic', 'General')
        difficulty = data.get('difficulty', 'medium')
        num_questions = int(data.get('num_questions', 5))
        
        logger.info(f"🤖 Generating AI quiz: Topic={topic}, Difficulty={difficulty}, Questions={num_questions}")
        
        # Generate quiz using AI service
        ai_quiz = ai_service.generate_quiz(
            topic=topic,
            difficulty=difficulty,
            num_questions=num_questions
        )
        
        if not ai_quiz:
            return jsonify({
                "success": False,
                "error": "Failed to generate AI quiz. Please try again."
            }), 500
        
        # Save to database
        db = get_db()
        if db:
            result = db.quizzes.insert_one(ai_quiz)
            ai_quiz['_id'] = str(result.inserted_id)
        
        logger.info(f"✅ AI quiz created: {ai_quiz['title']} with {len(ai_quiz['questions'])} questions")
        
        return jsonify({
            "success": True,
            "message": f"AI quiz generated successfully with {len(ai_quiz['questions'])} questions",
            "quiz": ai_quiz
        })
        
    except Exception as e:
        logger.error(f"❌ AI quiz generation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===================================================================
# ✅ ENHANCED HEALTH AND DEBUG ENDPOINTS
# ===================================================================

@app.route('/')
def health_root():
    return jsonify({
        "status": "OpenLearnX Professional Dashboard API",
        "version": "3.0.0 - PRODUCTION READY WITH COMPREHENSIVE ANALYTICS",
        "timestamp": datetime.now().isoformat(),
        "environment": {
            "flask_env": os.getenv('FLASK_ENV', 'development'),
            "mongodb_uri": app.config['MONGODB_URI'].replace(app.config['MONGODB_URI'].split('@')[0].split('//')[1] if '@' in app.config['MONGODB_URI'] else '', '***'),
            "web3_provider": app.config['WEB3_PROVIDER_URL'],
            "contract_address": app.config['CONTRACT_ADDRESS'],
            "jwt_expiration": f"{os.getenv('JWT_EXPIRATION_HOURS', 168)} hours",
            "dashboard_cache": f"{app.config['DASHBOARD_CACHE_TIMEOUT']} seconds"
        },
        "features": {
            "mongodb": service_status.get('mongodb', False),
            "web3": service_status.get('web3', False),
            "wallet": services_status['wallet'],
            "compiler": services_status['compiler'],
            "ai_quiz_service": services_status['ai_quiz'],
            "comprehensive_dashboard": DASHBOARD_AVAILABLE,
            "real_time_analytics": True,
            "blockchain_integration": True,
            "professional_ui": True,
            "jwt_authentication": True,
            "timeout_protection": True,
            "enhanced_security": True
        },
        "endpoints": {
            "comprehensive_stats": "/api/dashboard/comprehensive-stats",
            "recent_activity": "/api/dashboard/recent-activity",
            "global_leaderboard": "/api/dashboard/global-leaderboard",
            "update_streak": "/api/dashboard/update-streak",
            "exam_submit": "/api/exam/submit-solution",
            "ai_quiz": "/api/quizzes/generate-ai" if services_status['ai_quiz'] else "unavailable",
            "health": "/api/health"
        }
    })

@app.route('/api/health')
def api_health():
    db = get_db()
    db_status = "connected" if db else "disconnected"
    
    if db:
        try:
            db.command('ismaster')
            collections_count = {
                "users": db.users.count_documents({}),
                "user_stats": db.user_stats.count_documents({}),
                "user_courses": db.user_courses.count_documents({}),
                "user_quizzes": db.user_quizzes.count_documents({}),
                "user_submissions": db.user_submissions.count_documents({}),
                "user_achievements": db.user_achievements.count_documents({}),
                "user_profiles": db.user_profiles.count_documents({}) if DASHBOARD_AVAILABLE else 0
            }
        except Exception as e:
            db_status = f"error: {str(e)}"
            collections_count = {}
    else:
        collections_count = {}
    
    status = "healthy" if service_status.get('mongodb') else "degraded"
    
    return jsonify({
        "status": status,
        "services": {
            "mongodb": db_status,
            "web3": service_status.get('web3', False),
            "wallet": services_status['wallet'],
            "compiler": services_status['compiler'],
            "ai_quiz_service": services_status['ai_quiz'],
            "comprehensive_dashboard": DASHBOARD_AVAILABLE,
            "jwt_authentication": True,
            "enhanced_scoring": True,
            "timeout_protection": True
        },
        "collections": collections_count,
        "blueprints_registered": blueprints_registered,
        "blueprints_failed": blueprints_failed,
        "environment": {
            "port": app.config['PORT'],
            "host": app.config['HOST'],
            "dashboard_cache_timeout": app.config['DASHBOARD_CACHE_TIMEOUT'],
            "max_activity_records": app.config['MAX_ACTIVITY_RECORDS']
        },
        "version": "3.0.0-production"
    }), 200 if status == "healthy" else 503

# ===================================================================
# ✅ REQUEST HANDLERS (ENHANCED)
# ===================================================================

# Request logging with comprehensive tracking
@app.before_request
def log_request():
    path = request.path
    if path.startswith('/api/exam'):
        logger.info(f"📥 Exam request: {request.method} {path}")
    elif path.startswith('/api/dashboard'):
        logger.info(f"📊 Dashboard request: {request.method} {path}")
    elif path.startswith('/api/quizzes'):
        logger.info(f"🧠 Quiz request: {request.method} {path}")

# Enhanced CORS preflight handling
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        resp = jsonify({'status':'ok'})
        resp.headers.update({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,Origin,X-Requested-With,X-User-ID,X-Session-Token,X-Firebase-Token",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS,PATCH",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400"  # Cache preflight for 24 hours
        })
        return resp

# Enhanced error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Endpoint not found",
        "path": request.path,
        "method": request.method,
        "available_endpoints": [
            "/api/dashboard/comprehensive-stats",
            "/api/dashboard/recent-activity",
            "/api/dashboard/global-leaderboard",
            "/api/dashboard/update-streak",
            "/api/exam/submit-solution",
            "/api/quizzes/generate-ai",
            "/api/health"
        ],
        "suggestion": "Check the API documentation for valid endpoints"
    }), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"500 Error: {e}")
    return jsonify({
        "error": "Internal Server Error",
        "timestamp": datetime.now().isoformat(),
        "suggestion": "Check server logs for detailed error information",
        "support": "Contact support if this persists"
    }), 500

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({
        "error": "Rate limit exceeded",
        "message": "Too many requests. Please slow down.",
        "retry_after": 60
    }), 429

# ===================================================================
# ✅ APPLICATION STARTUP (ENHANCED)
# ===================================================================

if __name__ == "__main__":
    print("🚀 Starting OpenLearnX Professional Dashboard Backend v3.0.0")
    print("📊 Features: Comprehensive Analytics, Real-time Data, Professional Dashboard")
    print(f"🔗 MongoDB URI: {app.config['MONGODB_URI']}")
    print(f"🌐 Web3 Provider: {app.config['WEB3_PROVIDER_URL']}")
    print(f"📄 Contract Address: {app.config['CONTRACT_ADDRESS']}")
    print(f"🔐 JWT Expiration: {os.getenv('JWT_EXPIRATION_HOURS', 168)} hours")
    print(f"📊 Dashboard Cache: {app.config['DASHBOARD_CACHE_TIMEOUT']} seconds")
    
    print(f"\n📋 Service Status:")
    print(f"   - MongoDB: {'✅ Connected' if service_status.get('mongodb') else '❌ Failed'}")
    print(f"   - Web3/Anvil: {'✅ Connected' if service_status.get('web3') else '❌ Failed'}")
    print(f"   - Comprehensive Dashboard: {'✅ Available' if DASHBOARD_AVAILABLE else '❌ Unavailable'}")
    print(f"   - AI Quiz Service: {'✅ Available' if services_status['ai_quiz'] else '❌ Unavailable'}")
    print(f"   - JWT Authentication: ✅ Configured")
    print(f"   - Enhanced Security: ✅ Timeout Protection")
    print(f"   - Blueprints: {len(blueprints_registered)} registered")
    
    if blueprints_failed:
        print(f"   - Failed blueprints: {len(blueprints_failed)}")
        for prefix, error in blueprints_failed:
            print(f"     ❌ {prefix}: {error}")
    
    print(f"\n🎯 Professional Dashboard Endpoints:")
    print(f"   - GET  /api/dashboard/comprehensive-stats")
    print(f"   - GET  /api/dashboard/recent-activity")
    print(f"   - GET  /api/dashboard/global-leaderboard")
    print(f"   - POST /api/dashboard/update-streak")
    print(f"   - GET  /api/health")
    
    try:
        app.run(
            host=app.config['HOST'],
            port=app.config['PORT'],
            debug=os.getenv('FLASK_ENV') == 'development',
            threaded=True,
            use_reloader=False  # ✅ Prevent double initialization in debug mode
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        import traceback
        traceback.print_exc()
